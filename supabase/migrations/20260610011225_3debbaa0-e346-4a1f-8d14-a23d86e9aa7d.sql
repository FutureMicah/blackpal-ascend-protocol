
-- 1) Extend user_prop_accounts with MT5/MetaApi fields
ALTER TABLE public.user_prop_accounts
  ADD COLUMN IF NOT EXISTS mt5_login text,
  ADD COLUMN IF NOT EXISTS mt5_server text,
  ADD COLUMN IF NOT EXISTS mt5_broker text,
  ADD COLUMN IF NOT EXISTS mt5_investor_password text, -- stored server-side only; never selected by users via RLS
  ADD COLUMN IF NOT EXISTS metaapi_account_id text,
  ADD COLUMN IF NOT EXISTS metaapi_region text DEFAULT 'new-york',
  ADD COLUMN IF NOT EXISTS mt5_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mt5_sync_status text NOT NULL DEFAULT 'disconnected', -- disconnected|connecting|connected|error
  ADD COLUMN IF NOT EXISTS mt5_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS mt5_last_error text,
  ADD COLUMN IF NOT EXISTS mt5_margin numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mt5_free_margin numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mt5_open_positions integer NOT NULL DEFAULT 0;

-- Restrict reading the investor password via the Data API by revoking column SELECT
REVOKE SELECT (mt5_investor_password) ON public.user_prop_accounts FROM authenticated;
REVOKE SELECT (mt5_investor_password) ON public.user_prop_accounts FROM anon;

-- Block users from setting credentials/state directly through PostgREST UPDATE — only RPCs/service role may set these
REVOKE UPDATE (
  mt5_investor_password, metaapi_account_id, mt5_sync_status,
  mt5_last_sync_at, mt5_last_error, mt5_margin, mt5_free_margin, mt5_open_positions,
  current_equity, account_balance, highest_balance, total_pnl, total_trades,
  trading_days, max_daily_loss_hit, max_drawdown_hit, profit_target_hit,
  status, phase, passed_at, failed_at
) ON public.user_prop_accounts FROM authenticated;

-- 2) Extend prop_trades with MT5 deal fields
ALTER TABLE public.prop_trades
  ADD COLUMN IF NOT EXISTS mt5_ticket bigint,
  ADD COLUMN IF NOT EXISTS commission numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS swap numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS magic_number bigint,
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'; -- manual|mt5|simulator

CREATE UNIQUE INDEX IF NOT EXISTS prop_trades_acct_ticket_uniq
  ON public.prop_trades (prop_account_id, mt5_ticket)
  WHERE mt5_ticket IS NOT NULL;

CREATE INDEX IF NOT EXISTS prop_trades_acct_opened_idx
  ON public.prop_trades (prop_account_id, opened_at DESC);

