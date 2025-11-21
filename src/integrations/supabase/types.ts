export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_auctions: {
        Row: {
          achievement_id: string
          auction_end_date: string
          buyout_price: number | null
          created_at: string
          current_bid: number
          id: string
          seller_id: string
          starting_bid: number
          status: string
          winner_id: string | null
        }
        Insert: {
          achievement_id: string
          auction_end_date: string
          buyout_price?: number | null
          created_at?: string
          current_bid: number
          id?: string
          seller_id: string
          starting_bid: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          achievement_id?: string
          auction_end_date?: string
          buyout_price?: number | null
          created_at?: string
          current_bid?: number
          id?: string
          seller_id?: string
          starting_bid?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_auctions_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_auctions_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_evolution_paths: {
        Row: {
          base_achievement_id: string
          created_at: string
          evolved_achievement_id: string
          id: string
          required_materials: Json | null
          required_usage_count: number | null
          xp_cost: number | null
        }
        Insert: {
          base_achievement_id: string
          created_at?: string
          evolved_achievement_id: string
          id?: string
          required_materials?: Json | null
          required_usage_count?: number | null
          xp_cost?: number | null
        }
        Update: {
          base_achievement_id?: string
          created_at?: string
          evolved_achievement_id?: string
          id?: string
          required_materials?: Json | null
          required_usage_count?: number | null
          xp_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_evolution_paths_base_achievement_id_fkey"
            columns: ["base_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_evolution_paths_base_achievement_id_fkey"
            columns: ["base_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_evolution_paths_evolved_achievement_id_fkey"
            columns: ["evolved_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_evolution_paths_evolved_achievement_id_fkey"
            columns: ["evolved_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_guilds: {
        Row: {
          created_at: string
          founder_id: string
          guild_description: string | null
          guild_icon: string | null
          guild_name: string
          id: string
          is_public: boolean | null
          member_count: number | null
          total_guild_xp: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          guild_description?: string | null
          guild_icon?: string | null
          guild_name: string
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          total_guild_xp?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          guild_description?: string | null
          guild_icon?: string | null
          guild_name?: string
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          total_guild_xp?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      achievement_lore: {
        Row: {
          achievement_id: string
          chapter_number: number
          created_at: string
          id: string
          lore_content: string
          lore_title: string
          unlock_requirements: Json | null
        }
        Insert: {
          achievement_id: string
          chapter_number?: number
          created_at?: string
          id?: string
          lore_content: string
          lore_title: string
          unlock_requirements?: Json | null
        }
        Update: {
          achievement_id?: string
          chapter_number?: number
          created_at?: string
          id?: string
          lore_content?: string
          lore_title?: string
          unlock_requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_lore_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_lore_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_materials: {
        Row: {
          created_at: string
          icon: string
          id: string
          material_description: string | null
          material_name: string
          rarity: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          material_description?: string | null
          material_name: string
          rarity?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          material_description?: string | null
          material_name?: string
          rarity?: string
        }
        Relationships: []
      }
      achievement_seasons: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          season_name: string
          season_number: number
          start_date: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          season_name: string
          season_number: number
          start_date: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          season_name?: string
          season_number?: number
          start_date?: string
        }
        Relationships: []
      }
      achievement_trades: {
        Row: {
          achievement_id: string
          completed_at: string | null
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          status: string
          to_user_id: string
          trade_type: string
        }
        Insert: {
          achievement_id: string
          completed_at?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          status?: string
          to_user_id: string
          trade_type: string
        }
        Update: {
          achievement_id?: string
          completed_at?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          status?: string
          to_user_id?: string
          trade_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_trades_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_trades_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          badge_asset: string | null
          category: string
          cinematic_id: string | null
          code: string
          created_at: string | null
          description: string
          icon: string
          id: string
          is_hidden: boolean | null
          name: string
          rarity: string
          unlock_condition: Json
          updated_at: string | null
          xp_reward: number | null
        }
        Insert: {
          badge_asset?: string | null
          category: string
          cinematic_id?: string | null
          code: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          is_hidden?: boolean | null
          name: string
          rarity?: string
          unlock_condition: Json
          updated_at?: string | null
          xp_reward?: number | null
        }
        Update: {
          badge_asset?: string | null
          category?: string
          cinematic_id?: string | null
          code?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_hidden?: boolean | null
          name?: string
          rarity?: string
          unlock_condition?: Json
          updated_at?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      auction_bids: {
        Row: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at: string
          id: string
        }
        Insert: {
          auction_id: string
          bid_amount: number
          bidder_id: string
          created_at?: string
          id?: string
        }
        Update: {
          auction_id?: string
          bid_amount?: number
          bidder_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "achievement_auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_presets: {
        Row: {
          achievement_ids: string[]
          created_at: string
          id: string
          is_active: boolean | null
          preset_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_ids: string[]
          created_at?: string
          id?: string
          is_active?: boolean | null
          preset_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_ids?: string[]
          created_at?: string
          id?: string
          is_active?: boolean | null
          preset_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crafted_achievements: {
        Row: {
          achievement_id: string
          crafted_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          crafted_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          crafted_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crafted_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crafted_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crafted_achievements_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "crafting_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      crafting_recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          recipe_name: string
          required_achievement_ids: string[]
          result_achievement_id: string
          xp_cost: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          recipe_name: string
          required_achievement_ids: string[]
          result_achievement_id: string
          xp_cost?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          recipe_name?: string
          required_achievement_ids?: string[]
          result_achievement_id?: string
          xp_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crafting_recipes_result_achievement_id_fkey"
            columns: ["result_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crafting_recipes_result_achievement_id_fkey"
            columns: ["result_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_lottery_spins: {
        Row: {
          created_at: string
          id: string
          last_spin_date: string
          spins_remaining: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_spin_date: string
          spins_remaining?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_spin_date?: string
          spins_remaining?: number | null
          user_id?: string
        }
        Relationships: []
      }
      friend_connections: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      guild_boss_battles: {
        Row: {
          boss_description: string | null
          boss_hp: number
          boss_image: string | null
          boss_name: string
          created_at: string
          current_hp: number
          end_date: string
          id: string
          is_active: boolean | null
          reward_achievement_id: string | null
          start_date: string
        }
        Insert: {
          boss_description?: string | null
          boss_hp?: number
          boss_image?: string | null
          boss_name: string
          created_at?: string
          current_hp?: number
          end_date: string
          id?: string
          is_active?: boolean | null
          reward_achievement_id?: string | null
          start_date: string
        }
        Update: {
          boss_description?: string | null
          boss_hp?: number
          boss_image?: string | null
          boss_name?: string
          created_at?: string
          current_hp?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          reward_achievement_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_boss_battles_reward_achievement_id_fkey"
            columns: ["reward_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_boss_battles_reward_achievement_id_fkey"
            columns: ["reward_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_boss_participation: {
        Row: {
          boss_battle_id: string
          created_at: string
          damage_dealt: number | null
          guild_id: string
          id: string
        }
        Insert: {
          boss_battle_id: string
          created_at?: string
          damage_dealt?: number | null
          guild_id: string
          id?: string
        }
        Update: {
          boss_battle_id?: string
          created_at?: string
          damage_dealt?: number | null
          guild_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_boss_participation_boss_battle_id_fkey"
            columns: ["boss_battle_id"]
            isOneToOne: false
            referencedRelation: "guild_boss_battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_boss_participation_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "achievement_guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_challenges: {
        Row: {
          challenge_name: string
          created_at: string
          current_xp: number | null
          guild_id: string
          id: string
          is_completed: boolean | null
          reward_description: string | null
          season_id: string | null
          target_xp: number
        }
        Insert: {
          challenge_name: string
          created_at?: string
          current_xp?: number | null
          guild_id: string
          id?: string
          is_completed?: boolean | null
          reward_description?: string | null
          season_id?: string | null
          target_xp: number
        }
        Update: {
          challenge_name?: string
          created_at?: string
          current_xp?: number | null
          guild_id?: string
          id?: string
          is_completed?: boolean | null
          reward_description?: string | null
          season_id?: string | null
          target_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "guild_challenges_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "achievement_guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_challenges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "achievement_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          contribution_xp: number | null
          guild_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          contribution_xp?: number | null
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          contribution_xp?: number | null
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "achievement_guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      lottery_prizes: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          is_active: boolean | null
          rarity_weight: number
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rarity_weight: number
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rarity_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "lottery_prizes_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lottery_prizes_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_local: number | null
          amount_usd: number
          completed_at: string | null
          created_at: string | null
          crypto_network: string | null
          crypto_tx_hash: string | null
          crypto_wallet_address: string | null
          id: string
          invoice_expires_at: string | null
          local_currency: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_tier: Database["public"]["Enums"]["payment_tier"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_local?: number | null
          amount_usd: number
          completed_at?: string | null
          created_at?: string | null
          crypto_network?: string | null
          crypto_tx_hash?: string | null
          crypto_wallet_address?: string | null
          id?: string
          invoice_expires_at?: string | null
          local_currency?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_tier: Database["public"]["Enums"]["payment_tier"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_local?: number | null
          amount_usd?: number
          completed_at?: string | null
          created_at?: string | null
          crypto_network?: string | null
          crypto_tx_hash?: string | null
          crypto_wallet_address?: string | null
          id?: string
          invoice_expires_at?: string | null
          local_currency?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_tier?: Database["public"]["Enums"]["payment_tier"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievement_streak: number | null
          activated_at: string | null
          avatar_url: string | null
          best_achievement_streak: number | null
          bio: string | null
          citizenship_rank: string | null
          continent: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          github_handle: string | null
          google_id: string | null
          id: string
          instagram_handle: string | null
          is_africa: boolean | null
          is_nigeria: boolean | null
          language: string | null
          last_achievement_date: string | null
          last_login_at: string | null
          linkedin_url: string | null
          payment_completed: boolean | null
          payment_required: boolean | null
          payment_tier: Database["public"]["Enums"]["payment_tier"] | null
          phone_number: string | null
          profile_visibility: string | null
          rank_level: number | null
          show_email: boolean | null
          streak_days: number | null
          theme_preference: string | null
          timezone: string | null
          twitter_handle: string | null
          updated_at: string
          username: string | null
          virtual_currency: number | null
          website_url: string | null
          xp_points: number | null
        }
        Insert: {
          achievement_streak?: number | null
          activated_at?: string | null
          avatar_url?: string | null
          best_achievement_streak?: number | null
          bio?: string | null
          citizenship_rank?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          github_handle?: string | null
          google_id?: string | null
          id: string
          instagram_handle?: string | null
          is_africa?: boolean | null
          is_nigeria?: boolean | null
          language?: string | null
          last_achievement_date?: string | null
          last_login_at?: string | null
          linkedin_url?: string | null
          payment_completed?: boolean | null
          payment_required?: boolean | null
          payment_tier?: Database["public"]["Enums"]["payment_tier"] | null
          phone_number?: string | null
          profile_visibility?: string | null
          rank_level?: number | null
          show_email?: boolean | null
          streak_days?: number | null
          theme_preference?: string | null
          timezone?: string | null
          twitter_handle?: string | null
          updated_at?: string
          username?: string | null
          virtual_currency?: number | null
          website_url?: string | null
          xp_points?: number | null
        }
        Update: {
          achievement_streak?: number | null
          activated_at?: string | null
          avatar_url?: string | null
          best_achievement_streak?: number | null
          bio?: string | null
          citizenship_rank?: string | null
          continent?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          github_handle?: string | null
          google_id?: string | null
          id?: string
          instagram_handle?: string | null
          is_africa?: boolean | null
          is_nigeria?: boolean | null
          language?: string | null
          last_achievement_date?: string | null
          last_login_at?: string | null
          linkedin_url?: string | null
          payment_completed?: boolean | null
          payment_required?: boolean | null
          payment_tier?: Database["public"]["Enums"]["payment_tier"] | null
          phone_number?: string | null
          profile_visibility?: string | null
          rank_level?: number | null
          show_email?: boolean | null
          streak_days?: number | null
          theme_preference?: string | null
          timezone?: string | null
          twitter_handle?: string | null
          updated_at?: string
          username?: string | null
          virtual_currency?: number | null
          website_url?: string | null
          xp_points?: number | null
        }
        Relationships: []
      }
      season_leaderboard: {
        Row: {
          created_at: string
          id: string
          rank: number | null
          season_achievements: number | null
          season_id: string
          season_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank?: number | null
          season_achievements?: number | null
          season_id: string
          season_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rank?: number | null
          season_achievements?: number | null
          season_id?: string
          season_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_leaderboard_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "achievement_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievement_evolution: {
        Row: {
          base_achievement_id: string
          evolved_achievement_id: string
          evolved_at: string
          id: string
          user_id: string
        }
        Insert: {
          base_achievement_id: string
          evolved_achievement_id: string
          evolved_at?: string
          id?: string
          user_id: string
        }
        Update: {
          base_achievement_id?: string
          evolved_achievement_id?: string
          evolved_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievement_evolution_base_achievement_id_fkey"
            columns: ["base_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievement_evolution_base_achievement_id_fkey"
            columns: ["base_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievement_evolution_evolved_achievement_id_fkey"
            columns: ["evolved_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievement_evolution_evolved_achievement_id_fkey"
            columns: ["evolved_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string | null
          cinematic_watched: boolean | null
          combo_size: number | null
          id: string
          part_of_combo: boolean | null
          progress: Json | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string | null
          cinematic_watched?: boolean | null
          combo_size?: number | null
          id?: string
          part_of_combo?: boolean | null
          progress?: Json | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string | null
          cinematic_watched?: boolean | null
          combo_size?: number | null
          id?: string
          part_of_combo?: boolean | null
          progress?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_materials: {
        Row: {
          created_at: string
          id: string
          material_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "achievement_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      achievement_stats: {
        Row: {
          category: string | null
          id: string | null
          name: string | null
          rarity: string | null
          unlock_count: number | null
          unlock_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_achievement_streak: {
        Args: { user_id_param: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "student" | "investor" | "admin" | "moderator"
      payment_method:
        | "paystack"
        | "flutterwave"
        | "bank_transfer"
        | "ussd"
        | "voucher"
        | "crypto_trc20"
        | "crypto_bsc"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      payment_tier: "NIGERIA" | "AFRICA" | "INTERNATIONAL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "investor", "admin", "moderator"],
      payment_method: [
        "paystack",
        "flutterwave",
        "bank_transfer",
        "ussd",
        "voucher",
        "crypto_trc20",
        "crypto_bsc",
      ],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      payment_tier: ["NIGERIA", "AFRICA", "INTERNATIONAL"],
    },
  },
} as const
