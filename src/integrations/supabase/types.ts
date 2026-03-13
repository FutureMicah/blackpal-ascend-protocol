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
      achievement_challenges: {
        Row: {
          challenge_description: string
          challenge_icon: string | null
          challenge_name: string
          challenge_type: string
          created_at: string
          currency_reward: number | null
          end_date: string
          id: string
          is_active: boolean | null
          objective_target: number
          objective_type: string
          reward_achievement_id: string | null
          start_date: string
          xp_reward: number | null
        }
        Insert: {
          challenge_description: string
          challenge_icon?: string | null
          challenge_name: string
          challenge_type?: string
          created_at?: string
          currency_reward?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          objective_target: number
          objective_type: string
          reward_achievement_id?: string | null
          start_date: string
          xp_reward?: number | null
        }
        Update: {
          challenge_description?: string
          challenge_icon?: string | null
          challenge_name?: string
          challenge_type?: string
          created_at?: string
          currency_reward?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          objective_target?: number
          objective_type?: string
          reward_achievement_id?: string | null
          start_date?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_challenges_reward_achievement_id_fkey"
            columns: ["reward_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievement_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_challenges_reward_achievement_id_fkey"
            columns: ["reward_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_combos: {
        Row: {
          bonus_currency: number | null
          bonus_xp: number | null
          combo_badge_icon: string | null
          combo_description: string
          combo_name: string
          combo_rarity: string | null
          created_at: string
          id: string
          is_secret: boolean | null
          required_achievement_ids: string[]
          xp_multiplier: number | null
        }
        Insert: {
          bonus_currency?: number | null
          bonus_xp?: number | null
          combo_badge_icon?: string | null
          combo_description: string
          combo_name: string
          combo_rarity?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean | null
          required_achievement_ids: string[]
          xp_multiplier?: number | null
        }
        Update: {
          bonus_currency?: number | null
          bonus_xp?: number | null
          combo_badge_icon?: string | null
          combo_description?: string
          combo_name?: string
          combo_rarity?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean | null
          required_achievement_ids?: string[]
          xp_multiplier?: number | null
        }
        Relationships: []
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
      achievement_milestones: {
        Row: {
          created_at: string
          id: string
          milestone_description: string
          milestone_name: string
          milestone_tier: number
          required_achievements: number
          required_category: string | null
          required_xp: number | null
          reward_avatar_url: string | null
          reward_currency: number | null
          reward_profile_badge: string | null
          reward_title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_description: string
          milestone_name: string
          milestone_tier?: number
          required_achievements: number
          required_category?: string | null
          required_xp?: number | null
          reward_avatar_url?: string | null
          reward_currency?: number | null
          reward_profile_badge?: string | null
          reward_title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          milestone_description?: string
          milestone_name?: string
          milestone_tier?: number
          required_achievements?: number
          required_category?: string | null
          required_xp?: number | null
          reward_avatar_url?: string | null
          reward_currency?: number | null
          reward_profile_badge?: string | null
          reward_title?: string | null
        }
        Relationships: []
      }
      achievement_nfts: {
        Row: {
          achievement_id: string
          blockchain: string | null
          contract_address: string | null
          created_at: string
          id: string
          image_uri: string | null
          metadata_uri: string | null
          mint_status: string | null
          mint_transaction_hash: string | null
          minted_at: string | null
          token_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          blockchain?: string | null
          contract_address?: string | null
          created_at?: string
          id?: string
          image_uri?: string | null
          metadata_uri?: string | null
          mint_status?: string | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          token_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          blockchain?: string | null
          contract_address?: string | null
          created_at?: string
          id?: string
          image_uri?: string | null
          metadata_uri?: string | null
          mint_status?: string | null
          mint_transaction_hash?: string | null
          minted_at?: string | null
          token_id?: string | null
          user_id?: string
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
      admin_broadcasts: {
        Row: {
          admin_id: string
          content: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
        }
        Insert: {
          admin_id: string
          content: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
        }
        Update: {
          admin_id?: string
          content?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
        }
        Relationships: []
      }
      admin_staff: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          department: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          department?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          session_type: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          session_type?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          session_type?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
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
      battle_pass_rewards: {
        Row: {
          battle_pass_id: string | null
          created_at: string
          id: string
          is_premium: boolean | null
          level_required: number
          reward_description: string | null
          reward_icon: string | null
          reward_name: string
          reward_type: string
          reward_value: Json
        }
        Insert: {
          battle_pass_id?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean | null
          level_required: number
          reward_description?: string | null
          reward_icon?: string | null
          reward_name: string
          reward_type: string
          reward_value: Json
        }
        Update: {
          battle_pass_id?: string | null
          created_at?: string
          id?: string
          is_premium?: boolean | null
          level_required?: number
          reward_description?: string | null
          reward_icon?: string | null
          reward_name?: string
          reward_type?: string
          reward_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "battle_pass_rewards_battle_pass_id_fkey"
            columns: ["battle_pass_id"]
            isOneToOne: false
            referencedRelation: "battle_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_passes: {
        Row: {
          banner_image: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          max_level: number | null
          premium_price: number | null
          season_name: string
          season_number: number
          start_date: string
          theme_color: string | null
        }
        Insert: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          max_level?: number | null
          premium_price?: number | null
          season_name: string
          season_number: number
          start_date: string
          theme_color?: string | null
        }
        Update: {
          banner_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_level?: number | null
          premium_price?: number | null
          season_name?: string
          season_number?: number
          start_date?: string
          theme_color?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_hash: string | null
          certificate_name: string
          certificate_type: string
          course_id: string | null
          id: string
          is_verified: boolean | null
          issued_at: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          certificate_hash?: string | null
          certificate_name: string
          certificate_type: string
          course_id?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          certificate_hash?: string | null
          certificate_name?: string
          certificate_type?: string
          course_id?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      collectibles: {
        Row: {
          created_at: string
          current_supply: number | null
          description: string | null
          id: string
          image_url: string | null
          max_supply: number | null
          metadata: Json | null
          name: string
          rarity: string
          tier: string
          token_id: string | null
        }
        Insert: {
          created_at?: string
          current_supply?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          max_supply?: number | null
          metadata?: Json | null
          name: string
          rarity?: string
          tier?: string
          token_id?: string | null
        }
        Update: {
          created_at?: string
          current_supply?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          max_supply?: number | null
          metadata?: Json | null
          name?: string
          rarity?: string
          tier?: string
          token_id?: string | null
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          competition_id: string
          current_balance: number
          id: string
          joined_at: string
          pnl_percentage: number | null
          rank: number | null
          starting_balance: number
          user_id: string
        }
        Insert: {
          competition_id: string
          current_balance?: number
          id?: string
          joined_at?: string
          pnl_percentage?: number | null
          rank?: number | null
          starting_balance?: number
          user_id: string
        }
        Update: {
          competition_id?: string
          current_balance?: number
          id?: string
          joined_at?: string
          pnl_percentage?: number | null
          rank?: number | null
          starting_balance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "trading_competitions"
            referencedColumns: ["id"]
          },
        ]
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
      friend_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
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
      group_chat_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_chat_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      group_chats: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
        }
        Relationships: []
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          media_type: string | null
          media_url: string | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
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
      in_app_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          icon: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_trades: {
        Row: {
          chart_screenshot: string | null
          created_at: string
          entry_price: number
          entry_reason: string | null
          exit_price: number | null
          exit_reason: string | null
          id: string
          journal_id: string | null
          mistakes: string | null
          profit_loss: number | null
          quantity: number
          setup_type: string | null
          symbol: string
          timeframe: string | null
          trade_type: string
          user_id: string
          what_went_well: string | null
        }
        Insert: {
          chart_screenshot?: string | null
          created_at?: string
          entry_price: number
          entry_reason?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          journal_id?: string | null
          mistakes?: string | null
          profit_loss?: number | null
          quantity: number
          setup_type?: string | null
          symbol: string
          timeframe?: string | null
          trade_type: string
          user_id: string
          what_went_well?: string | null
        }
        Update: {
          chart_screenshot?: string | null
          created_at?: string
          entry_price?: number
          entry_reason?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          id?: string
          journal_id?: string | null
          mistakes?: string | null
          profit_loss?: number | null
          quantity?: number
          setup_type?: string | null
          symbol?: string
          timeframe?: string | null
          trade_type?: string
          user_id?: string
          what_went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_trades_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "trading_journal"
            referencedColumns: ["id"]
          },
        ]
      }
      login_activity: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          login_method: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          login_method?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          login_method?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      mentors: {
        Row: {
          availability_schedule: Json | null
          average_rating: number | null
          bio: string | null
          created_at: string
          hourly_rate: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          specialty: string[] | null
          total_sessions: number | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          specialty?: string[] | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          specialty?: string[] | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      mentorship_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          mentor_id: string | null
          notes: string | null
          price: number | null
          rating: number | null
          recording_url: string | null
          review: string | null
          scheduled_at: string
          session_type: string | null
          status: string | null
          student_id: string
          topic: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mentor_id?: string | null
          notes?: string | null
          price?: number | null
          rating?: number | null
          recording_url?: string | null
          review?: string | null
          scheduled_at: string
          session_type?: string | null
          status?: string | null
          student_id: string
          topic?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mentor_id?: string | null
          notes?: string | null
          price?: number | null
          rating?: number | null
          recording_url?: string | null
          review?: string | null
          scheduled_at?: string
          session_type?: string | null
          status?: string | null
          student_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          duration_seconds: number | null
          gif_url: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          message_type: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          sticker_id: string | null
          video_url: string | null
          voice_url: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          duration_seconds?: number | null
          gif_url?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          sticker_id?: string | null
          video_url?: string | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          duration_seconds?: number | null
          gif_url?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          message_type?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          sticker_id?: string | null
          video_url?: string | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_sessions: {
        Row: {
          hash_rate: number | null
          id: string
          is_active: boolean | null
          session_end: string | null
          session_start: string
          tokens_earned: number | null
          user_id: string
        }
        Insert: {
          hash_rate?: number | null
          id?: string
          is_active?: boolean | null
          session_end?: string | null
          session_start?: string
          tokens_earned?: number | null
          user_id: string
        }
        Update: {
          hash_rate?: number | null
          id?: string
          is_active?: boolean | null
          session_end?: string | null
          session_start?: string
          tokens_earned?: number | null
          user_id?: string
        }
        Relationships: []
      }
      paper_portfolios: {
        Row: {
          created_at: string
          current_balance: number
          id: string
          initial_balance: number
          is_active: boolean | null
          portfolio_name: string
          total_profit_loss: number | null
          total_trades: number | null
          updated_at: string
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          portfolio_name?: string
          total_profit_loss?: number | null
          total_trades?: number | null
          updated_at?: string
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          created_at?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          portfolio_name?: string
          total_profit_loss?: number | null
          total_trades?: number | null
          updated_at?: string
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      paper_trades: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number
          exit_price: number | null
          id: string
          notes: string | null
          opened_at: string
          portfolio_id: string | null
          profit_loss: number | null
          profit_loss_percent: number | null
          quantity: number
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          portfolio_id?: string | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity: number
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          trade_type: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          portfolio_id?: string | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity?: number
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "paper_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_proofs: {
        Row: {
          created_at: string
          id: string
          image_url: string
          notes: string | null
          payment_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          notes?: string | null
          payment_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          notes?: string | null
          payment_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
      profile_challenges: {
        Row: {
          challenge_description: string
          challenge_name: string
          challenge_type: string
          created_at: string | null
          currency_reward: number | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          target_section: string | null
          target_value: number
          xp_reward: number
        }
        Insert: {
          challenge_description: string
          challenge_name: string
          challenge_type: string
          created_at?: string | null
          currency_reward?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          target_section?: string | null
          target_value: number
          xp_reward: number
        }
        Update: {
          challenge_description?: string
          challenge_name?: string
          challenge_type?: string
          created_at?: string | null
          currency_reward?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          target_section?: string | null
          target_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      profile_history: {
        Row: {
          avatar_url: string | null
          bio: string | null
          change_type: string
          changed_fields: string[] | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone_number: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          change_type?: string
          changed_fields?: string[] | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          change_type?: string
          changed_fields?: string[] | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_section_engagement: {
        Row: {
          created_at: string | null
          id: string
          interaction_count: number | null
          last_viewed_at: string | null
          profile_id: string
          section_name: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_viewed_at?: string | null
          profile_id: string
          section_name: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_count?: number | null
          last_viewed_at?: string | null
          profile_id?: string
          section_name?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_section_engagement_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          referrer: string | null
          user_agent: string | null
          viewed_at: string
          viewer_city: string | null
          viewer_continent: string | null
          viewer_country: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
          viewer_city?: string | null
          viewer_continent?: string | null
          viewer_country?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          referrer?: string | null
          user_agent?: string | null
          viewed_at?: string
          viewer_city?: string | null
          viewer_continent?: string | null
          viewer_country?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievement_streak: number | null
          activated_at: string | null
          active_title: string | null
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
          is_verified: boolean | null
          kyc_status: string | null
          kyc_verified_at: string | null
          language: string | null
          last_achievement_date: string | null
          last_login_at: string | null
          linkedin_url: string | null
          mining_level: number | null
          payment_completed: boolean | null
          payment_required: boolean | null
          payment_tier: Database["public"]["Enums"]["payment_tier"] | null
          phone_number: string | null
          profile_badge: string | null
          profile_tier: string | null
          profile_visibility: string | null
          rank_level: number | null
          show_email: boolean | null
          streak_days: number | null
          theme_accent_color: string | null
          theme_background: string | null
          theme_font: string | null
          theme_layout: string | null
          theme_preference: string | null
          timezone: string | null
          total_trades: number | null
          twitter_handle: string | null
          unlocked_titles: string[] | null
          updated_at: string
          username: string | null
          verification_badge: string | null
          virtual_currency: number | null
          website_url: string | null
          win_rate: number | null
          xp_points: number | null
        }
        Insert: {
          achievement_streak?: number | null
          activated_at?: string | null
          active_title?: string | null
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
          is_verified?: boolean | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          language?: string | null
          last_achievement_date?: string | null
          last_login_at?: string | null
          linkedin_url?: string | null
          mining_level?: number | null
          payment_completed?: boolean | null
          payment_required?: boolean | null
          payment_tier?: Database["public"]["Enums"]["payment_tier"] | null
          phone_number?: string | null
          profile_badge?: string | null
          profile_tier?: string | null
          profile_visibility?: string | null
          rank_level?: number | null
          show_email?: boolean | null
          streak_days?: number | null
          theme_accent_color?: string | null
          theme_background?: string | null
          theme_font?: string | null
          theme_layout?: string | null
          theme_preference?: string | null
          timezone?: string | null
          total_trades?: number | null
          twitter_handle?: string | null
          unlocked_titles?: string[] | null
          updated_at?: string
          username?: string | null
          verification_badge?: string | null
          virtual_currency?: number | null
          website_url?: string | null
          win_rate?: number | null
          xp_points?: number | null
        }
        Update: {
          achievement_streak?: number | null
          activated_at?: string | null
          active_title?: string | null
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
          is_verified?: boolean | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          language?: string | null
          last_achievement_date?: string | null
          last_login_at?: string | null
          linkedin_url?: string | null
          mining_level?: number | null
          payment_completed?: boolean | null
          payment_required?: boolean | null
          payment_tier?: Database["public"]["Enums"]["payment_tier"] | null
          phone_number?: string | null
          profile_badge?: string | null
          profile_tier?: string | null
          profile_visibility?: string | null
          rank_level?: number | null
          show_email?: boolean | null
          streak_days?: number | null
          theme_accent_color?: string | null
          theme_background?: string | null
          theme_font?: string | null
          theme_layout?: string | null
          theme_preference?: string | null
          timezone?: string | null
          total_trades?: number | null
          twitter_handle?: string | null
          unlocked_titles?: string[] | null
          updated_at?: string
          username?: string | null
          verification_badge?: string | null
          virtual_currency?: number | null
          website_url?: string | null
          win_rate?: number | null
          xp_points?: number | null
        }
        Relationships: []
      }
      prop_daily_stats: {
        Row: {
          created_at: string
          daily_pnl: number
          daily_pnl_percent: number
          ending_balance: number
          id: string
          prop_account_id: string
          starting_balance: number
          trade_date: string
          trades_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_pnl?: number
          daily_pnl_percent?: number
          ending_balance: number
          id?: string
          prop_account_id: string
          starting_balance: number
          trade_date?: string
          trades_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          daily_pnl?: number
          daily_pnl_percent?: number
          ending_balance?: number
          id?: string
          prop_account_id?: string
          starting_balance?: number
          trade_date?: string
          trades_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_daily_stats_prop_account_id_fkey"
            columns: ["prop_account_id"]
            isOneToOne: false
            referencedRelation: "user_prop_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_pass_history: {
        Row: {
          final_balance: number
          final_pnl_percent: number
          id: string
          passed_at: string
          prop_account_id: string
          tier_id: string
          total_trades: number
          trading_days: number
          user_id: string
          win_rate: number
        }
        Insert: {
          final_balance: number
          final_pnl_percent: number
          id?: string
          passed_at?: string
          prop_account_id: string
          tier_id: string
          total_trades?: number
          trading_days?: number
          user_id: string
          win_rate?: number
        }
        Update: {
          final_balance?: number
          final_pnl_percent?: number
          id?: string
          passed_at?: string
          prop_account_id?: string
          tier_id?: string
          total_trades?: number
          trading_days?: number
          user_id?: string
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "prop_pass_history_prop_account_id_fkey"
            columns: ["prop_account_id"]
            isOneToOne: false
            referencedRelation: "user_prop_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prop_pass_history_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "prop_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_tiers: {
        Row: {
          account_size: number
          badge_icon: string | null
          challenge_fee: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_daily_loss_percent: number
          max_total_drawdown_percent: number
          max_trading_days: number
          min_trading_days: number
          profit_split_percent: number
          profit_target_percent: number
          required_passes: number
          tier_level: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          account_size?: number
          badge_icon?: string | null
          challenge_fee?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_loss_percent?: number
          max_total_drawdown_percent?: number
          max_trading_days?: number
          min_trading_days?: number
          profit_split_percent?: number
          profit_target_percent?: number
          required_passes?: number
          tier_level?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          account_size?: number
          badge_icon?: string | null
          challenge_fee?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_loss_percent?: number
          max_total_drawdown_percent?: number
          max_trading_days?: number
          min_trading_days?: number
          profit_split_percent?: number
          profit_target_percent?: number
          required_passes?: number
          tier_level?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      prop_trades: {
        Row: {
          closed_at: string | null
          created_at: string
          entry_price: number
          exit_price: number | null
          id: string
          lot_size: number
          opened_at: string
          profit_loss: number | null
          prop_account_id: string
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          trade_type: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          entry_price: number
          exit_price?: number | null
          id?: string
          lot_size?: number
          opened_at?: string
          profit_loss?: number | null
          prop_account_id: string
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          trade_type: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          id?: string
          lot_size?: number
          opened_at?: string
          profit_loss?: number | null
          prop_account_id?: string
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          trade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_trades_prop_account_id_fkey"
            columns: ["prop_account_id"]
            isOneToOne: false
            referencedRelation: "user_prop_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          user_id: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          user_id: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          user_id?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
          status?: string
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          message_type: string | null
          metadata: Json | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trading_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          id: string
          is_banned: boolean | null
          is_muted: boolean | null
          joined_at: string
          left_at: string | null
          role: string | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_banned?: boolean | null
          is_muted?: boolean | null
          joined_at?: string
          left_at?: string | null
          role?: string | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_banned?: boolean | null
          is_muted?: boolean | null
          joined_at?: string
          left_at?: string | null
          role?: string | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "trading_rooms"
            referencedColumns: ["id"]
          },
        ]
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
      sticker_packs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_premium: boolean | null
          name: string
          price_coins: number | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name: string
          price_coins?: number | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_premium?: boolean | null
          name?: string
          price_coins?: number | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string | null
          emoji_shortcode: string | null
          id: string
          image_url: string
          name: string
          pack_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji_shortcode?: string | null
          id?: string
          image_url: string
          name: string
          pack_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji_shortcode?: string | null
          id?: string
          image_url?: string
          name?: string
          pack_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          ai_queries_per_day: number | null
          badge_color: string | null
          can_access_live_rooms: boolean | null
          can_access_mentors: boolean | null
          created_at: string
          features: Json | null
          id: string
          max_journal_entries: number | null
          max_paper_trades: number | null
          price_monthly: number
          price_yearly: number
          tier_level: number
          tier_name: string
        }
        Insert: {
          ai_queries_per_day?: number | null
          badge_color?: string | null
          can_access_live_rooms?: boolean | null
          can_access_mentors?: boolean | null
          created_at?: string
          features?: Json | null
          id?: string
          max_journal_entries?: number | null
          max_paper_trades?: number | null
          price_monthly?: number
          price_yearly?: number
          tier_level?: number
          tier_name: string
        }
        Update: {
          ai_queries_per_day?: number | null
          badge_color?: string | null
          can_access_live_rooms?: boolean | null
          can_access_mentors?: boolean | null
          created_at?: string
          features?: Json | null
          id?: string
          max_journal_entries?: number | null
          max_paper_trades?: number | null
          price_monthly?: number
          price_yearly?: number
          tier_level?: number
          tier_name?: string
        }
        Relationships: []
      }
      trading_competitions: {
        Row: {
          competition_name: string
          created_at: string
          description: string | null
          end_date: string
          entry_fee: number | null
          id: string
          max_participants: number | null
          prize_pool: number | null
          rules: Json | null
          start_date: string
          status: string
        }
        Insert: {
          competition_name: string
          created_at?: string
          description?: string | null
          end_date: string
          entry_fee?: number | null
          id?: string
          max_participants?: number | null
          prize_pool?: number | null
          rules?: Json | null
          start_date: string
          status?: string
        }
        Update: {
          competition_name?: string
          created_at?: string
          description?: string | null
          end_date?: string
          entry_fee?: number | null
          id?: string
          max_participants?: number | null
          prize_pool?: number | null
          rules?: Json | null
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      trading_journal: {
        Row: {
          ai_analysis: string | null
          ai_suggestions: Json | null
          created_at: string
          emotional_state: string | null
          entry_date: string
          goals_for_tomorrow: string | null
          id: string
          lessons_learned: string | null
          market_sentiment: string | null
          post_market_notes: string | null
          pre_market_notes: string | null
          screenshots: string[] | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_suggestions?: Json | null
          created_at?: string
          emotional_state?: string | null
          entry_date?: string
          goals_for_tomorrow?: string | null
          id?: string
          lessons_learned?: string | null
          market_sentiment?: string | null
          post_market_notes?: string | null
          pre_market_notes?: string | null
          screenshots?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_suggestions?: Json | null
          created_at?: string
          emotional_state?: string | null
          entry_date?: string
          goals_for_tomorrow?: string | null
          id?: string
          lessons_learned?: string | null
          market_sentiment?: string | null
          post_market_notes?: string | null
          pre_market_notes?: string | null
          screenshots?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_rooms: {
        Row: {
          created_at: string
          current_participants: number | null
          host_id: string
          id: string
          is_live: boolean | null
          max_participants: number | null
          required_tier: number | null
          room_description: string | null
          room_name: string
          room_type: string | null
          scheduled_start: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_participants?: number | null
          host_id: string
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          required_tier?: number | null
          room_description?: string | null
          room_name: string
          room_type?: string | null
          scheduled_start?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_participants?: number | null
          host_id?: string
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          required_tier?: number | null
          room_description?: string | null
          room_name?: string
          room_type?: string | null
          scheduled_start?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
      user_battle_pass: {
        Row: {
          battle_pass_id: string | null
          claimed_rewards: string[] | null
          created_at: string
          current_level: number | null
          current_xp: number | null
          id: string
          is_premium: boolean | null
          purchased_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          battle_pass_id?: string | null
          claimed_rewards?: string[] | null
          created_at?: string
          current_level?: number | null
          current_xp?: number | null
          id?: string
          is_premium?: boolean | null
          purchased_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          battle_pass_id?: string | null
          claimed_rewards?: string[] | null
          created_at?: string
          current_level?: number | null
          current_xp?: number | null
          id?: string
          is_premium?: boolean | null
          purchased_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_battle_pass_battle_pass_id_fkey"
            columns: ["battle_pass_id"]
            isOneToOne: false
            referencedRelation: "battle_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number | null
          id: string
          is_completed: boolean | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number | null
          id?: string
          is_completed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "achievement_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collectibles: {
        Row: {
          acquired_at: string
          collectible_id: string
          id: string
          is_equipped: boolean | null
          serial_number: number | null
          user_id: string
        }
        Insert: {
          acquired_at?: string
          collectible_id: string
          id?: string
          is_equipped?: boolean | null
          serial_number?: number | null
          user_id: string
        }
        Update: {
          acquired_at?: string
          collectible_id?: string
          id?: string
          is_equipped?: boolean | null
          serial_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collectibles_collectible_id_fkey"
            columns: ["collectible_id"]
            isOneToOne: false
            referencedRelation: "collectibles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_combos: {
        Row: {
          combo_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          combo_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          combo_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_combos_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "achievement_combos"
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
      user_milestones: {
        Row: {
          id: string
          milestone_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          milestone_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          milestone_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_milestones_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "achievement_milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prop_accounts: {
        Row: {
          access_code: string
          account_balance: number
          assigned_by: string | null
          created_at: string
          current_equity: number
          failed_at: string | null
          highest_balance: number
          id: string
          losing_trades: number
          max_daily_loss_hit: boolean | null
          max_drawdown_hit: boolean | null
          passed_at: string | null
          phase: string
          profit_target_hit: boolean | null
          starting_balance: number
          status: string
          tier_id: string
          total_pnl: number
          total_trades: number
          trading_days: number
          updated_at: string
          user_id: string
          winning_trades: number
        }
        Insert: {
          access_code: string
          account_balance?: number
          assigned_by?: string | null
          created_at?: string
          current_equity?: number
          failed_at?: string | null
          highest_balance?: number
          id?: string
          losing_trades?: number
          max_daily_loss_hit?: boolean | null
          max_drawdown_hit?: boolean | null
          passed_at?: string | null
          phase?: string
          profit_target_hit?: boolean | null
          starting_balance?: number
          status?: string
          tier_id: string
          total_pnl?: number
          total_trades?: number
          trading_days?: number
          updated_at?: string
          user_id: string
          winning_trades?: number
        }
        Update: {
          access_code?: string
          account_balance?: number
          assigned_by?: string | null
          created_at?: string
          current_equity?: number
          failed_at?: string | null
          highest_balance?: number
          id?: string
          losing_trades?: number
          max_daily_loss_hit?: boolean | null
          max_drawdown_hit?: boolean | null
          passed_at?: string | null
          phase?: string
          profit_target_hit?: boolean | null
          starting_balance?: number
          status?: string
          tier_id?: string
          total_pnl?: number
          total_trades?: number
          trading_days?: number
          updated_at?: string
          user_id?: string
          winning_trades?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_prop_accounts_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "prop_tiers"
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
      user_sticker_packs: {
        Row: {
          id: string
          pack_id: string | null
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          pack_id?: string | null
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          pack_id?: string | null
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sticker_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string | null
          created_at: string
          expires_at: string | null
          id: string
          started_at: string
          status: string
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
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
      profile_analytics_summary: {
        Row: {
          countries_count: number | null
          last_viewed_at: string | null
          profile_id: string | null
          total_views: number | null
          unique_visitors: number | null
          views_last_30_days: number | null
          views_last_7_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      app_role:
        | "student"
        | "investor"
        | "admin"
        | "moderator"
        | "super_admin"
        | "editor"
        | "customer_support"
        | "finance"
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
      app_role: [
        "student",
        "investor",
        "admin",
        "moderator",
        "super_admin",
        "editor",
        "customer_support",
        "finance",
      ],
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
