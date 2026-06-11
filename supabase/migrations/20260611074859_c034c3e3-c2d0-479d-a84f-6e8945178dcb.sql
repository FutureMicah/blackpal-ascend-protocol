
ALTER TABLE public.user_locations
  ADD COLUMN IF NOT EXISTS share_precision text NOT NULL DEFAULT 'country'
    CHECK (share_precision IN ('country','precise','ghost')),
  ADD COLUMN IF NOT EXISTS is_trading boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_trade_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS display_name text;

CREATE INDEX IF NOT EXISTS idx_user_locations_online ON public.user_locations(is_online, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_country ON public.user_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_user_locations_trading ON public.user_locations(is_trading) WHERE is_trading = true;

DROP POLICY IF EXISTS "Admins view all locations" ON public.user_locations;
CREATE POLICY "Admins view all locations" ON public.user_locations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.atlas_public_users(
  p_only_online boolean DEFAULT false,
  p_only_trading boolean DEFAULT false,
  p_limit int DEFAULT 500
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_online boolean,
  is_trading boolean,
  last_seen_at timestamptz,
  precision_level text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ul.user_id,
    COALESCE(ul.display_name, p.display_name, 'Trader') AS display_name,
    COALESCE(ul.avatar_url, p.avatar_url) AS avatar_url,
    ul.country,
    ul.country_code,
    CASE WHEN ul.user_id = auth.uid() AND ul.share_precision='precise' THEN ul.latitude
         WHEN ul.latitude IS NULL THEN NULL
         ELSE ul.latitude + ((random()-0.5) * 1.5)
    END,
    CASE WHEN ul.user_id = auth.uid() AND ul.share_precision='precise' THEN ul.longitude
         WHEN ul.longitude IS NULL THEN NULL
         ELSE ul.longitude + ((random()-0.5) * 1.5)
    END,
    ul.is_online,
    ul.is_trading,
    ul.last_seen_at,
    CASE WHEN ul.user_id = auth.uid() THEN ul.share_precision ELSE 'country' END
  FROM public.user_locations ul
  LEFT JOIN public.profiles p ON p.id = ul.user_id
  WHERE ul.share_precision <> 'ghost'
    AND ul.latitude IS NOT NULL
    AND (NOT p_only_online OR (ul.is_online AND ul.last_seen_at > now() - interval '5 minutes'))
    AND (NOT p_only_trading OR ul.is_trading)
  ORDER BY ul.is_trading DESC, ul.last_seen_at DESC
  LIMIT LEAST(p_limit, 2000);
$$;
GRANT EXECUTE ON FUNCTION public.atlas_public_users(boolean,boolean,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.atlas_admin_users(
  p_filter text DEFAULT 'all',
  p_search text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_limit int DEFAULT 500,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  avatar_url text,
  country text,
  country_code text,
  city text,
  region text,
  latitude double precision,
  longitude double precision,
  is_online boolean,
  is_trading boolean,
  last_seen_at timestamptz,
  last_trade_at timestamptz,
  share_precision text,
  accuracy_source text,
  created_at timestamptz,
  total_payments numeric,
  open_positions int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    ul.user_id,
    COALESCE(p.display_name, ul.display_name, 'Trader'),
    p.email,
    COALESCE(p.avatar_url, ul.avatar_url),
    ul.country, ul.country_code, ul.city, ul.region,
    ul.latitude, ul.longitude,
    ul.is_online, ul.is_trading,
    ul.last_seen_at, ul.last_trade_at,
    ul.share_precision, ul.accuracy_source,
    p.created_at,
    COALESCE((SELECT SUM(amount)::numeric FROM public.payments WHERE user_id=ul.user_id AND status='success'),0),
    COALESCE((SELECT count(*)::int FROM public.prop_trades WHERE user_id=ul.user_id AND status='open'),0)
  FROM public.user_locations ul
  LEFT JOIN public.profiles p ON p.id = ul.user_id
  WHERE (p_search IS NULL OR p.display_name ILIKE '%'||p_search||'%' OR p.email ILIKE '%'||p_search||'%')
    AND (p_country IS NULL OR ul.country_code = p_country)
    AND (
      p_filter = 'all'
      OR (p_filter='online'    AND ul.is_online AND ul.last_seen_at > now() - interval '5 minutes')
      OR (p_filter='trading'   AND ul.last_trade_at > now() - interval '24 hours')
      OR (p_filter='in_trade'  AND ul.is_trading)
      OR (p_filter='ghost'     AND ul.share_precision='ghost')
    )
  ORDER BY ul.is_online DESC, ul.last_seen_at DESC NULLS LAST
  LIMIT LEAST(p_limit,2000) OFFSET p_offset;
END $$;
GRANT EXECUTE ON FUNCTION public.atlas_admin_users(text,text,text,int,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.atlas_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_users',     (SELECT count(*) FROM public.profiles),
    'online_5m',       (SELECT count(*) FROM public.user_locations WHERE is_online AND last_seen_at > now() - interval '5 minutes'),
    'trading_today',   (SELECT count(*) FROM public.user_locations WHERE last_trade_at > now() - interval '24 hours'),
    'in_trade_now',    (SELECT count(*) FROM public.user_locations WHERE is_trading),
    'new_today',       (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '24 hours'),
    'countries',       (SELECT count(DISTINCT country_code) FROM public.user_locations WHERE country_code IS NOT NULL)
  );
$$;
GRANT EXECUTE ON FUNCTION public.atlas_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.atlas_country_breakdown()
RETURNS TABLE (
  country text,
  country_code text,
  total_users bigint,
  online_now bigint,
  trading_now bigint,
  revenue numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    ul.country, ul.country_code,
    count(*)::bigint,
    count(*) FILTER (WHERE ul.is_online AND ul.last_seen_at > now() - interval '5 minutes')::bigint,
    count(*) FILTER (WHERE ul.is_trading)::bigint,
    COALESCE((SELECT SUM(p.amount) FROM public.payments p
              JOIN public.user_locations u ON u.user_id = p.user_id
              WHERE u.country_code = ul.country_code AND p.status='success'),0)::numeric
  FROM public.user_locations ul
  WHERE ul.country_code IS NOT NULL
  GROUP BY ul.country, ul.country_code
  ORDER BY count(*) DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.atlas_country_breakdown() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_my_location_privacy(p_precision text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_precision NOT IN ('country','precise','ghost') THEN RAISE EXCEPTION 'Invalid precision'; END IF;
  UPDATE public.user_locations SET share_precision=p_precision, updated_at=now() WHERE user_id=auth.uid();
  IF NOT FOUND THEN INSERT INTO public.user_locations(user_id, share_precision) VALUES (auth.uid(), p_precision); END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.set_my_location_privacy(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_user_trading_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid; v_open int;
BEGIN
  v_uid := COALESCE(NEW.user_id, OLD.user_id);
  IF v_uid IS NULL THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_open FROM public.prop_trades WHERE user_id=v_uid AND status='open';
  UPDATE public.user_locations
    SET is_trading=(v_open>0), last_trade_at=now(), updated_at=now()
    WHERE user_id=v_uid;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prop_trades_sync_status ON public.prop_trades;
CREATE TRIGGER trg_prop_trades_sync_status
  AFTER INSERT OR UPDATE OF status ON public.prop_trades
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_trading_status();

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
