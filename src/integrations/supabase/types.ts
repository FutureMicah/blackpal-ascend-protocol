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
          activated_at: string | null
          avatar_url: string | null
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
          website_url: string | null
          xp_points: number | null
        }
        Insert: {
          activated_at?: string | null
          avatar_url?: string | null
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
          website_url?: string | null
          xp_points?: number | null
        }
        Update: {
          activated_at?: string | null
          avatar_url?: string | null
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
          website_url?: string | null
          xp_points?: number | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
