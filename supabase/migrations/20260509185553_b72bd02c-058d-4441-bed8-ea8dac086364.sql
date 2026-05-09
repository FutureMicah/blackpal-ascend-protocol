
-- 1. Reset XP & achievement progress
UPDATE public.profiles
SET xp_points = 0,
    rank_level = 1,
    achievement_streak = 0,
    best_achievement_streak = 0,
    last_achievement_date = NULL;

DELETE FROM public.user_achievements;

-- 2. Harder XP — multiply rewards
UPDATE public.achievements
SET xp_reward = CASE rarity
  WHEN 'common'    THEN COALESCE(xp_reward,0) * 2
  WHEN 'rare'      THEN COALESCE(xp_reward,0) * 3
  WHEN 'epic'      THEN COALESCE(xp_reward,0) * 4
  WHEN 'legendary' THEN COALESCE(xp_reward,0) * 5
  ELSE COALESCE(xp_reward,0) * 2
END;

-- 3. Extend prop_tiers with academy-ladder fields
ALTER TABLE public.prop_tiers
  ADD COLUMN IF NOT EXISTS payout_target_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activation_naira numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ladder_order integer;

-- 4. Deactivate old tiers, seed new 5-step ladder
UPDATE public.prop_tiers SET is_active = false;

INSERT INTO public.prop_tiers
  (tier_name, tier_level, account_size, payout_target_balance, student_payout,
   activation_naira, ladder_order, badge_icon, description, is_active,
   profit_target_percent, profit_split_percent, max_daily_loss_percent,
   max_total_drawdown_percent, min_trading_days, max_trading_days, challenge_fee, required_passes)
VALUES
  ('Starter $200K',    1, 200000,   300000,   200000, 0,    1, '🥉', 'First academy practice account. Grow $200,000 → $300,000 to request your $200,000 payout.', true, 50, 100, 5, 10, 5, 60, 0, 0),
  ('Builder $500K',    2, 500000,   600000,   100000, 0,    2, '🥈', 'Grow $500,000 → $600,000 to request your $100,000 payout.',                              true, 20, 100, 5, 10, 5, 60, 0, 0),
  ('Master $1M',       3, 1000000,  1100000,  100000, 0,    3, '🥇', 'Grow $1,000,000 → $1,100,000 to request your $100,000 payout.',                          true, 10, 100, 5, 10, 5, 60, 0, 0),
  ('Pro $2K',          4, 2000,     3000,     1000,   1000, 4, '💎', 'Requires $1,000 activation top-up. Grow $2,000 → $3,000 to request your $1,000 payout.', true, 50, 100, 5, 10, 5, 60, 0, 0),
  ('Elite $5K',        5, 5000,     6000,     1000,   1000, 5, '👑', 'Requires $1,000 activation top-up. Grow $5,000 → $6,000 to request your $1,000 payout.', true, 20, 100, 5, 10, 5, 60, 0, 0);

-- 5. Payout requests table
CREATE TABLE IF NOT EXISTS public.prop_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prop_account_id uuid NOT NULL REFERENCES public.user_prop_accounts(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.prop_tiers(id),
  requested_balance numeric NOT NULL,
  student_payout numeric NOT NULL,
  company_share numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prop_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own payout requests"
ON public.prop_payout_requests FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage payout requests"
ON public.prop_payout_requests FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_prop_payout_updated
BEFORE UPDATE ON public.prop_payout_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. RPC: member requests a payout once goal is reached
CREATE OR REPLACE FUNCTION public.request_prop_payout(p_account_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acct public.user_prop_accounts%ROWTYPE;
  v_tier public.prop_tiers%ROWTYPE;
  v_req_id uuid;
  v_company numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_acct FROM public.user_prop_accounts WHERE id = p_account_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Practice account not found'; END IF;
  IF v_acct.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not your account'; END IF;

  SELECT * INTO v_tier FROM public.prop_tiers WHERE id = v_acct.tier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tier not found'; END IF;

  IF v_acct.account_balance < v_tier.payout_target_balance THEN
    RAISE EXCEPTION 'Goal not reached yet';
  END IF;

  v_company := v_acct.account_balance - v_tier.student_payout;

  INSERT INTO public.prop_payout_requests
    (user_id, prop_account_id, tier_id, requested_balance, student_payout, company_share)
  VALUES
    (auth.uid(), v_acct.id, v_tier.id, v_acct.account_balance, v_tier.student_payout, v_company)
  RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$;

-- 7. RPC: admin approves payout (resets account to starting balance)
CREATE OR REPLACE FUNCTION public.approve_prop_payout(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.prop_payout_requests%ROWTYPE; v_tier public.prop_tiers%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_req FROM public.prop_payout_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  SELECT * INTO v_tier FROM public.prop_tiers WHERE id = v_req.tier_id;

  UPDATE public.prop_payout_requests
    SET status='approved', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=p_note
    WHERE id = p_request_id;

  UPDATE public.user_prop_accounts
    SET account_balance = v_tier.account_size,
        current_equity = v_tier.account_size,
        highest_balance = v_tier.account_size,
        updated_at = now()
    WHERE id = v_req.prop_account_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_prop_payout(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.prop_payout_requests
    SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), admin_note=p_note
    WHERE id = p_request_id AND status='pending';
END;
$$;
