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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answer_reports: {
        Row: {
          cell_index: number | null
          created_at: string
          grid_id: string | null
          guess: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: string
        }
        Insert: {
          cell_index?: number | null
          created_at?: string
          grid_id?: string | null
          guess?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: string
        }
        Update: {
          cell_index?: number | null
          created_at?: string
          grid_id?: string | null
          guess?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_reports_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          active: boolean
          aliases: string[]
          country_code: string | null
          id: string
          name: string
          sport_id: string
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          country_code?: string | null
          id?: string
          name: string
          sport_id: string
        }
        Update: {
          active?: boolean
          aliases?: string[]
          country_code?: string | null
          id?: string
          name?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      clue_attempts: {
        Row: {
          clues_revealed: number
          completed_at: string | null
          created_at: string
          guesses: Json
          id: string
          puzzle_id: string
          score: number
          solved: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          clues_revealed?: number
          completed_at?: string | null
          created_at?: string
          guesses?: Json
          id?: string
          puzzle_id: string
          score?: number
          solved?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          clues_revealed?: number
          completed_at?: string | null
          created_at?: string
          guesses?: Json
          id?: string
          puzzle_id?: string
          score?: number
          solved?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clue_attempts_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "clue_puzzles"
            referencedColumns: ["id"]
          },
        ]
      }
      clue_puzzles: {
        Row: {
          answer_athlete_id: string
          archive_enabled: boolean
          clues_i18n: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          scheduled_for: string | null
          sport_id: string
          updated_at: string
        }
        Insert: {
          answer_athlete_id: string
          archive_enabled?: boolean
          clues_i18n: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          sport_id: string
          updated_at?: string
        }
        Update: {
          answer_athlete_id?: string
          archive_enabled?: boolean
          clues_i18n?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          scheduled_for?: string | null
          sport_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clue_puzzles_answer_athlete_id_fkey"
            columns: ["answer_athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clue_puzzles_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          criteria_type: string
          enabled: boolean
          id: string
          label: string
          label_i18n: Json
          sport_id: string
        }
        Insert: {
          criteria_type?: string
          enabled?: boolean
          id?: string
          label: string
          label_i18n?: Json
          sport_id: string
        }
        Update: {
          criteria_type?: string
          enabled?: boolean
          id?: string
          label?: string
          label_i18n?: Json
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "criteria_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          active: boolean
          granted_at: string
          key: Database["public"]["Enums"]["entitlement_key"]
          user_id: string
        }
        Insert: {
          active?: boolean
          granted_at?: string
          key: Database["public"]["Enums"]["entitlement_key"]
          user_id: string
        }
        Update: {
          active?: boolean
          granted_at?: string
          key?: Database["public"]["Enums"]["entitlement_key"]
          user_id?: string
        }
        Relationships: []
      }
      game_moves: {
        Row: {
          accepted: boolean
          athlete_id: string | null
          cell_index: number
          created_at: string
          game_id: string
          guess: string
          id: number
          player_id: string
        }
        Insert: {
          accepted: boolean
          athlete_id?: string | null
          cell_index: number
          created_at?: string
          game_id: string
          guess: string
          id?: never
          player_id: string
        }
        Update: {
          accepted?: boolean
          athlete_id?: string | null
          cell_index?: number
          created_at?: string
          game_id?: string
          guess?: string
          id?: never
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_moves_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_moves_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          completed_at: string | null
          grid_id: string
          id: string
          mode: string
          player_one: string
          room_id: string | null
          score: number
          started_at: string
          status: Database["public"]["Enums"]["game_status"]
        }
        Insert: {
          completed_at?: string | null
          grid_id: string
          id?: string
          mode?: string
          player_one: string
          room_id?: string | null
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["game_status"]
        }
        Update: {
          completed_at?: string | null
          grid_id?: string
          id?: string
          mode?: string
          player_one?: string
          room_id?: string | null
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["game_status"]
        }
        Relationships: [
          {
            foreignKeyName: "games_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_answers: {
        Row: {
          athlete_id: string
          cell_index: number
          grid_id: string
          rarity_score: number | null
        }
        Insert: {
          athlete_id: string
          cell_index: number
          grid_id: string
          rarity_score?: number | null
        }
        Update: {
          athlete_id?: string
          cell_index?: number
          grid_id?: string
          rarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grid_answers_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_answers_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
        ]
      }
      grids: {
        Row: {
          column_criteria: string[]
          created_at: string
          created_by: string | null
          difficulty: number
          id: string
          published_at: string | null
          row_criteria: string[]
          scheduled_for: string | null
          sport_id: string
        }
        Insert: {
          column_criteria: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          id?: string
          published_at?: string | null
          row_criteria: string[]
          scheduled_for?: string | null
          sport_id: string
        }
        Update: {
          column_criteria?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          id?: string
          published_at?: string | null
          row_criteria?: string[]
          scheduled_for?: string | null
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grids_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          best_score: number
          played: number
          rating: number
          season: string
          sport_id: string
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_score?: number
          played?: number
          rating?: number
          season?: string
          sport_id: string
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_score?: number
          played?: number
          rating?: number
          season?: string
          sport_id?: string
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          preferred_sports: string[]
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          preferred_sports?: string[]
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          preferred_sports?: string[]
        }
        Relationships: []
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          grid_id: string
          host_id: string
          id: string
          visibility: Database["public"]["Enums"]["match_visibility"]
        }
        Insert: {
          code: string
          created_at?: string
          grid_id: string
          host_id: string
          id?: string
          visibility?: Database["public"]["Enums"]["match_visibility"]
        }
        Update: {
          code?: string
          created_at?: string
          grid_id?: string
          host_id?: string
          id?: string
          visibility?: Database["public"]["Enums"]["match_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          accent: string
          enabled: boolean
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          accent?: string
          enabled?: boolean
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          accent?: string
          enabled?: boolean
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      fz_check_answer: {
        Args: { p_cell: number; p_grid: string; p_guess: string }
        Returns: {
          accepted: boolean
          athlete_id: string
          athlete_name: string
        }[]
      }
      fz_clue_guess: {
        Args: { p_guess: string; p_puzzle: string }
        Returns: Json
      }
      fz_clue_today: {
        Args: { p_sport: string }
        Returns: {
          clues: string[]
          puzzle_id: string
          scheduled_for: string
          sport_name: string
        }[]
      }
      fz_create_room: {
        Args: {
          p_grid: string
          p_visibility?: Database["public"]["Enums"]["match_visibility"]
        }
        Returns: Json
      }
      fz_norm: { Args: { t: string }; Returns: string }
      fz_play_move: {
        Args: {
          p_cell: number
          p_grid: string
          p_guess: string
          p_room?: string
        }
        Returns: Json
      }
      fz_reveal: {
        Args: { p_grid: string }
        Returns: {
          answers: string[]
          cell_index: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "player" | "moderator" | "content_editor" | "admin" | "owner"
      entitlement_key: "ad_free_lifetime"
      game_status: "waiting" | "active" | "completed" | "abandoned"
      match_visibility: "public" | "friends" | "private"
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
      app_role: ["player", "moderator", "content_editor", "admin", "owner"],
      entitlement_key: ["ad_free_lifetime"],
      game_status: ["waiting", "active", "completed", "abandoned"],
      match_visibility: ["public", "friends", "private"],
    },
  },
} as const
