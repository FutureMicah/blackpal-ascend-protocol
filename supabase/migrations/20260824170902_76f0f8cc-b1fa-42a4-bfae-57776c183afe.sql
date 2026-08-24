
-- Lock down client writes to score-bearing columns: revoke direct UPDATE on contest_entries
REVOKE UPDATE ON public.contest_entries FROM authenticated;
GRANT UPDATE (contest_id, user_id) ON public.contest_entries TO authenticated;
GRANT ALL ON public.contest_entries TO service_role;

CREATE OR REPLACE FUNCTION public.contest_baseline_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(GREATEST(starting_balance, 0), 0)
       FROM public.user_prop_accounts
      WHERE user_id = p_user_id
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1),
    10000
  );
$$;

CREATE OR REPLACE FUNCTION public.recompute_contest_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  e public.contest_entries%ROWTYPE;
  c public.contests%ROWTYPE;
  v_base numeric;
  v_pnl numeric := 0;
  v_trades int := 0;
  v_days int := 0;
  v_peak numeric := 0;
  v_cum numeric := 0;
  v_maxdd numeric := 0;
  r RECORD;
  v_profit_pct numeric := 0;
  v_dd_pct numeric := 0;
  v_score numeric := 0;
  v_status text;
  v_ended boolean;
  f_profit numeric; f_dd numeric; f_trades numeric; f_days numeric;
BEGIN
  SELECT * INTO e FROM public.contest_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO c FROM public.contests WHERE id = e.contest_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_base := public.contest_baseline_balance(e.user_id);

  FOR r IN
    SELECT closed_at,
           COALESCE(profit_loss,0)+COALESCE(commission,0)+COALESCE(swap,0) AS pnl
      FROM public.prop_trades
     WHERE user_id = e.user_id
       AND status = 'closed'
       AND closed_at IS NOT NULL
       AND closed_at >= GREATEST(c.starts_at, e.joined_at)
       AND closed_at <= COALESCE(c.ends_at, now())
     ORDER BY closed_at
  LOOP
    v_trades := v_trades + 1;
    v_pnl := v_pnl + r.pnl;
    v_cum := v_cum + r.pnl;
    IF v_cum > v_peak THEN v_peak := v_cum; END IF;
    IF (v_peak - v_cum) > v_maxdd THEN v_maxdd := v_peak - v_cum; END IF;
  END LOOP;

  SELECT count(DISTINCT (closed_at AT TIME ZONE 'UTC')::date) INTO v_days
    FROM public.prop_trades
   WHERE user_id = e.user_id AND status = 'closed' AND closed_at IS NOT NULL
     AND closed_at >= GREATEST(c.starts_at, e.joined_at)
     AND closed_at <= COALESCE(c.ends_at, now());

  v_profit_pct := CASE WHEN v_base > 0 THEN (v_pnl / v_base) * 100 ELSE 0 END;
  v_dd_pct := CASE WHEN v_base > 0 THEN (v_maxdd / v_base) * 100 ELSE 0 END;

  -- Score mirrors src/lib/contest-scoring.ts (50/20/15/15)
  f_profit := LEAST(1, GREATEST(0, v_profit_pct / GREATEST(COALESCE(c.target_profit_pct,8), 0.0001)));
  f_dd := CASE WHEN COALESCE(c.max_drawdown_pct,0) <= 0 THEN 1
          ELSE LEAST(1, GREATEST(0, 1 - v_dd_pct / c.max_drawdown_pct)) END;
  f_trades := LEAST(1, GREATEST(0, v_trades::numeric / GREATEST(COALESCE(c.min_trades,1), 1)));
  f_days := LEAST(1, GREATEST(0, v_days::numeric / GREATEST(COALESCE(c.min_active_days,1), 1)));
  v_score := round((f_profit*0.5 + f_dd*0.2 + f_trades*0.15 + f_days*0.15) * 100, 1);

  v_ended := COALESCE(c.ends_at, now() + interval '1 day') <= now();

  IF v_dd_pct > COALESCE(c.max_drawdown_pct, 1e9) THEN
    v_status := 'failed';
  ELSIF v_profit_pct >= COALESCE(c.target_profit_pct,8)
    AND v_dd_pct <= COALESCE(c.max_drawdown_pct,1e9)
    AND v_trades >= COALESCE(c.min_trades,0)
    AND v_days >= COALESCE(c.min_active_days,0) THEN
    v_status := 'passed';
  ELSIF v_ended THEN
    v_status := 'failed';
  ELSE
    v_status := 'in_progress';
  END IF;

  UPDATE public.contest_entries
     SET profit_pct = round(v_profit_pct, 2),
         drawdown_pct = round(v_dd_pct, 2),
         trades_count = v_trades,
         active_days = v_days,
         score = v_score,
         status = v_status,
         updated_at = now()
   WHERE id = e.id;
