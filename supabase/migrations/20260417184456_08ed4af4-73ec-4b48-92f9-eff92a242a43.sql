-- Risk settings (one row per user)
CREATE TABLE IF NOT EXISTS public.risk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  starting_balance NUMERIC NOT NULL DEFAULT 0,
  daily_loss_limit_pct NUMERIC NOT NULL DEFAULT 5,
  max_drawdown_pct NUMERIC NOT NULL DEFAULT 10,
  max_open_positions INT NOT NULL DEFAULT 5,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  lockout_reason TEXT,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_pnl NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own risk" ON public.risk_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own risk" ON public.risk_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own risk" ON public.risk_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own risk" ON public.risk_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER risk_settings_updated_at BEFORE UPDATE ON public.risk_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trader sentiment votes
CREATE TABLE IF NOT EXISTS public.trader_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long','short')),
  vote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol, vote_date)
);
CREATE INDEX IF NOT EXISTS idx_sentiment_symbol_date ON public.trader_sentiment(symbol, vote_date);
ALTER TABLE public.trader_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sentiment" ON public.trader_sentiment FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own vote" ON public.trader_sentiment FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own vote" ON public.trader_sentiment FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own vote" ON public.trader_sentiment FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- News alerts (user subscribed to economic events)
CREATE TABLE IF NOT EXISTS public.news_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('low','medium','high')),
  event_time TIMESTAMPTZ NOT NULL,
  notify_minutes_before INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_alerts_user ON public.news_alerts(user_id, event_time);
ALTER TABLE public.news_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own news" ON public.news_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own news" ON public.news_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own news" ON public.news_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users delete own news" ON public.news_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);