-- Create lottery system tables
CREATE TABLE public.daily_lottery_spins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_spin_date DATE NOT NULL,
  spins_remaining INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, last_spin_date)
);

CREATE TABLE public.lottery_prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  rarity_weight INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crafting system tables
CREATE TABLE public.crafting_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_name TEXT NOT NULL,
  description TEXT,
  required_achievement_ids UUID[] NOT NULL,
  result_achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  xp_cost INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.crafted_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.crafting_recipes(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  crafted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guilds/teams tables
CREATE TABLE public.achievement_guilds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_name TEXT NOT NULL UNIQUE,
  guild_description TEXT,
  guild_icon TEXT,
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_guild_xp INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.guild_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.achievement_guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  contribution_xp INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, user_id)
);

CREATE TABLE public.guild_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.achievement_guilds(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.achievement_seasons(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL,
  target_xp INTEGER NOT NULL,
  current_xp INTEGER DEFAULT 0,
  reward_description TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading system tables
CREATE TABLE public.achievement_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  trade_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.daily_lottery_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crafting_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crafted_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guild_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lottery
CREATE POLICY "Users can view their own spins"
  ON public.daily_lottery_spins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their spins"
  ON public.daily_lottery_spins FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view lottery prizes"
  ON public.lottery_prizes FOR SELECT
  USING (true);

-- RLS Policies for crafting
CREATE POLICY "Anyone can view recipes"
  ON public.crafting_recipes FOR SELECT
  USING (true);

CREATE POLICY "Users can view their crafted achievements"
  ON public.crafted_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can craft achievements"
  ON public.crafted_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for guilds
CREATE POLICY "Anyone can view public guilds"
  ON public.achievement_guilds FOR SELECT
  USING (is_public = true OR EXISTS (
    SELECT 1 FROM public.guild_members 
    WHERE guild_id = achievement_guilds.id AND user_id = auth.uid()
  ));

CREATE POLICY "Founders can update guilds"
  ON public.achievement_guilds FOR UPDATE
  USING (auth.uid() = founder_id);

CREATE POLICY "Anyone can create guilds"
  ON public.achievement_guilds FOR INSERT
  WITH CHECK (auth.uid() = founder_id);

CREATE POLICY "Guild members can view members"
  ON public.guild_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.guild_members gm 
    WHERE gm.guild_id = guild_members.guild_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can join guilds"
  ON public.guild_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guild members can view challenges"
  ON public.guild_challenges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.guild_members 
    WHERE guild_id = guild_challenges.guild_id AND user_id = auth.uid()
  ));

-- RLS Policies for trading
CREATE POLICY "Users can view their trades"
  ON public.achievement_trades FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create trades"
  ON public.achievement_trades FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update trades they receive"
  ON public.achievement_trades FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Triggers
CREATE TRIGGER update_guilds_updated_at
  BEFORE UPDATE ON public.achievement_guilds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievement_trades;
ALTER TABLE public.achievement_trades REPLICA IDENTITY FULL;