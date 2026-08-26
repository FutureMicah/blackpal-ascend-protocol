-- 1. Runs table
CREATE TABLE public.contest_recompute_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  entries_total integer NOT NULL DEFAULT 0,
  entries_changed integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contest_recompute_runs TO authenticated;
GRANT ALL ON public.contest_recompute_runs TO service_role;
ALTER TABLE public.contest_recompute_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view recompute runs"
  ON public.contest_recompute_runs FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_crr_contest_started ON public.contest_recompute_runs (contest_id, started_at DESC);

-- 2. Per-entry audit log
CREATE TABLE public.contest_recompute_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.contest_recompute_runs(id) ON DELETE SET NULL,
  contest_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  change_kind text NOT NULL DEFAULT 'score',
  old_score numeric,
  new_score numeric,
  old_status text,
  new_status text,
  old_rank integer,
  new_rank integer,
  old_profit_pct numeric,
  new_profit_pct numeric,
  old_drawdown_pct numeric,
  new_drawdown_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contest_recompute_log TO authenticated;
GRANT ALL ON public.contest_recompute_log TO service_role;
ALTER TABLE public.contest_recompute_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recompute log rows"
  ON public.contest_recompute_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all recompute log rows"
  ON public.contest_recompute_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_crl_contest_created ON public.contest_recompute_log (contest_id, created_at DESC);
CREATE INDEX idx_crl_user_created ON public.contest_recompute_log (user_id, created_at DESC);
CREATE INDEX idx_crl_run ON public.contest_recompute_log (run_id);

-- 3. Realtime for the live status indicator
ALTER TABLE public.contest_recompute_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_recompute_runs;

-- 4. Scoring engine writes the audit trail
CREATE OR REPLACE FUNCTION public.recompute_contest_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
  v_run uuid;
  v_source text;
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

  IF COALESCE(e.score, -1) IS DISTINCT FROM v_score
     OR COALESCE(e.status, '') IS DISTINCT FROM v_status
     OR COALESCE(e.profit_pct, -1) IS DISTINCT FROM round(v_profit_pct, 2)
     OR COALESCE(e.drawdown_pct, -1) IS DISTINCT FROM round(v_dd_pct, 2)
  THEN
    v_run := NULLIF(current_setting('app.contest_recompute_run', true), '')::uuid;
    v_source := COALESCE(NULLIF(current_setting('app.contest_recompute_source', true), ''), 'trigger');

    INSERT INTO public.contest_recompute_log (
      run_id, contest_id, entry_id, user_id, source, change_kind,
      old_score, new_score, old_status, new_status,
      old_profit_pct, new_profit_pct, old_drawdown_pct, new_drawdown_pct
    ) VALUES (
      v_run, e.contest_id, e.id, e.user_id, v_source, 'score',
      e.score, v_score, e.status, v_status,
      e.profit_pct, round(v_profit_pct, 2), e.drawdown_pct, round(v_dd_pct, 2)
    );
  END IF;
END
$fn$;

-- 5. Rank changes are audited too
CREATE OR REPLACE FUNCTION public.rerank_contest(p_contest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_run uuid;
  v_source text;
  r RECORD;
BEGIN
  v_run := NULLIF(current_setting('app.contest_recompute_run', true), '')::uuid;
  v_source := COALESCE(NULLIF(current_setting('app.contest_recompute_source', true), ''), 'trigger');

  FOR r IN
    WITH ranked AS (
      SELECT id, user_id, rank AS old_rank,
             row_number() OVER (
               ORDER BY score DESC, profit_pct DESC, drawdown_pct ASC, joined_at ASC
             ) AS rn
        FROM public.contest_entries
       WHERE contest_id = p_contest_id
    )
    UPDATE public.contest_entries ce
       SET rank = ranked.rn
      FROM ranked
     WHERE ce.id = ranked.id
       AND COALESCE(ce.rank, -1) IS DISTINCT FROM ranked.rn
    RETURNING ce.id, ce.user_id, ranked.old_rank, ranked.rn
  LOOP
    INSERT INTO public.contest_recompute_log (
      run_id, contest_id, entry_id, user_id, source, change_kind, old_rank, new_rank
    ) VALUES (
      v_run, p_contest_id, r.id, r.user_id, v_source, 'rank', r.old_rank, r.rn
    );
  END LOOP;
END
$fn$;

-- 6. Run lifecycle
CREATE OR REPLACE FUNCTION public.recompute_contest(p_contest_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_id uuid;
  v_run uuid;
  v_total int := 0;
  v_source text;
  v_start timestamptz := clock_timestamp();
BEGIN
  v_source := COALESCE(NULLIF(current_setting('app.contest_recompute_source', true), ''), 'scheduled');

  INSERT INTO public.contest_recompute_runs (contest_id, source, status)
  VALUES (p_contest_id, v_source, 'running')
  RETURNING id INTO v_run;

  PERFORM set_config('app.contest_recompute_run', v_run::text, true);

  FOR v_id IN SELECT id FROM public.contest_entries WHERE contest_id = p_contest_id LOOP
    PERFORM public.recompute_contest_entry(v_id);
    v_total := v_total + 1;
  END LOOP;

  PERFORM public.rerank_contest(p_contest_id);

  UPDATE public.contest_recompute_runs
     SET status = 'completed',
         entries_total = v_total,
         entries_changed = (SELECT count(*) FROM public.contest_recompute_log WHERE run_id = v_run),
         finished_at = now(),
         duration_ms = GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000)::int)
   WHERE id = v_run;

  PERFORM set_config('app.contest_recompute_run', '', true);
END
$fn$;

CREATE OR REPLACE FUNCTION public.recompute_active_contests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_c uuid; v_n int := 0;
BEGIN
  PERFORM set_config('app.contest_recompute_source', 'scheduled', true);
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
END
$fn$;

REVOKE ALL ON FUNCTION public.recompute_contest_entry(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_contest(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rerank_contest(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_active_contests() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_contest_entry(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_contest(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.rerank_contest(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_active_contests() TO service_role;