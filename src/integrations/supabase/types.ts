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
      answer_import_jobs: {
        Row: {
          competition_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_summary: Json
          id: string
          records_accepted: number
          records_rejected: number
          records_seen: number
          source_id: string | null
          sport_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          competition_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: Json
          id?: string
          records_accepted?: number
          records_rejected?: number
          records_seen?: number
          source_id?: string | null
          sport_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          competition_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: Json
          id?: string
          records_accepted?: number
          records_rejected?: number
          records_seen?: number
          source_id?: string | null
          sport_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_import_jobs_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_import_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_import_jobs_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "grid_quality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_reports_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_aliases: {
        Row: {
          alias: string
          alias_type: string
          athlete_id: string
          id: number
          locale: string | null
          normalized_alias: string
        }
        Insert: {
          alias: string
          alias_type?: string
          athlete_id: string
          id?: never
          locale?: string | null
          normalized_alias: string
        }
        Update: {
          alias?: string
          alias_type?: string
          athlete_id?: string
          id?: never
          locale?: string | null
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_aliases_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_evidence: {
        Row: {
          athlete_id: string
          claim_key: string
          claim_type: string
          evidence: Json
          id: string
          observed_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          source_record_id: string | null
          source_url: string | null
        }
        Insert: {
          athlete_id: string
          claim_key: string
          claim_type: string
          evidence?: Json
          id?: string
          observed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          source_record_id?: string | null
          source_url?: string | null
        }
        Update: {
          athlete_id?: string
          claim_key?: string
          claim_type?: string
          evidence?: Json
          id?: string
          observed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          source_record_id?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_evidence_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_evidence_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
          normalized_name: string | null
          sport_id: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          active?: boolean
          aliases?: string[]
          country_code?: string | null
          id?: string
          name: string
          normalized_name?: string | null
          sport_id: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          active?: boolean
          aliases?: string[]
          country_code?: string | null
          id?: string
          name?: string
          normalized_name?: string | null
          sport_id?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
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
          competition_ids: string[]
          created_at: string
          created_by: string | null
          era_end: number | null
          era_start: number | null
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
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          era_end?: number | null
          era_start?: number | null
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
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          era_end?: number | null
          era_start?: number | null
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
      competitions: {
        Row: {
          active: boolean
          competition_type: string
          country_code: string | null
          gender: string
          governing_body: string | null
          id: string
          metadata: Json
          name: string
          name_i18n: Json
          region: string | null
          short_name: string | null
          slug: string
          sort_order: number
          sport_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          competition_type: string
          country_code?: string | null
          gender?: string
          governing_body?: string | null
          id?: string
          metadata?: Json
          name: string
          name_i18n?: Json
          region?: string | null
          short_name?: string | null
          slug: string
          sort_order?: number
          sport_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          competition_type?: string
          country_code?: string | null
          gender?: string
          governing_body?: string | null
          id?: string
          metadata?: Json
          name?: string
          name_i18n?: Json
          region?: string | null
          short_name?: string | null
          slug?: string
          sort_order?: number
          sport_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitions_sport_id_fkey"
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
      data_sources: {
        Row: {
          active: boolean
          base_url: string | null
          id: string
          licence_notes: string | null
          name: string
          source_type: string
        }
        Insert: {
          active?: boolean
          base_url?: string | null
          id?: string
          licence_notes?: string | null
          name: string
          source_type: string
        }
        Update: {
          active?: boolean
          base_url?: string | null
          id?: string
          licence_notes?: string | null
          name?: string
          source_type?: string
        }
        Relationships: []
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
      game_modes: {
        Row: {
          board_config: Json
          description: string
          enabled: boolean
          max_players: number
          min_players: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          board_config: Json
          description: string
          enabled?: boolean
          max_players: number
          min_players: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          board_config?: Json
          description?: string
          enabled?: boolean
          max_players?: number
          min_players?: number
          name?: string
          slug?: string
          sort_order?: number
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
          consecutive_passes: number
          draw_offered_by: string | null
          end_reason: string | null
          grid_id: string
          id: string
          mode: string
          outcome: string | null
          player_one: string
          player_two: string | null
          rematch_of: string | null
          room_id: string | null
          score: number
          settings: Json
          started_at: string
          status: Database["public"]["Enums"]["game_status"]
        }
        Insert: {
          completed_at?: string | null
          consecutive_passes?: number
          draw_offered_by?: string | null
          end_reason?: string | null
          grid_id: string
          id?: string
          mode?: string
          outcome?: string | null
          player_one: string
          player_two?: string | null
          rematch_of?: string | null
          room_id?: string | null
          score?: number
          settings?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["game_status"]
        }
        Update: {
          completed_at?: string | null
          consecutive_passes?: number
          draw_offered_by?: string | null
          end_reason?: string | null
          grid_id?: string
          id?: string
          mode?: string
          outcome?: string | null
          player_one?: string
          player_two?: string | null
          rematch_of?: string | null
          room_id?: string | null
          score?: number
          settings?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["game_status"]
        }
        Relationships: [
          {
            foreignKeyName: "games_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grid_quality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_rematch_of_fkey"
            columns: ["rematch_of"]
            isOneToOne: false
            referencedRelation: "games"
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
          evidence_count: number
          grid_id: string
          rarity_score: number | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          athlete_id: string
          cell_index: number
          evidence_count?: number
          grid_id: string
          rarity_score?: number | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          athlete_id?: string
          cell_index?: number
          evidence_count?: number
          grid_id?: string
          rarity_score?: number | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
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
            referencedRelation: "grid_quality"
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
          competition_ids: string[]
          created_at: string
          created_by: string | null
          difficulty: number
          era_end: number | null
          era_start: number | null
          id: string
          published_at: string | null
          row_criteria: string[]
          scheduled_for: string | null
          sport_id: string
          validated_at: string | null
        }
        Insert: {
          column_criteria: string[]
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          era_end?: number | null
          era_start?: number | null
          id?: string
          published_at?: string | null
          row_criteria: string[]
          scheduled_for?: string | null
          sport_id: string
          validated_at?: string | null
        }
        Update: {
          column_criteria?: string[]
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          era_end?: number | null
          era_start?: number | null
          id?: string
          published_at?: string | null
          row_criteria?: string[]
          scheduled_for?: string | null
          sport_id?: string
          validated_at?: string | null
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
      historical_seasons: {
        Row: {
          competition_id: string
          ends_on: string | null
          format: Json
          id: string
          season_label: string
          starts_on: string | null
          verification_status: string
        }
        Insert: {
          competition_id: string
          ends_on?: string | null
          format?: Json
          id?: string
          season_label: string
          starts_on?: string | null
          verification_status?: string
        }
        Update: {
          competition_id?: string
          ends_on?: string | null
          format?: Json
          id?: string
          season_label?: string
          starts_on?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_seasons_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          game_id: string
          game_version: number
          id: number
          payload: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          game_id: string
          game_version: number
          id?: never
          payload?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          game_id?: string
          game_version?: number
          id?: never
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      olympic_events: {
        Row: {
          event_name: string
          event_name_i18n: Json
          games_id: string
          gender: string
          id: string
          sport_id: string
        }
        Insert: {
          event_name: string
          event_name_i18n?: Json
          games_id: string
          gender: string
          id?: string
          sport_id: string
        }
        Update: {
          event_name?: string
          event_name_i18n?: Json
          games_id?: string
          gender?: string
          id?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "olympic_events_games_id_fkey"
            columns: ["games_id"]
            isOneToOne: false
            referencedRelation: "olympic_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olympic_events_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      olympic_games: {
        Row: {
          ends_on: string | null
          host_city: string
          host_country_code: string | null
          id: string
          season: string
          starts_on: string | null
          year: number
        }
        Insert: {
          ends_on?: string | null
          host_city: string
          host_country_code?: string | null
          id?: string
          season: string
          starts_on?: string | null
          year: number
        }
        Update: {
          ends_on?: string | null
          host_city?: string
          host_country_code?: string | null
          id?: string
          season?: string
          starts_on?: string | null
          year?: number
        }
        Relationships: []
      }
      olympic_medals: {
        Row: {
          athlete_id: string | null
          event_id: string
          id: string
          medal: string
          nation_code: string
          source_id: string | null
          source_record_id: string | null
          team_name: string | null
          verification_status: string
        }
        Insert: {
          athlete_id?: string | null
          event_id: string
          id?: string
          medal: string
          nation_code: string
          source_id?: string | null
          source_record_id?: string | null
          team_name?: string | null
          verification_status?: string
        }
        Update: {
          athlete_id?: string | null
          event_id?: string
          id?: string
          medal?: string
          nation_code?: string
          source_id?: string | null
          source_record_id?: string | null
          team_name?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "olympic_medals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olympic_medals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "olympic_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "olympic_medals_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
          quiz_preferences: Json
        }
        Insert: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          preferred_sports?: string[]
          quiz_preferences?: Json
        }
        Update: {
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          preferred_sports?: string[]
          quiz_preferences?: Json
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
            referencedRelation: "grid_quality"
            referencedColumns: ["id"]
          },
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
          governing_body: string | null
          historical_from: string
          id: string
          metadata: Json
          name: string
          olympic_classification: string | null
          parent_sport_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          accent?: string
          enabled?: boolean
          governing_body?: string | null
          historical_from?: string
          id?: string
          metadata?: Json
          name: string
          olympic_classification?: string | null
          parent_sport_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          accent?: string
          enabled?: boolean
          governing_body?: string | null
          historical_from?: string
          id?: string
          metadata?: Json
          name?: string
          olympic_classification?: string | null
          parent_sport_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sports_parent_sport_id_fkey"
            columns: ["parent_sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
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
      grid_quality: {
        Row: {
          competition_ids: string[] | null
          id: string | null
          published_at: string | null
          scheduled_for: string | null
          sport_id: string | null
          unverified_answers: number | null
          verified_answers: number | null
          verified_cells: number | null
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
      search_athletes: {
        Args: { p_limit?: number; p_query: string; p_sport_id?: string }
        Returns: {
          aliases: string[]
          country_code: string
          id: string
          name: string
          score: number
          verified: boolean
        }[]
      }
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
