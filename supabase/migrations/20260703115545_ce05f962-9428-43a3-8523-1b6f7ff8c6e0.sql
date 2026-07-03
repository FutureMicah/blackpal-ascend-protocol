
CREATE TABLE IF NOT EXISTS public.class_analytics_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 1 AND 3650),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.class_analytics_settings TO authenticated;
GRANT ALL ON public.class_analytics_settings TO service_role;
ALTER TABLE public.class_analytics_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read settings" ON public.class_analytics_settings;
CREATE POLICY "Admins read settings" ON public.class_analytics_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins write settings" ON public.class_analytics_settings;
CREATE POLICY "Admins write settings" ON public.class_analytics_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.class_analytics_settings (id, retention_days)
VALUES (true, 90) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_class_analytics_retention()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT retention_days FROM public.class_analytics_settings WHERE id = true;
$$;

CREATE OR REPLACE FUNCTION public.set_class_analytics_retention(_days integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _days < 1 OR _days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 1 and 3650';
  END IF;
  UPDATE public.class_analytics_settings
    SET retention_days = _days, updated_at = now(), updated_by = auth.uid()
    WHERE id = true;
  RETURN _days;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_class_analytics()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _days integer;
  _deleted integer;
BEGIN
  SELECT retention_days INTO _days FROM public.class_analytics_settings WHERE id = true;
  IF _days IS NULL THEN _days := 90; END IF;
  DELETE FROM public.class_analytics_events
    WHERE created_at < now() - (_days || ' days')::interval;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END $$;

CREATE OR REPLACE FUNCTION public.purge_class_analytics(_days integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _deleted integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _days < 1 THEN RAISE EXCEPTION 'days must be >= 1'; END IF;
  DELETE FROM public.class_analytics_events
    WHERE created_at < now() - (_days || ' days')::interval;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END $$;

REVOKE ALL ON FUNCTION public.set_class_analytics_retention(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_class_analytics(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_class_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_analytics_retention() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_class_analytics_retention(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_class_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_class_analytics() TO service_role;

-- Schedule daily cleanup (03:15 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup_class_analytics_daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_class_analytics_daily');
    PERFORM cron.schedule('cleanup_class_analytics_daily', '15 3 * * *',
      $cron$SELECT public.cleanup_class_analytics();$cron$);
  END IF;
END $$;
