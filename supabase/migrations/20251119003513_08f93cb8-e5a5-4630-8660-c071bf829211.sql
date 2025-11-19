-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  xp_reward INTEGER DEFAULT 0,
  unlock_condition JSONB NOT NULL,
  cinematic_id TEXT,
  badge_asset TEXT,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  progress JSONB DEFAULT '{}',
  cinematic_watched BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are viewable by everyone
CREATE POLICY "Anyone can view achievements"
  ON public.achievements
  FOR SELECT
  USING (true);

-- Only admins can manage achievements
CREATE POLICY "Admins can insert achievements"
  ON public.achievements
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update achievements"
  ON public.achievements
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete achievements"
  ON public.achievements
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert achievements for users (via backend)
CREATE POLICY "Service role can insert user achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (true);

-- Users can update their own achievement progress (cinematic_watched)
CREATE POLICY "Users can update their achievement progress"
  ON public.user_achievements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_achievements_rarity ON public.achievements(rarity);

-- Create updated_at trigger for achievements
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert starter achievements
INSERT INTO public.achievements (code, name, description, category, icon, rarity, xp_reward, unlock_condition, badge_asset) VALUES
('first_steps', 'First Steps', 'Complete your profile setup', 'onboarding', '🎯', 'common', 100, '{"type":"profile_complete"}', '/badges/first-steps.png'),
('payment_warrior', 'Payment Warrior', 'Complete your first payment', 'payment', '💎', 'common', 150, '{"type":"payment_complete"}', '/badges/payment.png'),
('quick_learner', 'Quick Learner', 'Reach Level 5', 'progression', '⚡', 'uncommon', 200, '{"type":"level_reach","level":5}', '/badges/level-5.png'),
('trade_master', 'Trade Master', 'Complete 10 successful trades', 'trading', '📈', 'rare', 500, '{"type":"trades_complete","count":10}', '/badges/trade-master.png'),
('community_star', 'Community Star', 'Help 5 other students', 'community', '⭐', 'rare', 300, '{"type":"referrals","count":5}', '/badges/community.png'),
('xp_hunter', 'XP Hunter', 'Earn 1000 total XP', 'progression', '🔥', 'uncommon', 250, '{"type":"xp_total","amount":1000}', '/badges/xp-hunter.png'),
('avatar_collector', 'Avatar Collector', 'Unlock 5 avatar gear items', 'avatar', '🎨', 'uncommon', 200, '{"type":"gear_collected","count":5}', '/badges/collector.png'),
('vault_explorer', 'Vault Explorer', 'Access the BlackVault for the first time', 'vault', '🔐', 'common', 150, '{"type":"vault_first_access"}', '/badges/vault.png');
