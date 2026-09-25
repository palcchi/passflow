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
      access_rules: {
        Row: {
          allowed: boolean
          event_id: string
          id: string
          ticket_type_id: string
          zone_id: string
        }
        Insert: {
          allowed?: boolean
          event_id: string
          id?: string
          ticket_type_id: string
          zone_id: string
        }
        Update: {
          allowed?: boolean
          event_id?: string
          id?: string
          ticket_type_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_rules_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "access_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      access_zones: {
        Row: {
          code: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_zones_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          code: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_id: string
          attendee_id: string
          completed_at: string
          event_id: string
          id: string
          scanner_station_id: string | null
        }
        Insert: {
          activity_id: string
          attendee_id: string
          completed_at?: string
          event_id: string
          id?: string
          scanner_station_id?: string | null
        }
        Update: {
          activity_id?: string
          attendee_id?: string
          completed_at?: string
          event_id?: string
          id?: string
          scanner_station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_scanner_station_id_fkey"
            columns: ["scanner_station_id"]
            isOneToOne: false
            referencedRelation: "scanner_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendees: {
        Row: {
          attendee_code: string
          checked_in_at: string | null
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string
          phone: string | null
          ticket_type_id: string | null
          user_id: string | null
        }
        Insert: {
          attendee_code: string
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          phone?: string | null
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Update: {
          attendee_code?: string
          checked_in_at?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          phone?: string | null
          ticket_type_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendees_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_claims: {
        Row: {
          attendee_id: string
          benefit_code: string
          claimed_at: string
          event_id: string
          id: string
          scanner_station_id: string | null
        }
        Insert: {
          attendee_id: string
          benefit_code: string
          claimed_at?: string
          event_id: string
          id?: string
          scanner_station_id?: string | null
        }
        Update: {
          attendee_id?: string
          benefit_code?: string
          claimed_at?: string
          event_id?: string
          id?: string
          scanner_station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benefit_claims_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_claims_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_claims_scanner_station_id_fkey"
            columns: ["scanner_station_id"]
            isOneToOne: false
            referencedRelation: "scanner_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          code: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_assets: {
        Row: {
          asset_type: string
          created_at: string
          event_id: string
          id: string
          public_url: string | null
          storage_path: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          event_id: string
          id?: string
          public_url?: string | null
          storage_path: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          event_id?: string
          id?: string
          public_url?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          ends_at: string | null
          hero_image_url: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          poster_url: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          theme: Json
          updated_at: string
          venue: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          poster_url?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json
          updated_at?: string
          venue?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          hero_image_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          poster_url?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          theme?: Json
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      qr_credentials: {
        Row: {
          attendee_id: string | null
          claimed_at: string | null
          code: string
          created_at: string
          display_code: string | null
          event_id: string
          id: string
          replaced_by: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["qr_status"]
        }
        Insert: {
          attendee_id?: string | null
          claimed_at?: string | null
          code: string
          created_at?: string
          display_code?: string | null
          event_id: string
          id?: string
          replaced_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["qr_status"]
        }
        Update: {
          attendee_id?: string | null
          claimed_at?: string | null
          code?: string
          created_at?: string
          display_code?: string | null
          event_id?: string
          id?: string
          replaced_by?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["qr_status"]
        }
        Relationships: [
          {
            foreignKeyName: "qr_credentials_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_credentials_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_credentials_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "qr_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          attendee_id: string | null
          decision: Database["public"]["Enums"]["scan_decision"]
          event_id: string
          id: string
          metadata: Json
          qr_credential_id: string | null
          scanned_at: string
          scanner_station_id: string | null
        }
        Insert: {
          attendee_id?: string | null
          decision: Database["public"]["Enums"]["scan_decision"]
          event_id: string
          id?: string
          metadata?: Json
          qr_credential_id?: string | null
          scanned_at?: string
          scanner_station_id?: string | null
        }
        Update: {
          attendee_id?: string | null
          decision?: Database["public"]["Enums"]["scan_decision"]
          event_id?: string
          id?: string
          metadata?: Json
          qr_credential_id?: string | null
          scanned_at?: string
          scanner_station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_attendee_id_fkey"
            columns: ["attendee_id"]
            isOneToOne: false
            referencedRelation: "attendees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_qr_credential_id_fkey"
            columns: ["qr_credential_id"]
            isOneToOne: false
            referencedRelation: "qr_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_scanner_station_id_fkey"
            columns: ["scanner_station_id"]
            isOneToOne: false
            referencedRelation: "scanner_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_stations: {
        Row: {
          config: Json
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          mode: Database["public"]["Enums"]["station_mode"]
          name: string
          slug: string
          zone_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          mode: Database["public"]["Enums"]["station_mode"]
          name: string
          slug: string
          zone_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          mode?: Database["public"]["Enums"]["station_mode"]
          name?: string
          slug?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scanner_stations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scanner_stations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "access_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          capacity: number | null
          code: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          capacity?: number | null
          code: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          capacity?: number | null
          code?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_qr: {
        Args: { p_code: string; p_event_slug: string }
        Returns: Json
      }
      is_event_manager: { Args: { p_event_id: string }; Returns: boolean }
      is_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_org_manager: { Args: { p_organization_id: string }; Returns: boolean }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      register_for_event: {
        Args: {
          p_event_slug: string
          p_name: string
          p_phone?: string
          p_ticket_code?: string
        }
        Returns: Json
      }
      replace_qr: {
        Args: { p_code: string; p_event_slug: string }
        Returns: Json
      }
      validate_scan: {
        Args: { p_code: string; p_station_id: string }
        Returns: Json
      }
    }
    Enums: {
      event_status: "draft" | "published" | "archived"
      member_role: "owner" | "admin" | "staff"
      qr_status: "unclaimed" | "active" | "revoked" | "replaced"
      scan_decision:
        | "granted"
        | "denied"
        | "invalid"
        | "already_checked_in"
        | "already_claimed"
      station_mode: "check_in" | "zone_access" | "activity" | "claim"
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
      event_status: ["draft", "published", "archived"],
      member_role: ["owner", "admin", "staff"],
      qr_status: ["unclaimed", "active", "revoked", "replaced"],
      scan_decision: [
        "granted",
        "denied",
        "invalid",
        "already_checked_in",
        "already_claimed",
      ],
      station_mode: ["check_in", "zone_access", "activity", "claim"],
    },
  },
} as const