END $$;

CREATE OR REPLACE FUNCTION public.rerank_contest(p_contest_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.contest_entries ce
     SET rank = r.rn
    FROM (
      SELECT id, row_number() OVER (
               ORDER BY score DESC, profit_pct DESC, drawdown_pct ASC, joined_at ASC
             ) AS rn
        FROM public.contest_entries
       WHERE contest_id = p_contest_id
    ) r
   WHERE ce.id = r.id AND COALESCE(ce.rank, -1) IS DISTINCT FROM r.rn;
$$;

CREATE OR REPLACE FUNCTION public.recompute_contest(p_contest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM public.contest_entries WHERE contest_id = p_contest_id LOOP
    PERFORM public.recompute_contest_entry(v_id);
  END LOOP;
  PERFORM public.rerank_contest(p_contest_id);
END $$;

CREATE OR REPLACE FUNCTION public.recompute_active_contests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_c uuid; v_n int := 0;
BEGIN
  FOR v_c IN
    SELECT id FROM public.contests
     WHERE is_active = true
       AND COALESCE(starts_at, now()) <= now()
       AND COALESCE(ends_at, now() + interval '1 day') >= now() - interval '1 day'
  LOOP
    PERFORM public.recompute_contest(v_c);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

-- Recompute a user's live contest entries whenever a trade closes
CREATE OR REPLACE FUNCTION public.tg_recompute_contests_on_trade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_entry RECORD;
BEGIN
  IF NEW.status = 'closed' AND (TG_OP = 'INSERT' OR COALESCE(OLD.status,'') <> 'closed') THEN
    FOR v_entry IN
      SELECT ce.id, ce.contest_id
        FROM public.contest_entries ce
        JOIN public.contests c ON c.id = ce.contest_id
       WHERE ce.user_id = NEW.user_id
         AND c.is_active = true
         AND COALESCE(c.starts_at, now()) <= now()
         AND COALESCE(c.ends_at, now() + interval '1 day') >= now()
    LOOP
      PERFORM public.recompute_contest_entry(v_entry.id);
      PERFORM public.rerank_contest(v_entry.contest_id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recompute_contests_on_trade ON public.prop_trades;
CREATE TRIGGER trg_recompute_contests_on_trade
AFTER INSERT OR UPDATE OF status ON public.prop_trades
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_contests_on_trade();

-- Score a fresh entry immediately on join
CREATE OR REPLACE FUNCTION public.tg_contest_entry_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recompute_contest_entry(NEW.id);
  PERFORM public.rerank_contest(NEW.contest_id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_contest_entry_seed ON public.contest_entries;
CREATE TRIGGER trg_contest_entry_seed
AFTER INSERT ON public.contest_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_contest_entry_seed();

-- Scheduled recompute every 10 minutes
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('recompute-contests') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'recompute-contests');
    PERFORM cron.schedule('recompute-contests', '*/10 * * * *',
      $cron$SELECT public.recompute_active_contests();$cron$);
  END IF;
END $do$;
