-- Daily/Weekly Challenges
CREATE TABLE IF NOT EXISTS achievement_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_name text NOT NULL,
  challenge_description text NOT NULL,
  challenge_type text NOT NULL DEFAULT 'daily',
  objective_type text NOT NULL,
  objective_target integer NOT NULL,
  reward_achievement_id uuid REFERENCES achievements(id),
  xp_reward integer DEFAULT 0,
  currency_reward integer DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  challenge_icon text DEFAULT '🎯',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES achievement_challenges(id) ON DELETE CASCADE NOT NULL,
  current_progress integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, challenge_id)
);

-- Achievement milestones
CREATE TABLE IF NOT EXISTS achievement_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_name text NOT NULL,
  milestone_description text NOT NULL,
  required_achievements integer NOT NULL,
  required_xp integer DEFAULT 0,
  required_category text,
  reward_title text,
  reward_avatar_url text,
  reward_profile_badge text,
  reward_currency integer DEFAULT 0,
  milestone_tier integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User unlocked milestones
CREATE TABLE IF NOT EXISTS user_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_id uuid REFERENCES achievement_milestones(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, milestone_id)
);

-- Achievement combo sets
CREATE TABLE IF NOT EXISTS achievement_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_name text NOT NULL,
  combo_description text NOT NULL,
  required_achievement_ids uuid[] NOT NULL,
  xp_multiplier numeric DEFAULT 1.0,
  bonus_xp integer DEFAULT 0,
  bonus_currency integer DEFAULT 0,
  combo_badge_icon text DEFAULT '⭐',
  combo_rarity text DEFAULT 'rare',
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User unlocked combos
CREATE TABLE IF NOT EXISTS user_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  combo_id uuid REFERENCES achievement_combos(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, combo_id)
);

-- Add titles and customizations to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unlocked_titles text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_badge text;

-- Enable RLS
ALTER TABLE achievement_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_combos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_challenges
CREATE POLICY "Anyone can view active challenges" ON achievement_challenges FOR SELECT USING (is_active = true);

-- RLS Policies for user_challenge_progress
CREATE POLICY "Users can view their challenge progress" ON user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their challenge progress" ON user_challenge_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create challenge progress" ON user_challenge_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievement_milestones
CREATE POLICY "Anyone can view milestones" ON achievement_milestones FOR SELECT USING (true);

-- RLS Policies for user_milestones
CREATE POLICY "Users can view their milestones" ON user_milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can unlock milestones" ON user_milestones FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievement_combos
CREATE POLICY "Anyone can view non-secret combos" ON achievement_combos FOR SELECT USING (is_secret = false OR EXISTS (
  SELECT 1 FROM user_combos WHERE user_combos.combo_id = achievement_combos.id AND user_combos.user_id = auth.uid()
));

-- RLS Policies for user_combos
CREATE POLICY "Users can view their combos" ON user_combos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can unlock combos" ON user_combos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE achievement_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE user_challenge_progress;