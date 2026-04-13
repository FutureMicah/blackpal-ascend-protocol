
-- Copy Trading: who follows whom
CREATE TABLE public.copy_trading_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  leader_id UUID NOT NULL,
  allocation_percent NUMERIC NOT NULL DEFAULT 10,
  max_risk_per_trade NUMERIC NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_copied_trades INTEGER NOT NULL DEFAULT 0,
  total_pnl NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, leader_id)
);
ALTER TABLE public.copy_trading_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows" ON public.copy_trading_follows FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "Users can follow traders" ON public.copy_trading_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update own follows" ON public.copy_trading_follows FOR UPDATE USING (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.copy_trading_follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Admins can view all follows" ON public.copy_trading_follows FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Copy Trading: copied positions
CREATE TABLE public.copy_trading_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follow_id UUID NOT NULL REFERENCES public.copy_trading_follows(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL,
  leader_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  lot_size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  sl NUMERIC,
  tp NUMERIC,
  pnl NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.copy_trading_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own copied positions" ON public.copy_trading_positions FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = leader_id);
CREATE POLICY "System can insert copied positions" ON public.copy_trading_positions FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can update own copies" ON public.copy_trading_positions FOR UPDATE USING (auth.uid() = follower_id);

-- Trade Analytics: daily snapshots
CREATE TABLE public.trade_analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  daily_pnl NUMERIC NOT NULL DEFAULT 0,
  cumulative_pnl NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  winning_trades INTEGER NOT NULL DEFAULT 0,
  losing_trades INTEGER NOT NULL DEFAULT 0,
  equity NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  avg_risk_reward NUMERIC NOT NULL DEFAULT 0,
  best_trade NUMERIC NOT NULL DEFAULT 0,
  worst_trade NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);
ALTER TABLE public.trade_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own snapshots" ON public.trade_analytics_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own snapshots" ON public.trade_analytics_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own snapshots" ON public.trade_analytics_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all snapshots" ON public.trade_analytics_snapshots FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- User Watchlists
CREATE TABLE public.user_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Watchlist',
  symbols TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlists" ON public.user_watchlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Price Alerts
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL DEFAULT 'above',
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts" ON public.price_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_copy_trading_follows_updated_at BEFORE UPDATE ON public.copy_trading_follows FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_user_watchlists_updated_at BEFORE UPDATE ON public.user_watchlists FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
