-- =====================================================
-- PREMIUM FEATURES DATABASE SCHEMA
-- =====================================================

-- 1. SUBSCRIPTION TIERS
CREATE TABLE public.subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE,
  tier_level INTEGER NOT NULL DEFAULT 1,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]',
  max_paper_trades INTEGER DEFAULT 10,
  max_journal_entries INTEGER DEFAULT 50,
  ai_queries_per_day INTEGER DEFAULT 5,
  can_access_live_rooms BOOLEAN DEFAULT false,
  can_access_mentors BOOLEAN DEFAULT false,
  badge_color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.subscription_tiers (tier_name, tier_level, price_monthly, price_yearly, features, max_paper_trades, max_journal_entries, ai_queries_per_day, can_access_live_rooms, can_access_mentors, badge_color) VALUES
('Bronze', 1, 0, 0, '["Basic trading tools", "5 paper trades/day", "Community access"]', 5, 20, 3, false, false, '#CD7F32'),
('Silver', 2, 9.99, 99.99, '["All Bronze features", "20 paper trades/day", "AI Assistant (10/day)", "Trading journal"]', 20, 100, 10, false, false, '#C0C0C0'),
('Gold', 3, 29.99, 299.99, '["All Silver features", "Unlimited paper trades", "Live trading rooms", "Advanced analytics"]', 1000, 500, 50, true, false, '#FFD700'),
('Diamond', 4, 99.99, 999.99, '["All Gold features", "1-on-1 mentorship", "Priority support", "Exclusive signals"]', 10000, 10000, 1000, true, true, '#B9F2FF'),
('Platinum', 5, 299.99, 2999.99, '["All Diamond features", "Personal trading coach", "VIP events access", "Profit sharing"]', 100000, 100000, 10000, true, true, '#E5E4E2');

-- 2. USER SUBSCRIPTIONS
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES public.subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. PAPER TRADING SIMULATOR
CREATE TABLE public.paper_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_name TEXT NOT NULL DEFAULT 'Main Portfolio',
  initial_balance DECIMAL(15,2) NOT NULL DEFAULT 100000,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 100000,
  total_profit_loss DECIMAL(15,2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.paper_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- 'buy', 'sell', 'short', 'cover'
  quantity DECIMAL(15,8) NOT NULL,
  entry_price DECIMAL(15,8) NOT NULL,
  exit_price DECIMAL(15,8),
  profit_loss DECIMAL(15,2),
  profit_loss_percent DECIMAL(8,4),
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'cancelled'
  stop_loss DECIMAL(15,8),
  take_profit DECIMAL(15,8),
  notes TEXT,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. BATTLE PASS SYSTEM
CREATE TABLE public.battle_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_name TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_level INTEGER DEFAULT 100,
  premium_price DECIMAL(10,2) DEFAULT 19.99,
  is_active BOOLEAN DEFAULT false,
  theme_color TEXT DEFAULT '#8B5CF6',
  banner_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.battle_pass_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_pass_id UUID REFERENCES public.battle_passes(id) ON DELETE CASCADE,
  level_required INTEGER NOT NULL,
  is_premium BOOLEAN DEFAULT false,
  reward_type TEXT NOT NULL, -- 'xp', 'currency', 'badge', 'title', 'avatar', 'achievement'
  reward_value JSONB NOT NULL,
  reward_name TEXT NOT NULL,
  reward_description TEXT,
  reward_icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_battle_pass (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  battle_pass_id UUID REFERENCES public.battle_passes(id) ON DELETE CASCADE,
  current_level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  claimed_rewards TEXT[] DEFAULT '{}',
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, battle_pass_id)
);

-- 5. LIVE TRADING ROOMS
CREATE TABLE public.trading_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_name TEXT NOT NULL,
  room_description TEXT,
  room_type TEXT DEFAULT 'public', -- 'public', 'private', 'premium'
  host_id UUID NOT NULL,
  max_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  required_tier INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.trading_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'viewer', -- 'host', 'moderator', 'speaker', 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  UNIQUE(room_id, user_id)
);

CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.trading_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'trade_idea', 'chart', 'poll'
  content TEXT NOT NULL,
  metadata JSONB,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. MENTOR MATCHING
CREATE TABLE public.mentors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  specialty TEXT[] DEFAULT '{}',
  bio TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  availability_schedule JSONB,
  languages TEXT[] DEFAULT '{"English"}',
  years_experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.mentorship_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  session_type TEXT DEFAULT 'one_on_one', -- 'one_on_one', 'group', 'review'
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  topic TEXT,
  notes TEXT,
  recording_url TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  rating INTEGER,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 7. TRADING JOURNAL
