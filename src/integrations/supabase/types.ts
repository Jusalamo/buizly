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
      connections: {
        Row: {
          connection_company: string | null
          connection_email: string | null
          connection_name: string
          connection_phone: string | null
          connection_title: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          connection_company?: string | null
          connection_email?: string | null
          connection_name: string
          connection_phone?: string | null
          connection_title?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          connection_company?: string | null
          connection_email?: string | null
          connection_name?: string
          connection_phone?: string | null
          connection_title?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          audio_note_url: string | null
          created_at: string
          id: string
          meeting_id: string
          text_note: string | null
        }
        Insert: {
          audio_note_url?: string | null
          created_at?: string
          id?: string
          meeting_id: string
          text_note?: string | null
        }
        Update: {
          audio_note_url?: string | null
          created_at?: string
          id?: string
          meeting_id?: string
          text_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          email: string
          id: string
          meeting_id: string
          name: string | null
          responded_at: string | null
          response: Database["public"]["Enums"]["meeting_status"] | null
          suggested_time: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          meeting_id: string
          name?: string | null
          responded_at?: string | null
          response?: Database["public"]["Enums"]["meeting_status"] | null
          suggested_time?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          meeting_id?: string
          name?: string | null
          responded_at?: string | null
          response?: Database["public"]["Enums"]["meeting_status"] | null
          suggested_time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          connection_id: string | null
          created_at: string
          description: string | null
          follow_up_sent: boolean
          google_calendar_event_id: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_time: string
          organizer_id: string | null
          parent_meeting_id: string | null
          reminder_1h_sent: boolean | null
          reminder_24h_sent: boolean | null
          status: Database["public"]["Enums"]["meeting_status"] | null
          title: string | null
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_sent?: boolean
          google_calendar_event_id?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_time: string
          organizer_id?: string | null
          parent_meeting_id?: string | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          status?: Database["public"]["Enums"]["meeting_status"] | null
          title?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          description?: string | null
          follow_up_sent?: boolean
          google_calendar_event_id?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_time?: string
          organizer_id?: string | null
          parent_meeting_id?: string | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          status?: Database["public"]["Enums"]["meeting_status"] | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_parent_meeting_id_fkey"
            columns: ["parent_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string | null
          phone: string | null
          qr_code_url: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          job_title?: string | null
          phone?: string | null
          qr_code_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          phone?: string | null
          qr_code_url?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          google_calendar_connected: boolean | null
          google_refresh_token: string | null
          id: string
          onboarding_completed: boolean | null
          profile_visibility: string | null
          push_notifications: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          google_calendar_connected?: boolean | null
          google_refresh_token?: string | null
          id?: string
          onboarding_completed?: boolean | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          google_calendar_connected?: boolean | null
          google_refresh_token?: string | null
          id?: string
          onboarding_completed?: boolean | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      meeting_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "rescheduled"
      notification_type:
        | "meeting_request"
        | "meeting_confirmed"
        | "meeting_declined"
        | "meeting_cancelled"
        | "meeting_rescheduled"
        | "meeting_reminder"
        | "new_participant"
        | "profile_shared"
        | "new_connection"
        | "follow_up_scheduled"
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
      meeting_status: [
        "pending",
        "confirmed",
        "declined",
        "cancelled",
        "rescheduled",
      ],
      notification_type: [
        "meeting_request",
        "meeting_confirmed",
        "meeting_declined",
        "meeting_cancelled",
        "meeting_rescheduled",
        "meeting_reminder",
        "new_participant",
        "profile_shared",
        "new_connection",
        "follow_up_scheduled",
      ],
    },
  },
} as const
