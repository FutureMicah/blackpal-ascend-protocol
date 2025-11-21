-- Add virtual currency to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS virtual_currency integer DEFAULT 1000;

-- Achievement lore table for backstory and storytelling
CREATE TABLE IF NOT EXISTS achievement_lore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  lore_title text NOT NULL,
  lore_content text NOT NULL,
  chapter_number integer NOT NULL DEFAULT 1,
  unlock_requirements jsonb DEFAULT '{"required_achievements": []}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Achievement materials for evolution
CREATE TABLE IF NOT EXISTS achievement_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name text NOT NULL,
  material_description text,
  rarity text NOT NULL DEFAULT 'common',
  icon text NOT NULL DEFAULT '💎',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User's material inventory
CREATE TABLE IF NOT EXISTS user_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid REFERENCES achievement_materials(id) ON DELETE CASCADE NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, material_id)
);

-- Evolution paths for achievements
CREATE TABLE IF NOT EXISTS achievement_evolution_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  evolved_achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  required_materials jsonb DEFAULT '[]'::jsonb,
  required_usage_count integer DEFAULT 0,
  xp_cost integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Track user's evolved achievements
CREATE TABLE IF NOT EXISTS user_achievement_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  evolved_achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  evolved_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Guild boss battles
CREATE TABLE IF NOT EXISTS guild_boss_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_name text NOT NULL,
  boss_description text,
  boss_hp integer NOT NULL DEFAULT 10000,
  current_hp integer NOT NULL DEFAULT 10000,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  reward_achievement_id uuid REFERENCES achievements(id),
  boss_image text DEFAULT '🐉',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Track guild participation in boss battles
CREATE TABLE IF NOT EXISTS guild_boss_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_battle_id uuid REFERENCES guild_boss_battles(id) ON DELETE CASCADE NOT NULL,
  guild_id uuid REFERENCES achievement_guilds(id) ON DELETE CASCADE NOT NULL,
  damage_dealt integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(boss_battle_id, guild_id)
);

-- Achievement marketplace auctions
CREATE TABLE IF NOT EXISTS achievement_auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  achievement_id uuid REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  starting_bid integer NOT NULL,
  current_bid integer NOT NULL,
  buyout_price integer,
  auction_end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active',
  winner_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Auction bids
CREATE TABLE IF NOT EXISTS auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES achievement_auctions(id) ON DELETE CASCADE NOT NULL,
  bidder_id uuid NOT NULL,
  bid_amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE achievement_lore ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_evolution_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievement_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_boss_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_boss_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievement_lore
CREATE POLICY "Anyone can view lore" ON achievement_lore FOR SELECT USING (true);

-- RLS Policies for achievement_materials
CREATE POLICY "Anyone can view materials" ON achievement_materials FOR SELECT USING (true);

-- RLS Policies for user_materials
CREATE POLICY "Users can view their materials" ON user_materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their materials" ON user_materials FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for achievement_evolution_paths
CREATE POLICY "Anyone can view evolution paths" ON achievement_evolution_paths FOR SELECT USING (true);

-- RLS Policies for user_achievement_evolution
CREATE POLICY "Users can view their evolutions" ON user_achievement_evolution FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create evolutions" ON user_achievement_evolution FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for guild_boss_battles
CREATE POLICY "Anyone can view boss battles" ON guild_boss_battles FOR SELECT USING (true);

-- RLS Policies for guild_boss_participation
CREATE POLICY "Guild members can view participation" ON guild_boss_participation 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guild_members 
      WHERE guild_members.guild_id = guild_boss_participation.guild_id 
      AND guild_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Guild members can update participation" ON guild_boss_participation 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM guild_members 
      WHERE guild_members.guild_id = guild_boss_participation.guild_id 
      AND guild_members.user_id = auth.uid()
    )
  );
CREATE POLICY "Guild members can insert participation" ON guild_boss_participation 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members 
      WHERE guild_members.guild_id = guild_boss_participation.guild_id 
      AND guild_members.user_id = auth.uid()
    )
  );

-- RLS Policies for achievement_auctions
CREATE POLICY "Anyone can view active auctions" ON achievement_auctions FOR SELECT USING (true);
CREATE POLICY "Users can create auctions" ON achievement_auctions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their auctions" ON achievement_auctions FOR UPDATE USING (auth.uid() = seller_id);

-- RLS Policies for auction_bids
CREATE POLICY "Anyone can view bids" ON auction_bids FOR SELECT USING (true);
CREATE POLICY "Users can place bids" ON auction_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Enable realtime for auctions
ALTER PUBLICATION supabase_realtime ADD TABLE achievement_auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;