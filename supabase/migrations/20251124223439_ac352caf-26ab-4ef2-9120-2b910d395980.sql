-- Profile section engagement tracking
CREATE TABLE IF NOT EXISTS public.profile_section_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, section_name)
);

-- Weekly profile challenges
CREATE TABLE IF NOT EXISTS public.profile_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_name TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'section_completion', 'customization', 'engagement'
  target_section TEXT,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  currency_reward INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.profile_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.profile_section_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_section_engagement
CREATE POLICY "Users can view engagement for their own profile"
  ON public.profile_section_engagement
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_section_engagement.profile_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert engagement for their own profile"
  ON public.profile_section_engagement
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_section_engagement.profile_id
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can update engagement for their own profile"
  ON public.profile_section_engagement
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = profile_section_engagement.profile_id
      AND profiles.id = auth.uid()
    )
  );

-- RLS Policies for profile_challenges
CREATE POLICY "Anyone can view active challenges"
  ON public.profile_challenges
  FOR SELECT
  USING (is_active = TRUE);

-- RLS Policies for user_challenge_progress
CREATE POLICY "Users can view their own challenge progress"
  ON public.user_challenge_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress"
  ON public.user_challenge_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
  ON public.user_challenge_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenge_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating timestamp
CREATE TRIGGER update_user_challenge_progress_timestamp
  BEFORE UPDATE ON public.user_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_progress_timestamp();

-- Insert sample weekly challenges
INSERT INTO public.profile_challenges (challenge_name, challenge_description, challenge_type, target_section, target_value, xp_reward, currency_reward, start_date, end_date)
VALUES
  ('Complete Your Bio', 'Write a bio with at least 100 characters to tell others about yourself', 'section_completion', 'bio', 100, 50, 25, NOW(), NOW() + INTERVAL '7 days'),
  ('Social Butterfly', 'Add all 4 social media links to your profile', 'section_completion', 'social_links', 4, 75, 50, NOW(), NOW() + INTERVAL '7 days'),
  ('Theme Master', 'Customize your profile theme with a unique background and font', 'customization', 'theme', 1, 100, 75, NOW(), NOW() + INTERVAL '7 days'),
  ('Profile Perfectionist', 'Reach 100% profile completion', 'section_completion', 'profile', 100, 150, 100, NOW(), NOW() + INTERVAL '7 days'),
  ('Photo Perfect', 'Upload a profile photo', 'section_completion', 'avatar', 1, 30, 15, NOW(), NOW() + INTERVAL '7 days');