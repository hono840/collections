// Hand-written to mirror `supabase gen types typescript --local` for migrations 00001-00004.
// Regenerate when Docker is available:
//   pnpm exec supabase gen types typescript --local > src/types/database.types.ts

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
      drives: {
        Row: {
          created_at: string
          driven_on: string
          id: string
          memo: string
          rating_ease_of_driving: number | null
          rating_overall: number
          rating_road_surface: number | null
          rating_scenery: number | null
          road_id: string
          traffic: string | null
          updated_at: string
          user_id: string
          vehicle_type: string | null
          visibility: string
          weather: string | null
        }
        Insert: {
          created_at?: string
          driven_on: string
          id?: string
          memo?: string
          rating_ease_of_driving?: number | null
          rating_overall: number
          rating_road_surface?: number | null
          rating_scenery?: number | null
          road_id: string
          traffic?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
          visibility?: string
          weather?: string | null
        }
        Update: {
          created_at?: string
          driven_on?: string
          id?: string
          memo?: string
          rating_ease_of_driving?: number | null
          rating_overall?: number
          rating_road_surface?: number | null
          rating_scenery?: number | null
          road_id?: string
          traffic?: string | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
          visibility?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drives_road_id_fkey"
            columns: ["road_id"]
            isOneToOne: false
            referencedRelation: "road_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drives_road_id_fkey"
            columns: ["road_id"]
            isOneToOne: false
            referencedRelation: "roads"
            referencedColumns: ["id"]
          },
        ]
      }
      road_info: {
        Row: {
          confirmed_on: string
          created_at: string
          drive_id: string
          michi_no_eki: string | null
          michi_no_eki_memo: string
          motorcycle_ban: string | null
          motorcycle_ban_memo: string
          night_closure: string | null
          night_closure_memo: string
          observatory: string | null
          observatory_memo: string
          parking: string | null
          parking_memo: string
          toilet: string | null
          toilet_memo: string
          toll: string | null
          toll_memo: string
          updated_at: string
          user_id: string
          winter_closure: string | null
          winter_closure_memo: string
        }
        Insert: {
          confirmed_on?: string
          created_at?: string
          drive_id: string
          michi_no_eki?: string | null
          michi_no_eki_memo?: string
          motorcycle_ban?: string | null
          motorcycle_ban_memo?: string
          night_closure?: string | null
          night_closure_memo?: string
          observatory?: string | null
          observatory_memo?: string
          parking?: string | null
          parking_memo?: string
          toilet?: string | null
          toilet_memo?: string
          toll?: string | null
          toll_memo?: string
          updated_at?: string
          user_id?: string
          winter_closure?: string | null
          winter_closure_memo?: string
        }
        Update: {
          confirmed_on?: string
          created_at?: string
          drive_id?: string
          michi_no_eki?: string | null
          michi_no_eki_memo?: string
          motorcycle_ban?: string | null
          motorcycle_ban_memo?: string
          night_closure?: string | null
          night_closure_memo?: string
          observatory?: string | null
          observatory_memo?: string
          parking?: string | null
          parking_memo?: string
          toilet?: string | null
          toilet_memo?: string
          toll?: string | null
          toll_memo?: string
          updated_at?: string
          user_id?: string
          winter_closure?: string | null
          winter_closure_memo?: string
        }
        Relationships: [
          {
            foreignKeyName: "road_info_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: true
            referencedRelation: "drives"
            referencedColumns: ["id"]
          },
        ]
      }
      roads: {
        Row: {
          created_at: string
          end_lat: number | null
          end_lng: number | null
          id: string
          name: string
          prefecture_code: number
          road_type: string
          start_lat: number
          start_lng: number
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          name: string
          prefecture_code: number
          road_type?: string
          start_lat: number
          start_lng: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          end_lat?: number | null
          end_lng?: number | null
          id?: string
          name?: string
          prefecture_code?: number
          road_type?: string
          start_lat?: number
          start_lng?: number
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          safety_notice_acknowledged_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          safety_notice_acknowledged_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          safety_notice_acknowledged_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      road_summaries: {
        Row: {
          created_at: string | null
          drive_count: number | null
          end_lat: number | null
          end_lng: number | null
          id: string | null
          last_driven_on: string | null
          last_rating_overall: number | null
          name: string | null
          prefecture_code: number | null
          rating_overall_sum: number | null
          road_type: string | null
          start_lat: number | null
          start_lng: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      keep_alive: { Args: never; Returns: Json }
      today_in_tokyo: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
