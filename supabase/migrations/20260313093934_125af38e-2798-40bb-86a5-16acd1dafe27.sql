
-- Prop firm tiers (Bronze, Silver, Gold, Platinum, Diamond)
CREATE TABLE public.prop_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_level INTEGER NOT NULL DEFAULT 1,
  account_size NUMERIC NOT NULL DEFAULT 10000,
  max_daily_loss_percent NUMERIC NOT NULL DEFAULT 5,
  max_total_drawdown_percent NUMERIC NOT NULL DEFAULT 10,
  profit_target_percent NUMERIC NOT NULL DEFAULT 8,
  profit_split_percent NUMERIC NOT NULL DEFAULT 70,
  min_trading_days INTEGER NOT NULL DEFAULT 5,
  max_trading_days INTEGER NOT NULL DEFAULT 30,
  challenge_fee NUMERIC NOT NULL DEFAULT 0,
  required_passes INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  badge_icon TEXT DEFAULT '🥉',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prop_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view prop tiers" ON public.prop_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage prop tiers" ON public.prop_tiers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- User prop accounts (assigned by admin, tracks performance)
CREATE TABLE public.user_prop_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES public.prop_tiers(id) ON DELETE CASCADE NOT NULL,
  account_balance NUMERIC NOT NULL DEFAULT 10000,
  starting_balance NUMERIC NOT NULL DEFAULT 10000,
  current_equity NUMERIC NOT NULL DEFAULT 10000,
  highest_balance NUMERIC NOT NULL DEFAULT 10000,
  total_pnl NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  trading_days INTEGER NOT NULL DEFAULT 0,
  max_daily_loss_hit BOOLEAN DEFAULT false,
  max_drawdown_hit BOOLEAN DEFAULT false,
  profit_target_hit BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  phase TEXT NOT NULL DEFAULT 'challenge',
  access_code TEXT NOT NULL,
  passed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_prop_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prop accounts" ON public.user_prop_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prop accounts" ON public.user_prop_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all prop accounts" ON public.user_prop_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Prop account trades (every trade on a prop account)
CREATE TABLE public.prop_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prop_account_id UUID REFERENCES public.user_prop_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  lot_size NUMERIC NOT NULL DEFAULT 0.01,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  profit_loss NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prop_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prop trades" ON public.prop_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create prop trades" ON public.prop_trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prop trades" ON public.prop_trades FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all prop trades" ON public.prop_trades FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Daily performance log for prop accounts
CREATE TABLE public.prop_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prop_account_id UUID REFERENCES public.user_prop_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  starting_balance NUMERIC NOT NULL,
  ending_balance NUMERIC NOT NULL,
  daily_pnl NUMERIC NOT NULL DEFAULT 0,
  daily_pnl_percent NUMERIC NOT NULL DEFAULT 0,
  trades_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prop_account_id, trade_date)
);

ALTER TABLE public.prop_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily stats" ON public.prop_daily_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily stats" ON public.prop_daily_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily stats" ON public.prop_daily_stats FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all daily stats" ON public.prop_daily_stats FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Prop account pass history (tracks which tiers a user has passed)
CREATE TABLE public.prop_pass_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES public.prop_tiers(id) ON DELETE CASCADE NOT NULL,
  prop_account_id UUID REFERENCES public.user_prop_accounts(id) ON DELETE CASCADE NOT NULL,
  final_balance NUMERIC NOT NULL,
  final_pnl_percent NUMERIC NOT NULL,
  total_trades INTEGER NOT NULL DEFAULT 0,
  trading_days INTEGER NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  passed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prop_pass_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pass history" ON public.prop_pass_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage pass history" ON public.prop_pass_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for prop trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.prop_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_prop_accounts;

-- Insert default prop tiers
INSERT INTO public.prop_tiers (tier_name, tier_level, account_size, max_daily_loss_percent, max_total_drawdown_percent, profit_target_percent, profit_split_percent, min_trading_days, max_trading_days, challenge_fee, required_passes, description, badge_icon) VALUES
('Bronze', 1, 5000, 5, 10, 8, 60, 5, 30, 0, 0, 'Entry-level prop account. Prove your skills with a $5,000 account.', '🥉'),
('Silver', 2, 10000, 5, 10, 8, 65, 5, 30, 0, 1, 'Level up to $10,000. Requires 1 passed challenge.', '🥈'),
('Gold', 3, 25000, 4, 8, 10, 70, 7, 30, 0, 2, 'Professional tier. $25,000 account with tighter rules.', '🥇'),
('Platinum', 4, 50000, 4, 8, 10, 75, 7, 30, 0, 3, 'Elite trader status. $50,000 account.', '💎'),
('Diamond', 5, 100000, 3, 6, 12, 80, 10, 30, 0, 4, 'Master trader. $100,000 account with best profit split.', '👑');