CREATE TABLE public.trading_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_sentiment TEXT, -- 'bullish', 'bearish', 'neutral'
  pre_market_notes TEXT,
  post_market_notes TEXT,
  emotional_state TEXT,
  lessons_learned TEXT,
  goals_for_tomorrow TEXT,
  screenshots TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  ai_analysis TEXT,
  ai_suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID REFERENCES public.trading_journal(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  entry_price DECIMAL(15,8) NOT NULL,
  exit_price DECIMAL(15,8),
  quantity DECIMAL(15,8) NOT NULL,
  profit_loss DECIMAL(15,2),
  setup_type TEXT, -- 'breakout', 'pullback', 'reversal', etc.
  timeframe TEXT,
  entry_reason TEXT,
  exit_reason TEXT,
  mistakes TEXT,
  what_went_well TEXT,
  chart_screenshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. NFT ACHIEVEMENTS
CREATE TABLE public.achievement_nfts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  token_id TEXT,
  contract_address TEXT,
  blockchain TEXT DEFAULT 'polygon',
  mint_status TEXT DEFAULT 'pending', -- 'pending', 'minting', 'minted', 'failed'
  mint_transaction_hash TEXT,
  metadata_uri TEXT,
  image_uri TEXT,
  minted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. AI CHAT HISTORY
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT DEFAULT 'trading_assistant', -- 'trading_assistant', 'journal_analysis', 'market_analysis'
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pass_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_battle_pass ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Subscription tiers (public read)
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers FOR SELECT USING (true);

-- User subscriptions
CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subscription" ON public.user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Paper portfolios
CREATE POLICY "Users can view own portfolios" ON public.paper_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON public.paper_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.paper_portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.paper_portfolios FOR DELETE USING (auth.uid() = user_id);

-- Paper trades
CREATE POLICY "Users can view own trades" ON public.paper_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trades" ON public.paper_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON public.paper_trades FOR UPDATE USING (auth.uid() = user_id);

-- Battle passes (public read)
CREATE POLICY "Anyone can view battle passes" ON public.battle_passes FOR SELECT USING (true);
CREATE POLICY "Anyone can view battle pass rewards" ON public.battle_pass_rewards FOR SELECT USING (true);

-- User battle pass
CREATE POLICY "Users can view own battle pass" ON public.user_battle_pass FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join battle pass" ON public.user_battle_pass FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own battle pass" ON public.user_battle_pass FOR UPDATE USING (auth.uid() = user_id);

-- Trading rooms (public rooms visible to all)
CREATE POLICY "Anyone can view public rooms" ON public.trading_rooms FOR SELECT USING (room_type = 'public' OR host_id = auth.uid());
CREATE POLICY "Users can create rooms" ON public.trading_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update rooms" ON public.trading_rooms FOR UPDATE USING (auth.uid() = host_id);

-- Room participants
CREATE POLICY "View room participants" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Join rooms" ON public.room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own participation" ON public.room_participants FOR UPDATE USING (auth.uid() = user_id);

-- Room messages
CREATE POLICY "View room messages" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "Send messages" ON public.room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mentors (public profiles)
CREATE POLICY "Anyone can view mentors" ON public.mentors FOR SELECT USING (true);
CREATE POLICY "Users can create mentor profile" ON public.mentors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mentor profile" ON public.mentors FOR UPDATE USING (auth.uid() = user_id);

-- Mentorship sessions
CREATE POLICY "Mentors and students can view sessions" ON public.mentorship_sessions FOR SELECT USING (auth.uid() = student_id OR auth.uid() IN (SELECT user_id FROM public.mentors WHERE id = mentor_id));
CREATE POLICY "Students can book sessions" ON public.mentorship_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participants can update sessions" ON public.mentorship_sessions FOR UPDATE USING (auth.uid() = student_id OR auth.uid() IN (SELECT user_id FROM public.mentors WHERE id = mentor_id));

-- Trading journal
CREATE POLICY "Users can view own journal" ON public.trading_journal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create journal entries" ON public.trading_journal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.trading_journal FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.trading_journal FOR DELETE USING (auth.uid() = user_id);

-- Journal trades
CREATE POLICY "Users can view own journal trades" ON public.journal_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create journal trades" ON public.journal_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal trades" ON public.journal_trades FOR UPDATE USING (auth.uid() = user_id);

-- Achievement NFTs
CREATE POLICY "Users can view own NFTs" ON public.achievement_nfts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mint NFTs" ON public.achievement_nfts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own NFTs" ON public.achievement_nfts FOR UPDATE USING (auth.uid() = user_id);

-- AI chat
CREATE POLICY "Users can view own chat sessions" ON public.ai_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chat sessions" ON public.ai_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.ai_chat_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can send messages" ON public.ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_rooms;