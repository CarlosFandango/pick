export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit: {
        Row: {
          address_line: string | null
          auditor_fee_pence: number | null
          auditor_id: string | null
          campaign_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_set_version: number
          client_organisation_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          matched_at: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          price_pence: number
          reference: string
          requested_at: string | null
          scheduled_for: string | null
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_minutes: number | null
        }
        Insert: {
          address_line?: string | null
          auditor_fee_pence?: number | null
          auditor_id?: string | null
          campaign_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_set_version?: number
          client_organisation_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matched_at?: string | null
          postcode: string
          postcode_area?: string | null
          postcode_outward?: string | null
          price_pence?: number
          reference?: string
          requested_at?: string | null
          scheduled_for?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          updated_at?: string
          window_minutes?: number | null
        }
        Update: {
          address_line?: string | null
          auditor_fee_pence?: number | null
          auditor_id?: string | null
          campaign_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_set_version?: number
          client_organisation_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matched_at?: string | null
          postcode?: string
          postcode_area?: string | null
          postcode_outward?: string | null
          price_pence?: number
          reference?: string
          requested_at?: string | null
          scheduled_for?: string | null
          site_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          updated_at?: string
          window_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_client_organisation_id_fkey"
            columns: ["client_organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_coverage: {
        Row: {
          auditor_id: string
          created_at: string
          id: string
          postcode_area: string
        }
        Insert: {
          auditor_id: string
          created_at?: string
          id?: string
          postcode_area: string
        }
        Update: {
          auditor_id?: string
          created_at?: string
          id?: string
          postcode_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_coverage_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auditor_profile: {
        Row: {
          approval_status: Database["public"]["Enums"]["auditor_approval_status"]
          approved_at: string | null
          approved_by: string | null
          base_postcode: string | null
          created_at: string
          dbs_checked_on: string | null
          payout_reference: string | null
          right_to_work_checked_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["auditor_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          base_postcode?: string | null
          created_at?: string
          dbs_checked_on?: string | null
          payout_reference?: string | null
          right_to_work_checked_on?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["auditor_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          base_postcode?: string | null
          created_at?: string
          dbs_checked_on?: string | null
          payout_reference?: string | null
          right_to_work_checked_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_profile_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      check_definition: {
        Row: {
          code: string
          compliance_category: Database["public"]["Enums"]["compliance_category"]
          created_at: string
          guidance: string | null
          id: string
          is_active: boolean
          is_critical: boolean
          moment: Database["public"]["Enums"]["audit_moment"]
          prompt: string
          sort_order: number
          version: number
          weight: number
        }
        Insert: {
          code: string
          compliance_category: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          moment: Database["public"]["Enums"]["audit_moment"]
          prompt: string
          sort_order?: number
          version?: number
          weight?: number
        }
        Update: {
          code?: string
          compliance_category?: Database["public"]["Enums"]["compliance_category"]
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          moment?: Database["public"]["Enums"]["audit_moment"]
          prompt?: string
          sort_order?: number
          version?: number
          weight?: number
        }
        Relationships: []
      }
      check_result: {
        Row: {
          audit_id: string
          auditor_id: string
          check_definition_id: string
          id: string
          note: string | null
          occurred_at: string
          outcome: Database["public"]["Enums"]["check_outcome"]
          recorded_at: string
        }
        Insert: {
          audit_id: string
          auditor_id: string
          check_definition_id: string
          id: string
          note?: string | null
          occurred_at: string
          outcome: Database["public"]["Enums"]["check_outcome"]
          recorded_at?: string
        }
        Update: {
          audit_id?: string
          auditor_id?: string
          check_definition_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          outcome?: Database["public"]["Enums"]["check_outcome"]
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_result_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_result_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "check_result_check_definition_id_fkey"
            columns: ["check_definition_id"]
            isOneToOne: false
            referencedRelation: "check_definition"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transaction: {
        Row: {
          audit_id: string | null
          created_by: string | null
          currency: string
          delta: number
          external_reference: string | null
          id: string
          note: string | null
          occurred_at: string
          organisation_id: string
          reason: Database["public"]["Enums"]["credit_reason"]
          recorded_at: string
          unit_price_pence: number | null
        }
        Insert: {
          audit_id?: string | null
          created_by?: string | null
          currency?: string
          delta: number
          external_reference?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          organisation_id: string
          reason: Database["public"]["Enums"]["credit_reason"]
          recorded_at?: string
          unit_price_pence?: number | null
        }
        Update: {
          audit_id?: string | null
          created_by?: string | null
          currency?: string
          delta?: number
          external_reference?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          organisation_id?: string
          reason?: Database["public"]["Enums"]["credit_reason"]
          recorded_at?: string
          unit_price_pence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transaction_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transaction_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transaction_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_attachment: {
        Row: {
          audit_id: string
          byte_size: number | null
          captured_at: string | null
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime_type: string | null
          observation_log_id: string | null
          recorded_at: string
          sha256: string | null
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          audit_id: string
          byte_size?: number | null
          captured_at?: string | null
          duration_seconds?: number | null
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime_type?: string | null
          observation_log_id?: string | null
          recorded_at?: string
          sha256?: string | null
          storage_bucket: string
          storage_path: string
        }
        Update: {
          audit_id?: string
          byte_size?: number | null
          captured_at?: string | null
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["evidence_kind"]
          mime_type?: string | null
          observation_log_id?: string | null
          recorded_at?: string
          sha256?: string | null
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_attachment_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_attachment_observation_log_id_fkey"
            columns: ["observation_log_id"]
            isOneToOne: false
            referencedRelation: "observation_log"
            referencedColumns: ["id"]
          },
        ]
      }
      observation_log: {
        Row: {
          audit_id: string
          auditor_id: string
          body: string | null
          id: string
          kind: Database["public"]["Enums"]["observation_kind"]
          moment: Database["public"]["Enums"]["audit_moment"] | null
          occurred_at: string
          payload: Json
          recorded_at: string
        }
        Insert: {
          audit_id: string
          auditor_id: string
          body?: string | null
          id: string
          kind?: Database["public"]["Enums"]["observation_kind"]
          moment?: Database["public"]["Enums"]["audit_moment"] | null
          occurred_at: string
          payload?: Json
          recorded_at?: string
        }
        Update: {
          audit_id?: string
          auditor_id?: string
          body?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["observation_kind"]
          moment?: Database["public"]["Enums"]["audit_moment"] | null
          occurred_at?: string
          payload?: Json
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observation_log_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observation_log_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organisation: {
        Row: {
          charity_number: string | null
          companies_house_number: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          residency_zone: Database["public"]["Enums"]["residency_zone"]
          updated_at: string
        }
        Insert: {
          charity_number?: string | null
          companies_house_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          residency_zone?: Database["public"]["Enums"]["residency_zone"]
          updated_at?: string
        }
        Update: {
          charity_number?: string | null
          companies_house_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          residency_zone?: Database["public"]["Enums"]["residency_zone"]
          updated_at?: string
        }
        Relationships: []
      }
      payout_line_item: {
        Row: {
          amount_pence: number
          audit_id: string | null
          auditor_id: string
          created_at: string
          description: string | null
          external_reference: string | null
          id: string
          payout_run_id: string
          status: Database["public"]["Enums"]["payout_line_status"]
          updated_at: string
        }
        Insert: {
          amount_pence: number
          audit_id?: string | null
          auditor_id: string
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          payout_run_id: string
          status?: Database["public"]["Enums"]["payout_line_status"]
          updated_at?: string
        }
        Update: {
          amount_pence?: number
          audit_id?: string | null
          auditor_id?: string
          created_at?: string
          description?: string | null
          external_reference?: string | null
          id?: string
          payout_run_id?: string
          status?: Database["public"]["Enums"]["payout_line_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_line_item_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_line_item_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payout_line_item_payout_run_id_fkey"
            columns: ["payout_run_id"]
            isOneToOne: false
            referencedRelation: "payout_run"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_run: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          executed_at: string | null
          execution_method: Database["public"]["Enums"]["payout_execution_method"]
          external_reference: string | null
          id: string
          period_end: string
          period_start: string
          reference: string
          status: Database["public"]["Enums"]["payout_run_status"]
          total_pence: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          executed_at?: string | null
          execution_method?: Database["public"]["Enums"]["payout_execution_method"]
          external_reference?: string | null
          id?: string
          period_end: string
          period_start: string
          reference?: string
          status?: Database["public"]["Enums"]["payout_run_status"]
          total_pence?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          executed_at?: string | null
          execution_method?: Database["public"]["Enums"]["payout_execution_method"]
          external_reference?: string | null
          id?: string
          period_end?: string
          period_start?: string
          reference?: string
          status?: Database["public"]["Enums"]["payout_run_status"]
          total_pence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_run_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_run_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          organisation_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          organisation_id?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organisation_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organisation_credit_balance: {
        Row: {
          balance: number | null
          organisation_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transaction_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      uuid_generate_v7: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "auditor" | "client" | "pick_admin"
      audit_moment:
        | "approach"
        | "walk_up"
        | "opening"
        | "pitch"
        | "ask"
        | "tablet"
        | "sign_up"
        | "close"
      audit_status:
        | "draft"
        | "requested"
        | "matched"
        | "scheduled"
        | "in_progress"
        | "submitted"
        | "under_review"
        | "completed"
        | "cancelled"
      auditor_approval_status: "pending" | "approved" | "suspended" | "rejected"
      check_outcome: "pass" | "fail" | "not_applicable" | "not_observed"
      compliance_category:
        | "identification"
        | "solicitation_statement"
        | "honesty_and_accuracy"
        | "vulnerability"
        | "pressure_and_persistence"
        | "data_protection"
        | "consent_and_cancellation"
        | "site_conduct"
        | "safeguarding"
        | "record_keeping"
      credit_reason: "purchase" | "booking" | "refund" | "adjustment" | "expiry"
      evidence_kind: "photo" | "audio" | "video" | "document"
      observation_kind: "note" | "timing" | "count" | "incident"
      org_type: "charity" | "contractor" | "pick"
      payout_execution_method: "manual_csv" | "bank_api" | "stripe_connect"
      payout_line_status: "pending" | "paid" | "failed" | "held"
      payout_run_status:
        | "draft"
        | "approved"
        | "executing"
        | "executed"
        | "failed"
        | "cancelled"
      residency_zone: "uk" | "eea" | "other"
      user_status: "invited" | "active" | "suspended"
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
      app_role: ["auditor", "client", "pick_admin"],
      audit_moment: [
        "approach",
        "walk_up",
        "opening",
        "pitch",
        "ask",
        "tablet",
        "sign_up",
        "close",
      ],
      audit_status: [
        "draft",
        "requested",
        "matched",
        "scheduled",
        "in_progress",
        "submitted",
        "under_review",
        "completed",
        "cancelled",
      ],
      auditor_approval_status: ["pending", "approved", "suspended", "rejected"],
      check_outcome: ["pass", "fail", "not_applicable", "not_observed"],
      compliance_category: [
        "identification",
        "solicitation_statement",
        "honesty_and_accuracy",
        "vulnerability",
        "pressure_and_persistence",
        "data_protection",
        "consent_and_cancellation",
        "site_conduct",
        "safeguarding",
        "record_keeping",
      ],
      credit_reason: ["purchase", "booking", "refund", "adjustment", "expiry"],
      evidence_kind: ["photo", "audio", "video", "document"],
      observation_kind: ["note", "timing", "count", "incident"],
      org_type: ["charity", "contractor", "pick"],
      payout_execution_method: ["manual_csv", "bank_api", "stripe_connect"],
      payout_line_status: ["pending", "paid", "failed", "held"],
      payout_run_status: [
        "draft",
        "approved",
        "executing",
        "executed",
        "failed",
        "cancelled",
      ],
      residency_zone: ["uk", "eea", "other"],
      user_status: ["invited", "active", "suspended"],
    },
  },
} as const

