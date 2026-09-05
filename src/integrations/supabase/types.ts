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
      ad_events: {
        Row: {
          ad_unit_id: string
          currency: string | null
          event_type: string
          id: number
          network: string | null
          occurred_at: string
          placement: string
          profile_id: string | null
          revenue_micros: number | null
          session_id: string | null
        }
        Insert: {
          ad_unit_id: string
          currency?: string | null
          event_type: string
          id?: never
          network?: string | null
          occurred_at?: string
          placement: string
          profile_id?: string | null
          revenue_micros?: number | null
          session_id?: string | null
        }
        Update: {
          ad_unit_id?: string
          currency?: string | null
          event_type?: string
          id?: never
          network?: string | null
          occurred_at?: string
          placement?: string
          profile_id?: string | null
          revenue_micros?: number | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_challenges: {
        Row: {
          created_at: string
          id: string
          normalised_answer: string
          occurrence_count: number
          question_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          status: string
          submitted_answer: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalised_answer: string
          occurrence_count?: number
          question_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_answer: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalised_answer?: string
          occurrence_count?: number
          question_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_answer?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_challenges_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
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
      arcade_matchmaking_queue: {
        Row: {
          category_key: string | null
          difficulty: number
          joined_at: string
          matched_room_id: string | null
          mode_slug: string
          sport_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_key?: string | null
          difficulty: number
          joined_at?: string
          matched_room_id?: string | null
          mode_slug: string
          sport_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_key?: string | null
          difficulty?: number
          joined_at?: string
          matched_room_id?: string | null
          mode_slug?: string
          sport_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_matchmaking_queue_matched_room_id_fkey"
            columns: ["matched_room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arcade_matchmaking_queue_mode_slug_fkey"
            columns: ["mode_slug"]
            isOneToOne: false
            referencedRelation: "game_modes"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "arcade_matchmaking_queue_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_presence: {
        Row: {
          connection_id: string
          device_id: string | null
          last_seen_at: string
          room_id: string
          status: string
          user_id: string
        }
        Insert: {
          connection_id: string
          device_id?: string | null
          last_seen_at?: string
          room_id: string
          status?: string
          user_id: string
        }
        Update: {
          connection_id?: string
          device_id?: string | null
          last_seen_at?: string
          room_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_questions: {
        Row: {
          active_user_id: string
          answer_display_i18n: Json
          clue_i18n: Json
          competition_id: string | null
          expires_at: string | null
          id: string
          issued_at: string
          prompt_i18n: Json
          question_id: string | null
          revealed_answer: boolean
          revealed_clue: boolean
          room_id: string
          sport_id: string | null
          turn_no: number
        }
        Insert: {
          active_user_id: string
          answer_display_i18n: Json
          clue_i18n?: Json
          competition_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          prompt_i18n: Json
          question_id?: string | null
          revealed_answer?: boolean
          revealed_clue?: boolean
          room_id: string
          sport_id?: string | null
          turn_no: number
        }
        Update: {
          active_user_id?: string
          answer_display_i18n?: Json
          clue_i18n?: Json
          competition_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          prompt_i18n?: Json
          question_id?: string | null
          revealed_answer?: boolean
          revealed_clue?: boolean
          room_id?: string
          sport_id?: string | null
          turn_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "arcade_questions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arcade_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arcade_questions_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_room_players: {
        Row: {
          category_key: string | null
          competition_id: string | null
          correct_answers: number
          display_name: string
          last_seen_at: string
          passes: number
          points: number
          position: number
          room_id: string
          seat: number
          settings: Json
          sport_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          category_key?: string | null
          competition_id?: string | null
          correct_answers?: number
          display_name: string
          last_seen_at?: string
          passes?: number
          points?: number
          position?: number
          room_id: string
          seat: number
          settings?: Json
          sport_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          category_key?: string | null
          competition_id?: string | null
          correct_answers?: number
          display_name?: string
          last_seen_at?: string
          passes?: number
          points?: number
          position?: number
          room_id?: string
          seat?: number
          settings?: Json
          sport_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_room_players_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arcade_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arcade_room_players_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_rooms: {
        Row: {
          active_seat: number | null
          code: string
          created_at: string
          difficulty: number
          host_id: string
          id: string
          mode_slug: string
          round_no: number
          settings: Json
          status: string
          turn_ends_at: string | null
          turn_started_at: string | null
          version: number
          visibility: Database["public"]["Enums"]["match_visibility"]
        }
        Insert: {
          active_seat?: number | null
          code: string
          created_at?: string
          difficulty: number
          host_id: string
          id?: string
          mode_slug: string
          round_no?: number
          settings?: Json
          status?: string
          turn_ends_at?: string | null
          turn_started_at?: string | null
          version?: number
          visibility?: Database["public"]["Enums"]["match_visibility"]
        }
        Update: {
          active_seat?: number | null
          code?: string
          created_at?: string
          difficulty?: number
          host_id?: string
          id?: string
          mode_slug?: string
          round_no?: number
          settings?: Json
          status?: string
          turn_ends_at?: string | null
          turn_started_at?: string | null
          version?: number
          visibility?: Database["public"]["Enums"]["match_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "arcade_rooms_mode_slug_fkey"
            columns: ["mode_slug"]
            isOneToOne: false
            referencedRelation: "game_modes"
            referencedColumns: ["slug"]
          },
        ]
      }
      arcade_submissions: {
        Row: {
          action: string
          answer_text: string | null
          awarded_points: number
          confirmed_transcript: string | null
          correct: boolean | null
          id: string
          input_method: string
          locale: string | null
          movement: number
          question_id: string
          submitted_at: string
          transcript_confidence: number | null
          user_id: string
        }
        Insert: {
          action: string
          answer_text?: string | null
          awarded_points?: number
          confirmed_transcript?: string | null
          correct?: boolean | null
          id?: string
          input_method?: string
          locale?: string | null
          movement?: number
          question_id: string
          submitted_at?: string
          transcript_confidence?: number | null
          user_id: string
        }
        Update: {
          action?: string
          answer_text?: string | null
          awarded_points?: number
          confirmed_transcript?: string | null
          correct?: boolean | null
          id?: string
          input_method?: string
          locale?: string | null
          movement?: number
          question_id?: string
          submitted_at?: string
          transcript_confidence?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arcade_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arcade_questions"
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
      athlete_criteria: {
        Row: {
          athlete_id: string
          competition_id: string | null
          criterion_id: string
          evidence_url: string | null
          source_id: string
          valid_from: string | null
          valid_to: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          athlete_id: string
          competition_id?: string | null
          criterion_id: string
          evidence_url?: string | null
          source_id: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          athlete_id?: string
          competition_id?: string | null
          criterion_id?: string
          evidence_url?: string | null
          source_id?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_criteria_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_criteria_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_criteria_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_criteria_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
      athlete_honours: {
        Row: {
          athlete_id: string
          honour_id: string
          result: string
          source_id: string | null
          team_name: string | null
          verification_status: string
          year: number
        }
        Insert: {
          athlete_id: string
          honour_id: string
          result?: string
          source_id?: string | null
          team_name?: string | null
          verification_status?: string
          year: number
        }
        Update: {
          athlete_id?: string
          honour_id?: string
          result?: string
          source_id?: string | null
          team_name?: string | null
          verification_status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "athlete_honours_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_honours_honour_id_fkey"
            columns: ["honour_id"]
            isOneToOne: false
            referencedRelation: "honours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_honours_source_id_fkey"
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
      avatar_presets: {
        Row: {
          accent: string
          access_tier: string
          active: boolean
          asset_key: string
          display_name: string
          id: string
          sort_order: number
        }
        Insert: {
          accent: string
          access_tier?: string
          active?: boolean
          asset_key: string
          display_name: string
          id: string
          sort_order?: number
        }
        Update: {
          accent?: string
          access_tier?: string
          active?: boolean
          asset_key?: string
          display_name?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
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
          category_key: string | null
          category_label: string | null
          competition_type: string
          country_code: string | null
          format_key: string | null
          gender: string
          governing_body: string | null
          id: string
          level_key: string | null
          lineage_key: string | null
          metadata: Json
          name: string
          name_i18n: Json
          parent_competition_id: string | null
          predecessor_id: string | null
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
          category_key?: string | null
          category_label?: string | null
          competition_type: string
          country_code?: string | null
          format_key?: string | null
          gender?: string
          governing_body?: string | null
          id?: string
          level_key?: string | null
          lineage_key?: string | null
          metadata?: Json
          name: string
          name_i18n?: Json
          parent_competition_id?: string | null
          predecessor_id?: string | null
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
          category_key?: string | null
          category_label?: string | null
          competition_type?: string
          country_code?: string | null
          format_key?: string | null
          gender?: string
          governing_body?: string | null
          id?: string
          level_key?: string | null
          lineage_key?: string | null
          metadata?: Json
          name?: string
          name_i18n?: Json
          parent_competition_id?: string | null
          predecessor_id?: string | null
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
            foreignKeyName: "competitions_parent_competition_id_fkey"
            columns: ["parent_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
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
      data_coverage: {
        Row: {
          athletes: number
          competition_id: string | null
          facts: number
          id: string
          refreshed_at: string | null
          season_from: number | null
          season_to: number | null
          sport_id: string
          status: string
          verified_facts: number
        }
        Insert: {
          athletes?: number
          competition_id?: string | null
          facts?: number
          id?: string
          refreshed_at?: string | null
          season_from?: number | null
          season_to?: number | null
          sport_id: string
          status?: string
          verified_facts?: number
        }
        Update: {
          athletes?: number
          competition_id?: string | null
          facts?: number
          id?: string
          refreshed_at?: string | null
          season_from?: number | null
          season_to?: number | null
          sport_id?: string
          status?: string
          verified_facts?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_coverage_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_coverage_sport_id_fkey"
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
          grant_reason: string | null
          granted_at: string
          granted_by: string | null
          key: Database["public"]["Enums"]["entitlement_key"]
          lifetime: boolean
          revoked_at: string | null
          source_purchase_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          active?: boolean
          grant_reason?: string | null
          granted_at?: string
          granted_by?: string | null
          key: Database["public"]["Enums"]["entitlement_key"]
          lifetime?: boolean
          revoked_at?: string | null
          source_purchase_id?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          active?: boolean
          grant_reason?: string | null
          granted_at?: string
          granted_by?: string | null
          key?: Database["public"]["Enums"]["entitlement_key"]
          lifetime?: boolean
          revoked_at?: string | null
          source_purchase_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_source_purchase_id_fkey"
            columns: ["source_purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      game_modes: {
        Row: {
          access_tier: string
          board_config: Json
          description: string
          enabled: boolean
          guest_join_allowed: boolean
          max_players: number
          min_players: number
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          access_tier?: string
          board_config: Json
          description: string
          enabled?: boolean
          guest_join_allowed?: boolean
          max_players: number
          min_players: number
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          access_tier?: string
          board_config?: Json
          description?: string
          enabled?: boolean
          guest_join_allowed?: boolean
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
          difficulty_points: number
          game_id: string
          guess: string
          id: number
          player_id: string
          rarity_bonus: number
          speed_bonus: number
          total_points: number | null
        }
        Insert: {
          accepted: boolean
          athlete_id?: string | null
          cell_index: number
          created_at?: string
          difficulty_points?: number
          game_id: string
          guess: string
          id?: never
          player_id: string
          rarity_bonus?: number
          speed_bonus?: number
          total_points?: number | null
        }
        Update: {
          accepted?: boolean
          athlete_id?: string | null
          cell_index?: number
          created_at?: string
          difficulty_points?: number
          game_id?: string
          guess?: string
          id?: never
          player_id?: string
          rarity_bonus?: number
          speed_bonus?: number
          total_points?: number | null
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
          points: number
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
          points?: number
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
          points?: number
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
      grid_exposures: {
        Row: {
          completed_at: string | null
          grid_id: string
          profile_id: string
          score: number | null
          shown_at: string
        }
        Insert: {
          completed_at?: string | null
          grid_id: string
          profile_id: string
          score?: number | null
          shown_at?: string
        }
        Update: {
          completed_at?: string | null
          grid_id?: string
          profile_id?: string
          score?: number | null
          shown_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grid_exposures_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grid_quality"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_exposures_grid_id_fkey"
            columns: ["grid_id"]
            isOneToOne: false
            referencedRelation: "grids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_exposures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grids: {
        Row: {
          answer_count: number
          column_criteria: string[]
          competition_ids: string[]
          created_at: string
          created_by: string | null
          difficulty: number
          era_end: number | null
          era_start: number | null
          generated: boolean
          generation_fingerprint: string | null
          id: string
          published_at: string | null
          row_criteria: string[]
          scheduled_for: string | null
          scope_path: string[]
          sport_id: string
          validated_at: string | null
        }
        Insert: {
          answer_count?: number
          column_criteria: string[]
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          era_end?: number | null
          era_start?: number | null
          generated?: boolean
          generation_fingerprint?: string | null
          id?: string
          published_at?: string | null
          row_criteria: string[]
          scheduled_for?: string | null
          scope_path?: string[]
          sport_id: string
          validated_at?: string | null
        }
        Update: {
          answer_count?: number
          column_criteria?: string[]
          competition_ids?: string[]
          created_at?: string
          created_by?: string | null
          difficulty?: number
          era_end?: number | null
          era_start?: number | null
          generated?: boolean
          generation_fingerprint?: string | null
          id?: string
          published_at?: string | null
          row_criteria?: string[]
          scheduled_for?: string | null
          scope_path?: string[]
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
      honours: {
        Row: {
          governing_body: string | null
          honour_type: string
          id: string
          metadata: Json
          name: string
          slug: string
          sport_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          governing_body?: string | null
          honour_type: string
          id?: string
          metadata?: Json
          name: string
          slug: string
          sport_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          governing_body?: string | null
          honour_type?: string
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          sport_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "honours_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_cursors: {
        Row: {
          checkpoint: Json
          cursor_value: string | null
          last_success_at: string | null
          source_id: string
          stream: string
          updated_at: string
        }
        Insert: {
          checkpoint?: Json
          cursor_value?: string | null
          last_success_at?: string | null
          source_id: string
          stream: string
          updated_at?: string
        }
        Update: {
          checkpoint?: Json
          cursor_value?: string | null
          last_success_at?: string | null
          source_id?: string
          stream?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_cursors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
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
      monthly_competition_scores: {
        Row: {
          competition_id: string
          integrity_status: string
          tie_break_ms: number
          updated_at: string
          user_id: string
          verified_games: number
          verified_points: number
          verified_wins: number
        }
        Insert: {
          competition_id: string
          integrity_status?: string
          tie_break_ms?: number
          updated_at?: string
          user_id: string
          verified_games?: number
          verified_points?: number
          verified_wins?: number
        }
        Update: {
          competition_id?: string
          integrity_status?: string
          tie_break_ms?: number
          updated_at?: string
          user_id?: string
          verified_games?: number
          verified_points?: number
          verified_wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_competition_scores_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "monthly_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_competitions: {
        Row: {
          created_at: string
          division: string
          eligible_countries: string[]
          ends_at: string
          free_entry_available: boolean
          id: string
          minimum_age: number
          name: string
          official_rules_url: string
          prize_description: string
          prize_type: string
          purchase_required: boolean
          scoring_rules: Json
          slug: string
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          division: string
          eligible_countries?: string[]
          ends_at: string
          free_entry_available?: boolean
          id?: string
          minimum_age?: number
          name: string
          official_rules_url: string
          prize_description: string
          prize_type?: string
          purchase_required?: boolean
          scoring_rules: Json
          slug: string
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          division?: string
          eligible_countries?: string[]
          ends_at?: string
          free_entry_available?: boolean
          id?: string
          minimum_age?: number
          name?: string
          official_rules_url?: string
          prize_description?: string
          prize_type?: string
          purchase_required?: boolean
          scoring_rules?: Json
          slug?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          daily_challenge: boolean
          match_turns: boolean
          product_news: boolean
          quiet_end: string
          quiet_hours: boolean
          quiet_start: string
          room_invites: boolean
          sound: boolean
          streak_risk: boolean
          timezone: string
          tournaments: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_challenge?: boolean
          match_turns?: boolean
          product_news?: boolean
          quiet_end?: string
          quiet_hours?: boolean
          quiet_start?: string
          room_invites?: boolean
          sound?: boolean
          streak_risk?: boolean
          timezone?: string
          tournaments?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_challenge?: boolean
          match_turns?: boolean
          product_news?: boolean
          quiet_end?: string
          quiet_hours?: boolean
          quiet_start?: string
          room_invites?: boolean
          sound?: boolean
          streak_risk?: boolean
          timezone?: string
          tournaments?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      player_abilities: {
        Row: {
          ability_theta: number
          attempts: number
          category_key: string
          sport_id: string
          standard_error: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ability_theta?: number
          attempts?: number
          category_key?: string
          sport_id: string
          standard_error?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ability_theta?: number
          attempts?: number
          category_key?: string
          sport_id?: string
          standard_error?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_abilities_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      player_arcade_progress: {
        Row: {
          answered: number
          best_answer_streak: number
          best_daily_streak: number
          correct_answers: number
          current_answer_streak: number
          daily_streak: number
          last_correct_date: string | null
          rank_points: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          answered?: number
          best_answer_streak?: number
          best_daily_streak?: number
          correct_answers?: number
          current_answer_streak?: number
          daily_streak?: number
          last_correct_date?: string | null
          rank_points?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          answered?: number
          best_answer_streak?: number
          best_daily_streak?: number
          correct_answers?: number
          current_answer_streak?: number
          daily_streak?: number
          last_correct_date?: string | null
          rank_points?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
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
      prize_awards: {
        Row: {
          awarded_at: string | null
          competition_id: string
          eligibility_evidence: Json
          id: string
          rank: number
          status: string
          user_id: string
        }
        Insert: {
          awarded_at?: string | null
          competition_id: string
          eligibility_evidence?: Json
          id?: string
          rank: number
          status?: string
          user_id: string
        }
        Update: {
          awarded_at?: string | null
          competition_id?: string
          eligibility_evidence?: Json
          id?: string
          rank?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_awards_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "monthly_competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_preset: string
          avatar_settings: Json
          avatar_url: string | null
          country_code: string | null
          created_at: string
          difficulty_preference: string
          display_name: string | null
          id: string
          locale: string
          onboarded_at: string | null
          preferred_sports: string[]
          quiz_preferences: Json
          recent_scope_paths: Json
        }
        Insert: {
          avatar_preset?: string
          avatar_settings?: Json
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          difficulty_preference?: string
          display_name?: string | null
          id: string
          locale?: string
          onboarded_at?: string | null
          preferred_sports?: string[]
          quiz_preferences?: Json
          recent_scope_paths?: Json
        }
        Update: {
          avatar_preset?: string
          avatar_settings?: Json
          avatar_url?: string | null
          country_code?: string | null
          created_at?: string
          difficulty_preference?: string
          display_name?: string | null
          id?: string
          locale?: string
          onboarded_at?: string | null
          preferred_sports?: string[]
          quiz_preferences?: Json
          recent_scope_paths?: Json
        }
        Relationships: []
      }
      provider_records: {
        Row: {
          competition_id: string | null
          id: string
          import_error: string | null
          imported_at: string | null
          observed_at: string
          payload: Json
          payload_hash: string
          provider_kind: string
          provider_record_id: string
          source_id: string
          sport_id: string | null
        }
        Insert: {
          competition_id?: string | null
          id?: string
          import_error?: string | null
          imported_at?: string | null
          observed_at?: string
          payload: Json
          payload_hash: string
          provider_kind: string
          provider_record_id: string
          source_id: string
          sport_id?: string | null
        }
        Update: {
          competition_id?: string | null
          id?: string
          import_error?: string | null
          imported_at?: string | null
          observed_at?: string
          payload?: Json
          payload_hash?: string
          provider_kind?: string
          provider_record_id?: string
          source_id?: string
          sport_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_records_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_records_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_records_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_minor: number | null
          created_at: string
          currency: string | null
          external_ref: string | null
          id: string
          product_id: string
          provider: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          external_ref?: string | null
          id?: string
          product_id?: string
          provider: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount_minor?: number | null
          created_at?: string
          currency?: string | null
          external_ref?: string | null
          id?: string
          product_id?: string
          provider?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          enabled: boolean
          expo_token: string
          id: string
          last_seen_at: string
          locale: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expo_token: string
          id?: string
          last_seen_at?: string
          locale?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expo_token?: string
          id?: string
          last_seen_at?: string
          locale?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          ability_before: number | null
          awarded_points: number
          correct: boolean
          created_at: string
          difficulty_selected: number
          id: number
          passed: boolean
          question_id: string
          response_ms: number | null
          room_id: string | null
          used_clue: boolean
          user_id: string | null
        }
        Insert: {
          ability_before?: number | null
          awarded_points?: number
          correct: boolean
          created_at?: string
          difficulty_selected: number
          id?: never
          passed?: boolean
          question_id: string
          response_ms?: number | null
          room_id?: string | null
          used_clue?: boolean
          user_id?: string | null
        }
        Update: {
          ability_before?: number | null
          awarded_points?: number
          correct?: boolean
          created_at?: string
          difficulty_selected?: number
          id?: never
          passed?: boolean
          question_id?: string
          response_ms?: number | null
          room_id?: string | null
          used_clue?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_attempts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          active: boolean
          ambiguity_score: number
          answer_display_i18n: Json
          answer_rule: Json
          calibration_attempts: number
          category_key: string | null
          clue_i18n: Json
          competition_id: string | null
          content_hash: string | null
          created_at: string
          difficulty_b: number
          difficulty_confidence: number
          difficulty_percentile: number
          discrimination_a: number
          editorial_difficulty_percentile: number
          entity_ids: string[]
          format_key: string
          id: string
          max_answers: number
          media_assets: Json
          median_response_ms: number | null
          needs_difficulty_review: boolean
          prompt_i18n: Json
          quality_score: number
          question_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_title: string | null
          source_url: string | null
          sport_id: string
          time_limit_seconds: number | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          verification_status: string
        }
        Insert: {
          active?: boolean
          ambiguity_score?: number
          answer_display_i18n?: Json
          answer_rule: Json
          calibration_attempts?: number
          category_key?: string | null
          clue_i18n?: Json
          competition_id?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty_b?: number
          difficulty_confidence?: number
          difficulty_percentile?: number
          discrimination_a?: number
          editorial_difficulty_percentile: number
          entity_ids?: string[]
          format_key?: string
          id?: string
          max_answers?: number
          media_assets?: Json
          median_response_ms?: number | null
          needs_difficulty_review?: boolean
          prompt_i18n: Json
          quality_score?: number
          question_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_title?: string | null
          source_url?: string | null
          sport_id: string
          time_limit_seconds?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
        }
        Update: {
          active?: boolean
          ambiguity_score?: number
          answer_display_i18n?: Json
          answer_rule?: Json
          calibration_attempts?: number
          category_key?: string | null
          clue_i18n?: Json
          competition_id?: string | null
          content_hash?: string | null
          created_at?: string
          difficulty_b?: number
          difficulty_confidence?: number
          difficulty_percentile?: number
          discrimination_a?: number
          editorial_difficulty_percentile?: number
          entity_ids?: string[]
          format_key?: string
          id?: string
          max_answers?: number
          media_assets?: Json
          median_response_ms?: number | null
          needs_difficulty_review?: boolean
          prompt_i18n?: Json
          quality_score?: number
          question_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_title?: string | null
          source_url?: string | null
          sport_id?: string
          time_limit_seconds?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_format_key_fkey"
            columns: ["format_key"]
            isOneToOne: false
            referencedRelation: "quiz_formats"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "question_bank_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      question_exposures: {
        Row: {
          exposed_at: string
          id: number
          question_id: string
          room_id: string | null
          selection_scope: Json
          user_id: string
        }
        Insert: {
          exposed_at?: string
          id?: never
          question_id: string
          room_id?: string | null
          selection_scope?: Json
          user_id: string
        }
        Update: {
          exposed_at?: string
          id?: never
          question_id?: string
          room_id?: string | null
          selection_scope?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_exposures_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_exposures_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      question_pool_targets: {
        Row: {
          category_key: string
          difficulty: number
          priority: number
          sport_id: string
          target_count: number
          updated_at: string
        }
        Insert: {
          category_key: string
          difficulty: number
          priority?: number
          sport_id: string
          target_count?: number
          updated_at?: string
        }
        Update: {
          category_key?: string
          difficulty?: number
          priority?: number
          sport_id?: string
          target_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_pool_targets_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      question_scope_links: {
        Row: {
          criterion_id: string
          entity_id: string
          relationship: string
        }
        Insert: {
          criterion_id: string
          entity_id: string
          relationship?: string
        }
        Update: {
          criterion_id?: string
          entity_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_scope_links_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_scope_links_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "scope_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      question_selection_audit: {
        Row: {
          candidate_count: number
          cooldown_days: number
          id: number
          question_id: string | null
          requested_scope: Json
          room_id: string | null
          selected_at: string
          selection_score: number | null
          target_percentile: number
          user_id: string | null
        }
        Insert: {
          candidate_count: number
          cooldown_days: number
          id?: never
          question_id?: string | null
          requested_scope: Json
          room_id?: string | null
          selected_at?: string
          selection_score?: number | null
          target_percentile: number
          user_id?: string | null
        }
        Update: {
          candidate_count?: number
          cooldown_days?: number
          id?: never
          question_id?: string | null
          requested_scope?: Json
          room_id?: string | null
          selected_at?: string
          selection_score?: number | null
          target_percentile?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_selection_audit_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_formats: {
        Row: {
          active: boolean
          default_time_seconds: number | null
          interaction: string
          key: string
          scoring_rule: Json
          title: string
        }
        Insert: {
          active?: boolean
          default_time_seconds?: number | null
          interaction: string
          key: string
          scoring_rule?: Json
          title: string
        }
        Update: {
          active?: boolean
          default_time_seconds?: number | null
          interaction?: string
          key?: string
          scoring_rule?: Json
          title?: string
        }
        Relationships: []
      }
      quiz_generation_jobs: {
        Row: {
          competition_id: string | null
          completed_at: string | null
          created_at: string
          era_from: number | null
          era_to: number | null
          error: string | null
          generated_count: number
          id: string
          min_answers_per_cell: number
          requested_count: number
          sport_id: string
          status: string
        }
        Insert: {
          competition_id?: string | null
          completed_at?: string | null
          created_at?: string
          era_from?: number | null
          era_to?: number | null
          error?: string | null
          generated_count?: number
          id?: string
          min_answers_per_cell?: number
          requested_count?: number
          sport_id: string
          status?: string
        }
        Update: {
          competition_id?: string | null
          completed_at?: string | null
          created_at?: string
          era_from?: number | null
          era_to?: number | null
          error?: string | null
          generated_count?: number
          id?: string
          min_answers_per_cell?: number
          requested_count?: number
          sport_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_generation_jobs_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generation_jobs_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
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
      scope_entities: {
        Row: {
          athlete_id: string | null
          competition_id: string | null
          country_code: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["scope_entity_kind"]
          name: string
          name_i18n: Json
          parent_id: string | null
          slug: string
          source_id: string | null
          sport_id: string
          valid_from: string | null
          valid_to: string | null
          verification_status: string
        }
        Insert: {
          athlete_id?: string | null
          competition_id?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["scope_entity_kind"]
          name: string
          name_i18n?: Json
          parent_id?: string | null
          slug: string
          source_id?: string | null
          sport_id: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
        }
        Update: {
          athlete_id?: string | null
          competition_id?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["scope_entity_kind"]
          name?: string
          name_i18n?: Json
          parent_id?: string | null
          slug?: string
          source_id?: string | null
          sport_id?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_entities_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_entities_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "scope_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_entities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scope_entities_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          active: boolean
          base_points: number
          difficulty: number
          id: string
          mode_slug: string
          multiplier: number
          rarity_bonus_max: number
          speed_bonus_max: number
        }
        Insert: {
          active?: boolean
          base_points: number
          difficulty: number
          id?: string
          mode_slug: string
          multiplier: number
          rarity_bonus_max?: number
          speed_bonus_max?: number
        }
        Update: {
          active?: boolean
          base_points?: number
          difficulty?: number
          id?: string
          mode_slug?: string
          multiplier?: number
          rarity_bonus_max?: number
          speed_bonus_max?: number
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          device_hash: string | null
          event_type: string
          evidence: Json
          id: number
          ip_hash: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_hash?: string | null
          event_type: string
          evidence?: Json
          id?: never
          ip_hash?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_hash?: string | null
          event_type?: string
          evidence?: Json
          id?: never
          ip_hash?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
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
      user_notifications: {
        Row: {
          body: string
          created_at: string
          delivery_status: string
          expires_at: string | null
          id: string
          kind: string
          payload: Json
          read_at: string | null
          route: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delivery_status?: string
          expires_at?: string | null
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          route?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delivery_status?: string
          expires_at?: string | null
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          route?: string | null
          title?: string
          user_id?: string
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
      mastermind_standings: {
        Row: {
          correct_answers: number | null
          display_name: string | null
          passes: number | null
          place: number | null
          points: number | null
          room_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arcade_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "arcade_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      question_pool_coverage: {
        Row: {
          category_key: string | null
          competition_id: string | null
          difficulty: number | null
          playable_questions: number | null
          sport_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      question_pool_readiness: {
        Row: {
          category_key: string | null
          depth_target_met: boolean | null
          easy: number | null
          expert: number | null
          hard: number | null
          launch_ready: boolean | null
          medium: number | null
          sport_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      question_pool_target_status: {
        Row: {
          category_key: string | null
          difficulty: number | null
          playable_count: number | null
          questions_needed: number | null
          sport_id: string | null
          sport_slug: string | null
          status: string | null
          target_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_pool_targets_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_host_game: {
        Args: { p_mode_slug: string; p_user_id: string }
        Returns: boolean
      }
      create_arcade_room: {
        Args: {
          p_category_key?: string
          p_difficulty: number
          p_max_players?: number
          p_mode_slug: string
          p_sport_id?: string
          p_user_id: string
        }
        Returns: {
          active_seat: number | null
          code: string
          created_at: string
          difficulty: number
          host_id: string
          id: string
          mode_slug: string
          round_no: number
          settings: Json
          status: string
          turn_ends_at: string | null
          turn_started_at: string | null
          version: number
          visibility: Database["public"]["Enums"]["match_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "arcade_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      entitlement_verified: { Args: { p_user_id: string }; Returns: boolean }
      fill_verified_question_pools: {
        Args: { p_limit_each?: number }
        Returns: Json
      }
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
          p_mode?: string
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
      generate_endless_grid: {
        Args: {
          p_competition_id?: string
          p_difficulty?: number
          p_era_from?: number
          p_era_to?: number
          p_sport_id: string
        }
        Returns: string
      }
      generate_verified_honour_questions: {
        Args: { p_limit?: number; p_sport_id?: string }
        Returns: number
      }
      generate_verified_intersection_questions: {
        Args: { p_category_key?: string; p_limit?: number; p_sport_id?: string }
        Returns: number
      }
      grant_pro_lifetime: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: { Args: never; Returns: boolean }
      is_arcade_member: { Args: { p_room: string }; Returns: boolean }
      join_arcade_room: {
        Args: { p_code: string; p_user_id: string }
        Returns: {
          active_seat: number | null
          code: string
          created_at: string
          difficulty: number
          host_id: string
          id: string
          mode_slug: string
          round_no: number
          settings: Json
          status: string
          turn_ends_at: string | null
          turn_started_at: string | null
          version: number
          visibility: Database["public"]["Enums"]["match_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "arcade_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      leave_arcade_room: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: boolean
      }
      list_answer_challenges: { Args: { p_limit?: number }; Returns: Json }
      matchmake_arcade_player: {
        Args: {
          p_category_key?: string
          p_difficulty: number
          p_mode_slug: string
          p_sport_id?: string
          p_user_id: string
        }
        Returns: string
      }
      my_entitlement_status: {
        Args: never
        Returns: {
          ad_free: boolean
          pro_active: boolean
          verified_at: string
        }[]
      }
      publish_question: { Args: { p_question_id: string }; Returns: undefined }
      question_difficulty_band: {
        Args: { p_percentile: number }
        Returns: number
      }
      record_question_attempt: {
        Args: {
          p_correct: boolean
          p_difficulty: number
          p_passed: boolean
          p_question_id: string
          p_response_ms: number
          p_room_id: string
          p_used_clue: boolean
        }
        Returns: undefined
      }
      record_verified_question_attempt: {
        Args: {
          p_correct: boolean
          p_difficulty: number
          p_passed: boolean
          p_question_id: string
          p_response_ms: number
          p_room_id: string
          p_used_clue: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      reserve_fair_question: {
        Args: {
          p_category_key?: string
          p_competition_id?: string
          p_difficulty?: number
          p_question_types?: string[]
          p_room_id: string
          p_sport_id: string
          p_user_id: string
        }
        Returns: string
      }
      resolve_answer_challenge: {
        Args: { p_accept: boolean; p_challenge_id: string; p_note?: string }
        Returns: undefined
      }
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
      unpublish_question: {
        Args: { p_question_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "player" | "moderator" | "content_editor" | "admin" | "owner"
      entitlement_key: "ad_free_lifetime"
      game_status: "waiting" | "active" | "completed" | "abandoned"
      match_visibility: "public" | "friends" | "private"
      scope_entity_kind:
        | "sport"
        | "discipline"
        | "format"
        | "country"
        | "competition"
        | "team"
        | "constructor"
        | "manufacturer"
        | "stable"
        | "nation"
        | "person"
        | "player"
        | "driver"
        | "rider"
        | "boxer"
        | "fighter"
        | "horse"
        | "jockey"
        | "venue"
        | "award"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      scope_entity_kind: [
        "sport",
        "discipline",
        "format",
        "country",
        "competition",
        "team",
        "constructor",
        "manufacturer",
        "stable",
        "nation",
        "person",
        "player",
        "driver",
        "rider",
        "boxer",
        "fighter",
        "horse",
        "jockey",
        "venue",
        "award",
      ],
    },
  },
} as const