-- 3) RPC: user sets their MT5 credentials (writes encrypted-at-rest column; never returned)
CREATE OR REPLACE FUNCTION public.mt5_set_credentials(
  p_account_id uuid,
  p_login text,
  p_investor_password text,
  p_server text,
  p_broker text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO v_owner FROM public.user_prop_accounts WHERE id = p_account_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_login IS NULL OR length(p_login) < 1 THEN RAISE EXCEPTION 'Login required'; END IF;
  IF p_investor_password IS NULL OR length(p_investor_password) < 4 THEN RAISE EXCEPTION 'Investor password required'; END IF;
  IF p_server IS NULL OR length(p_server) < 1 THEN RAISE EXCEPTION 'Server required'; END IF;

  UPDATE public.user_prop_accounts
  SET mt5_login = p_login,
      mt5_investor_password = p_investor_password,
      mt5_server = p_server,
      mt5_broker = COALESCE(p_broker, mt5_broker),
      mt5_sync_status = 'connecting',
      mt5_last_error = NULL,
      updated_at = now()
  WHERE id = p_account_id;
END $$;

REVOKE ALL ON FUNCTION public.mt5_set_credentials(uuid,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.mt5_set_credentials(uuid,text,text,text,text) TO authenticated;

-- 4) Internal helper: list accounts that the sync job should poll (service role only path)
CREATE OR REPLACE FUNCTION public.mt5_accounts_to_sync()
RETURNS TABLE (
  id uuid, user_id uuid, metaapi_account_id text, metaapi_region text,
  mt5_login text, mt5_server text, mt5_investor_password text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, user_id, metaapi_account_id, metaapi_region, mt5_login, mt5_server, mt5_investor_password
  FROM public.user_prop_accounts
  WHERE mt5_sync_enabled = true
    AND status = 'active'
    AND metaapi_account_id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.mt5_accounts_to_sync() FROM public;
GRANT EXECUTE ON FUNCTION public.mt5_accounts_to_sync() TO service_role;

-- 5) Service-role only: apply a MetaApi snapshot atomically
-- p_snapshot JSON shape:
-- {
--   "balance": 10250.55, "equity": 10180.21, "margin": 120.5, "freeMargin": 9990.1,
--   "openPositions": 2,
--   "closedDeals": [
--     { "ticket": 123, "symbol":"EURUSD","type":"BUY","lots":0.10,"openPrice":1.08,"closePrice":1.082,
--       "profit": 20.0, "commission": -0.5, "swap": 0, "openedAt":"2026-06-10T08:00:00Z","closedAt":"2026-06-10T08:15:00Z",
--       "magic": 0, "comment": "" }
--   ]
-- }
CREATE OR REPLACE FUNCTION public.apply_mt5_snapshot(
  p_account_id uuid,
  p_snapshot jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acct public.user_prop_accounts%ROWTYPE;
  v_tier public.prop_tiers%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_balance numeric;
  v_equity numeric;
  v_margin numeric;
  v_free numeric;
  v_open int;
  v_deal jsonb;
  v_ticket bigint;
  v_drawdown_pct numeric;
  v_profit_pct numeric;
  v_pnl_delta numeric := 0;
  v_trades_delta int := 0;
  v_wins_delta int := 0;
  v_losses_delta int := 0;
  v_daily_start_balance numeric;
  v_daily_pnl numeric := 0;
  v_daily_pnl_pct numeric := 0;
  v_was_passed boolean;
  v_was_failed boolean;
  v_starting numeric;
  v_first_day_today boolean := false;
BEGIN
  -- Only service role / SECURITY DEFINER caller from edge function
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'apply_mt5_snapshot is restricted';
  END IF;

  SELECT * INTO v_acct FROM public.user_prop_accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  SELECT * INTO v_tier FROM public.prop_tiers WHERE id = v_acct.tier_id;

  v_balance := COALESCE((p_snapshot->>'balance')::numeric, v_acct.account_balance);
  v_equity  := COALESCE((p_snapshot->>'equity')::numeric, v_acct.current_equity);
  v_margin  := COALESCE((p_snapshot->>'margin')::numeric, 0);
  v_free    := COALESCE((p_snapshot->>'freeMargin')::numeric, 0);
  v_open    := COALESCE((p_snapshot->>'openPositions')::int, 0);

  v_starting := NULLIF(v_acct.starting_balance, 0);
  IF v_starting IS NULL THEN
    v_starting := COALESCE(NULLIF(v_tier.account_size,0), v_balance, 1);
    UPDATE public.user_prop_accounts SET starting_balance = v_starting WHERE id = v_acct.id;
    v_acct.starting_balance := v_starting;
  END IF;

  v_was_passed := v_acct.profit_target_hit OR v_acct.status = 'passed';
  v_was_failed := v_acct.max_drawdown_hit OR v_acct.max_daily_loss_hit OR v_acct.status = 'failed';

  -- Upsert closed deals into prop_trades; track P&L deltas
  IF p_snapshot ? 'closedDeals' THEN
    FOR v_deal IN SELECT * FROM jsonb_array_elements(p_snapshot->'closedDeals') LOOP
      v_ticket := NULLIF(v_deal->>'ticket','')::bigint;
      IF v_ticket IS NULL THEN CONTINUE; END IF;

      -- Skip if already recorded
      IF EXISTS (SELECT 1 FROM public.prop_trades
                 WHERE prop_account_id = v_acct.id AND mt5_ticket = v_ticket) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.prop_trades (
        prop_account_id, user_id, symbol, trade_type, lot_size,
        entry_price, exit_price, profit_loss, commission, swap,
        magic_number, comment, status, opened_at, closed_at, mt5_ticket, source
      ) VALUES (
        v_acct.id, v_acct.user_id,
        COALESCE(v_deal->>'symbol','?'),
        upper(COALESCE(v_deal->>'type','BUY')),
        COALESCE((v_deal->>'lots')::numeric, 0),
        COALESCE((v_deal->>'openPrice')::numeric, 0),
        NULLIF(v_deal->>'closePrice','')::numeric,
        COALESCE((v_deal->>'profit')::numeric, 0),
        COALESCE((v_deal->>'commission')::numeric, 0),
        COALESCE((v_deal->>'swap')::numeric, 0),
        NULLIF(v_deal->>'magic','')::bigint,
        v_deal->>'comment',
        'closed',
        COALESCE((v_deal->>'openedAt')::timestamptz, now()),
        COALESCE((v_deal->>'closedAt')::timestamptz, now()),
        v_ticket,
        'mt5'
      );

      v_pnl_delta := v_pnl_delta + COALESCE((v_deal->>'profit')::numeric,0)
                                 + COALESCE((v_deal->>'commission')::numeric,0)
                                 + COALESCE((v_deal->>'swap')::numeric,0);
      v_trades_delta := v_trades_delta + 1;
      IF COALESCE((v_deal->>'profit')::numeric,0) >= 0 THEN
        v_wins_delta := v_wins_delta + 1;
      ELSE
        v_losses_delta := v_losses_delta + 1;
      END IF;
    END LOOP;
  END IF;

  -- Compute today's stats
  SELECT (account_balance) INTO v_daily_start_balance
  FROM public.prop_daily_stats
  WHERE prop_account_id = v_acct.id AND trade_date = v_today
  LIMIT 1;

  IF v_daily_start_balance IS NULL THEN
    v_daily_start_balance := v_acct.account_balance; -- balance at first sync today
    v_first_day_today := true;
  END IF;
  v_daily_pnl := v_equity - v_daily_start_balance;
  v_daily_pnl_pct := CASE WHEN v_daily_start_balance > 0 THEN (v_daily_pnl / v_daily_start_balance) * 100 ELSE 0 END;

  -- Drawdown and profit-target percentages
  v_drawdown_pct := CASE WHEN v_starting > 0
    THEN (GREATEST(v_acct.highest_balance, v_equity) - v_equity) / v_starting * 100
    ELSE 0 END;
  v_profit_pct := CASE WHEN v_starting > 0
    THEN (v_equity - v_starting) / v_starting * 100
    ELSE 0 END;

  -- Update master account row
  UPDATE public.user_prop_accounts
  SET account_balance = v_balance,
      current_equity = v_equity,
      highest_balance = GREATEST(highest_balance, v_equity, v_balance),
      total_pnl = total_pnl + v_pnl_delta,
      total_trades = total_trades + v_trades_delta,
      winning_trades = winning_trades + v_wins_delta,
      losing_trades = losing_trades + v_losses_delta,
      trading_days = trading_days + (CASE WHEN v_first_day_today AND v_trades_delta > 0 THEN 1 ELSE 0 END),
      mt5_margin = v_margin,
      mt5_free_margin = v_free,
      mt5_open_positions = v_open,
      mt5_sync_status = 'connected',
      mt5_last_sync_at = now(),
      mt5_last_error = NULL,
      profit_target_hit = profit_target_hit OR (v_tier.profit_target_percent > 0 AND v_profit_pct >= v_tier.profit_target_percent),
      max_drawdown_hit  = max_drawdown_hit  OR (v_tier.max_total_drawdown_percent > 0 AND v_drawdown_pct >= v_tier.max_total_drawdown_percent),
      max_daily_loss_hit= max_daily_loss_hit OR (v_tier.max_daily_loss_percent > 0 AND (-v_daily_pnl_pct) >= v_tier.max_daily_loss_percent),
      updated_at = now()
  WHERE id = v_acct.id
  RETURNING * INTO v_acct;

  -- Promote phase/status
  IF v_acct.max_drawdown_hit OR v_acct.max_daily_loss_hit THEN
    UPDATE public.user_prop_accounts
    SET status = 'failed', failed_at = COALESCE(failed_at, now())
    WHERE id = v_acct.id;

    IF NOT v_was_failed THEN
      INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
      VALUES (v_acct.user_id, 'Account breached rules',
              'Live MT5 sync detected a breach on your '||COALESCE(v_tier.tier_name,'prop')||' account. Trading halted.',
              'error','🛑','/portfolio');
    END IF;
  ELSIF v_acct.profit_target_hit AND v_acct.status <> 'passed' THEN
    UPDATE public.user_prop_accounts
    SET status = 'passed', passed_at = COALESCE(passed_at, now())
    WHERE id = v_acct.id;

    IF NOT v_was_passed THEN
      INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
      VALUES (v_acct.user_id, 'Profit target reached',
              'Your '||COALESCE(v_tier.tier_name,'prop')||' account hit the profit target via live MT5 sync.',
              'success','🏆','/portfolio');
    END IF;
  END IF;

  -- Upsert today's daily stats
  INSERT INTO public.prop_daily_stats (
    prop_account_id, trade_date, account_balance, starting_balance,
    daily_pnl, daily_pnl_percent, trades_count
  ) VALUES (
    v_acct.id, v_today, v_equity, v_daily_start_balance,
    v_daily_pnl, v_daily_pnl_pct, v_trades_delta
  )
  ON CONFLICT (prop_account_id, trade_date) DO UPDATE
    SET account_balance = EXCLUDED.account_balance,
        daily_pnl = EXCLUDED.daily_pnl,
        daily_pnl_percent = EXCLUDED.daily_pnl_percent,
        trades_count = public.prop_daily_stats.trades_count + EXCLUDED.trades_count;
END $$;

REVOKE ALL ON FUNCTION public.apply_mt5_snapshot(uuid,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_mt5_snapshot(uuid,jsonb) TO service_role;

-- 6) Helper: record a sync error
CREATE OR REPLACE FUNCTION public.mt5_record_error(p_account_id uuid, p_error text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_prop_accounts
  SET mt5_sync_status = 'error', mt5_last_error = LEFT(COALESCE(p_error,'Unknown error'), 500), updated_at = now()
  WHERE id = p_account_id;
$$;
REVOKE ALL ON FUNCTION public.mt5_record_error(uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.mt5_record_error(uuid,text) TO service_role;

-- 7) Helper: mark account as provisioned
CREATE OR REPLACE FUNCTION public.mt5_mark_provisioned(p_account_id uuid, p_metaapi_id text, p_region text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_prop_accounts
  SET metaapi_account_id = p_metaapi_id,
      metaapi_region = COALESCE(p_region, metaapi_region),
      mt5_sync_enabled = true,
      mt5_sync_status = 'connected',
      mt5_last_error = NULL,
      updated_at = now()
  WHERE id = p_account_id;
$$;
REVOKE ALL ON FUNCTION public.mt5_mark_provisioned(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.mt5_mark_provisioned(uuid,text,text) TO service_role;

-- Ensure prop_daily_stats has the unique key apply_mt5_snapshot relies on
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='prop_daily_stats_acct_date_uniq'
  ) THEN
    CREATE UNIQUE INDEX prop_daily_stats_acct_date_uniq
      ON public.prop_daily_stats (prop_account_id, trade_date);
  END IF;
END $$;
