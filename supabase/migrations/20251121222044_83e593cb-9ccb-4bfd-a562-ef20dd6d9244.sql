-- Create seasons table for rotating achievement challenges
CREATE TABLE public.achievement_seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  season_name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create season leaderboard table
CREATE TABLE public.season_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.achievement_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_xp INTEGER DEFAULT 0,
  season_achievements INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);

-- Create badge presets table
CREATE TABLE public.badge_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  achievement_ids UUID[] NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create friend connections table
CREATE TABLE public.friend_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.achievement_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasons (public read)
CREATE POLICY "Anyone can view seasons"
  ON public.achievement_seasons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage seasons"
  ON public.achievement_seasons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for season leaderboard
CREATE POLICY "Anyone can view season leaderboard"
  ON public.season_leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own season stats"
  ON public.season_leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify their season stats"
  ON public.season_leaderboard FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for badge presets
CREATE POLICY "Users can view their own presets"
  ON public.badge_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presets"
  ON public.badge_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON public.badge_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.badge_presets FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for friend connections
CREATE POLICY "Users can view their connections"
  ON public.friend_connections FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create connections"
  ON public.friend_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their connections"
  ON public.friend_connections FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their connections"
  ON public.friend_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_season_leaderboard_updated_at
  BEFORE UPDATE ON public.season_leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_badge_presets_updated_at
  BEFORE UPDATE ON public.badge_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for friend connections and achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;

-- Set replica identity for realtime
ALTER TABLE public.friend_connections REPLICA IDENTITY FULL;
ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;