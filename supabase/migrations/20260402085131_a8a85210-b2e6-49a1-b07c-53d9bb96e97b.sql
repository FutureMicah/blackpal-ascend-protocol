
-- =============================================
-- 1. FIX SECURITY: Notification insertion policy
-- =============================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.in_app_notifications;
CREATE POLICY "Authenticated users insert own notifications"
  ON public.in_app_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 2. FIX SECURITY: User achievements insertion
-- =============================================
DROP POLICY IF EXISTS "Service role can insert user achievements" ON public.user_achievements;
CREATE POLICY "System inserts achievements for authenticated users"
  ON public.user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. FIX: Mutable search path on functions
-- =============================================
CREATE OR REPLACE FUNCTION public.update_challenge_progress_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- =============================================
-- 4. Create support_tickets table for 24/7 communication
-- =============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT DEFAULT 'general',
  admin_id UUID,
  admin_reply TEXT,
  admin_replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Create trader_accounts table (XP-based progression)
-- =============================================
CREATE TABLE IF NOT EXISTS public.trader_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL DEFAULT 'Starter Account',
  account_size_naira NUMERIC NOT NULL DEFAULT 200000,
  tier_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  xp_earned INTEGER NOT NULL DEFAULT 0,
  xp_required_next INTEGER NOT NULL DEFAULT 500,
  payout_count INTEGER NOT NULL DEFAULT 0,
  total_payout_naira NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  is_first_account BOOLEAN NOT NULL DEFAULT true,
  profit_target_percent NUMERIC NOT NULL DEFAULT 10,
  max_drawdown_percent NUMERIC NOT NULL DEFAULT 5,
  daily_loss_limit_percent NUMERIC NOT NULL DEFAULT 3,
  current_balance NUMERIC NOT NULL DEFAULT 200000,
  highest_balance NUMERIC NOT NULL DEFAULT 200000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trader_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON public.trader_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own accounts"
  ON public.trader_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.trader_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all accounts"
  ON public.trader_accounts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all accounts"
  ON public.trader_accounts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 6. Create account_requests table
-- =============================================
CREATE TABLE IF NOT EXISTS public.account_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_tier INTEGER NOT NULL DEFAULT 1,
  requested_size_naira NUMERIC NOT NULL DEFAULT 200000,
  user_xp INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.account_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own requests"
  ON public.account_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.account_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests"
  ON public.account_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. XP tier progression config
-- =============================================
CREATE TABLE IF NOT EXISTS public.xp_tier_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_level INTEGER NOT NULL UNIQUE,
  tier_name TEXT NOT NULL,
  account_size_naira NUMERIC NOT NULL,
  max_accounts INTEGER NOT NULL DEFAULT 1,
  xp_required INTEGER NOT NULL,
  profit_target_percent NUMERIC NOT NULL DEFAULT 10,
  max_drawdown_percent NUMERIC NOT NULL DEFAULT 5,
  daily_loss_limit_percent NUMERIC NOT NULL DEFAULT 3,
  profit_split_percent NUMERIC NOT NULL DEFAULT 70,
  badge_icon TEXT DEFAULT '🥉',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_tier_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tiers"
  ON public.xp_tier_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tiers"
  ON public.xp_tier_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for support tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
