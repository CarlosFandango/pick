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
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        Insert: {
          address_line?: string | null
          audit_type?: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at?: string | null
          pitch_detail?: string | null
          postcode: string
          postcode_area?: string | null
          postcode_outward?: string | null
          preferred_auditor_id?: string | null
          price_pence?: number
          reference?: string
          released_at?: string | null
          released_by?: string | null
          requested_at?: string | null
          requires_av?: boolean
          requires_review?: boolean
          returned_at?: string | null
          returned_moments?: Database["public"]["Enums"]["audit_moment"][]
          review_note?: string | null
          scheduled_for?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          shift_payment_method?: Database["public"]["Enums"]["shift_payment_method"]
          site_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          updated_at?: string
          window_end_on?: string | null
          window_minutes?: number | null
          window_start_on?: string | null
        }
        Update: {
          address_line?: string | null
          audit_type?: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at?: string | null
          pitch_detail?: string | null
          postcode?: string
          postcode_area?: string | null
          postcode_outward?: string | null
          preferred_auditor_id?: string | null
          price_pence?: number
          reference?: string
          released_at?: string | null
          released_by?: string | null
          requested_at?: string | null
          requires_av?: boolean
          requires_review?: boolean
          returned_at?: string | null
          returned_moments?: Database["public"]["Enums"]["audit_moment"][]
          review_note?: string | null
          scheduled_for?: string | null
          session_ended_at?: string | null
          session_started_at?: string | null
          shift_payment_method?: Database["public"]["Enums"]["shift_payment_method"]
          site_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          updated_at?: string
          window_end_on?: string | null
          window_minutes?: number | null
          window_start_on?: string | null
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
          {
            foreignKeyName: "audit_preferred_auditor_id_fkey"
            columns: ["preferred_auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_offer: {
        Row: {
          audit_id: string
          auditor_id: string
          created_at: string
          decline_reason: string | null
          expires_at: string | null
          id: string
          match_reason: string | null
          offered_at: string
          outcome: Database["public"]["Enums"]["assignment_outcome"]
          responded_at: string | null
          travel_uplift_pence: number
          updated_at: string
          warnings: Database["public"]["Enums"]["eligibility_flag"][]
        }
        Insert: {
          audit_id: string
          auditor_id: string
          created_at?: string
          decline_reason?: string | null
          expires_at?: string | null
          id?: string
          match_reason?: string | null
          offered_at?: string
          outcome?: Database["public"]["Enums"]["assignment_outcome"]
          responded_at?: string | null
          travel_uplift_pence?: number
          updated_at?: string
          warnings?: Database["public"]["Enums"]["eligibility_flag"][]
        }
        Update: {
          audit_id?: string
          auditor_id?: string
          created_at?: string
          decline_reason?: string | null
          expires_at?: string | null
          id?: string
          match_reason?: string | null
          offered_at?: string
          outcome?: Database["public"]["Enums"]["assignment_outcome"]
          responded_at?: string | null
          travel_uplift_pence?: number
          updated_at?: string
          warnings?: Database["public"]["Enums"]["eligibility_flag"][]
        }
        Relationships: [
          {
            foreignKeyName: "audit_offer_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_offer_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_pay_item: {
        Row: {
          amount_pence: number
          audit_id: string
          created_at: string
          id: string
          kind: string
          note: string | null
        }
        Insert: {
          amount_pence: number
          audit_id: string
          created_at?: string
          id?: string
          kind: string
          note?: string | null
        }
        Update: {
          amount_pence?: number
          audit_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_pay_item_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_capability: {
        Row: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          auditor_id: string
        }
        Insert: {
          audit_type: Database["public"]["Enums"]["audit_type"]
          auditor_id: string
        }
        Update: {
          audit_type?: Database["public"]["Enums"]["audit_type"]
          auditor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_capability_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      auditor_conflict: {
        Row: {
          auditor_id: string
          declared_at: string
          id: string
          organisation_id: string
          reason: string
        }
        Insert: {
          auditor_id: string
          declared_at?: string
          id?: string
          organisation_id: string
          reason: string
        }
        Update: {
          auditor_id?: string
          declared_at?: string
          id?: string
          organisation_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_conflict_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auditor_conflict_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
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
          av_capable: boolean
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
          av_capable?: boolean
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
          av_capable?: boolean
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
      complaint: {
        Row: {
          acknowledged_at: string | null
          audit_id: string | null
          body: string
          created_at: string
          id: string
          organisation_id: string
          raised_at: string
          raised_by: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          subject: Database["public"]["Enums"]["complaint_subject"]
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          audit_id?: string | null
          body: string
          created_at?: string
          id?: string
          organisation_id: string
          raised_at?: string
          raised_by: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject: Database["public"]["Enums"]["complaint_subject"]
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          audit_id?: string | null
          body?: string
          created_at?: string
          id?: string
          organisation_id?: string
          raised_at?: string
          raised_by?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          subject?: Database["public"]["Enums"]["complaint_subject"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaint_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaint_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
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
          severity: Database["public"]["Enums"]["flag_severity"] | null
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
          severity?: Database["public"]["Enums"]["flag_severity"] | null
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
          severity?: Database["public"]["Enums"]["flag_severity"] | null
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
      prep_progress: {
        Row: {
          auditor_id: string
          check_definition_id: string
          learnt_at: string
        }
        Insert: {
          auditor_id: string
          check_definition_id: string
          learnt_at?: string
        }
        Update: {
          auditor_id?: string
          check_definition_id?: string
          learnt_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_progress_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditor_profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prep_progress_check_definition_id_fkey"
            columns: ["check_definition_id"]
            isOneToOne: false
            referencedRelation: "check_definition"
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
      accept_offer: {
        Args: { p_offer_id: string }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      auditor_code_for: {
        Args: { p_auditor_id: string; p_organisation_id: string }
        Returns: string
      }
      base_audit_fee_pence: { Args: never; Returns: number }
      book_audit:
        | {
            Args: {
              p_audit_type: Database["public"]["Enums"]["audit_type"]
              p_campaign_name?: string
              p_organisation_id: string
              p_postcode: string
              p_shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
              p_site_name?: string
              p_window_end_on: string
              p_window_start_on: string
            }
            Returns: {
              address_line: string | null
              audit_type: Database["public"]["Enums"]["audit_type"]
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
              no_team_present_at: string | null
              pitch_detail: string | null
              postcode: string
              postcode_area: string | null
              postcode_outward: string | null
              preferred_auditor_id: string | null
              price_pence: number
              reference: string
              released_at: string | null
              released_by: string | null
              requested_at: string | null
              requires_av: boolean
              requires_review: boolean
              returned_at: string | null
              returned_moments: Database["public"]["Enums"]["audit_moment"][]
              review_note: string | null
              scheduled_for: string | null
              session_ended_at: string | null
              session_started_at: string | null
              shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
              site_name: string | null
              started_at: string | null
              status: Database["public"]["Enums"]["audit_status"]
              submitted_at: string | null
              updated_at: string
              window_end_on: string | null
              window_minutes: number | null
              window_start_on: string | null
            }
            SetofOptions: {
              from: "*"
              to: "audit"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_audit_type: Database["public"]["Enums"]["audit_type"]
              p_campaign_name?: string
              p_organisation_id: string
              p_postcode: string
              p_requires_av?: boolean
              p_shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
              p_site_name?: string
              p_window_end_on: string
              p_window_start_on: string
            }
            Returns: {
              address_line: string | null
              audit_type: Database["public"]["Enums"]["audit_type"]
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
              no_team_present_at: string | null
              pitch_detail: string | null
              postcode: string
              postcode_area: string | null
              postcode_outward: string | null
              preferred_auditor_id: string | null
              price_pence: number
              reference: string
              released_at: string | null
              released_by: string | null
              requested_at: string | null
              requires_av: boolean
              requires_review: boolean
              returned_at: string | null
              returned_moments: Database["public"]["Enums"]["audit_moment"][]
              review_note: string | null
              scheduled_for: string | null
              session_ended_at: string | null
              session_started_at: string | null
              shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
              site_name: string | null
              started_at: string | null
              status: Database["public"]["Enums"]["audit_status"]
              submitted_at: string | null
              updated_at: string
              window_end_on: string | null
              window_minutes: number | null
              window_start_on: string | null
            }
            SetofOptions: {
              from: "*"
              to: "audit"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      booking_lead_days: { Args: never; Returns: number }
      decline_offer: {
        Args: { p_offer_id: string; p_reason?: string }
        Returns: undefined
      }
      default_travel_uplift_pence: { Args: never; Returns: number }
      eligible_auditors: {
        Args: { p_audit_id: string }
        Returns: {
          auditor_id: string
          match_reason: string
          warnings: Database["public"]["Enums"]["eligibility_flag"][]
        }[]
      }
      exposure_window_days: { Args: never; Returns: number }
      offer_audit: {
        Args: { p_audit_id: string; p_expires_in?: string }
        Returns: number
      }
      ops_counters: {
        Args: never
        Returns: {
          in_flight_today: number
          needs_a_human: number
          offers_awaiting: number
          released_this_week: number
        }[]
      }
      ops_queue: {
        Args: never
        Returns: {
          kind: Database["public"]["Enums"]["ops_item_kind"]
          rank: number
          reference: string
          since: string
          summary: string
          target_id: string
        }[]
      }
      prefer_auditor: {
        Args: { p_audit_id: string; p_code: string }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_audit: {
        Args: { p_audit_id: string }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_no_team_present: {
        Args: { p_audit_id: string; p_note?: string }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_write_up: {
        Args: {
          p_audit_id: string
          p_moments: Database["public"]["Enums"]["audit_moment"][]
          p_note?: string
        }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_gate_audits: { Args: never; Returns: number }
      review_gate_reason: { Args: { p_audit_id: string }; Returns: string }
      selectable_auditors: {
        Args: {
          p_audit_type: Database["public"]["Enums"]["audit_type"]
          p_organisation_id: string
          p_postcode_area: string
          p_requires_av?: boolean
        }
        Returns: {
          audits_completed: number
          av_capable: boolean
          code: string
          state: string
          warning: string
        }[]
      }
      submit_write_up: {
        Args: { p_audit_id: string; p_results: Json }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      uuid_generate_v7: { Args: never; Returns: string }
      void_audit: {
        Args: { p_audit_id: string; p_reason: string }
        Returns: {
          address_line: string | null
          audit_type: Database["public"]["Enums"]["audit_type"]
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
          no_team_present_at: string | null
          pitch_detail: string | null
          postcode: string
          postcode_area: string | null
          postcode_outward: string | null
          preferred_auditor_id: string | null
          price_pence: number
          reference: string
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requires_av: boolean
          requires_review: boolean
          returned_at: string | null
          returned_moments: Database["public"]["Enums"]["audit_moment"][]
          review_note: string | null
          scheduled_for: string | null
          session_ended_at: string | null
          session_started_at: string | null
          shift_payment_method: Database["public"]["Enums"]["shift_payment_method"]
          site_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          updated_at: string
          window_end_on: string | null
          window_minutes: number | null
          window_start_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      write_up_due_hours: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "auditor" | "client" | "pick_admin"
      assignment_outcome:
        | "offered"
        | "accepted"
        | "declined"
        | "expired"
        | "withdrawn"
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
        | "booked"
        | "assigned"
        | "scheduled"
        | "in_progress"
        | "submitted"
        | "in_review"
        | "released"
        | "cancelled"
        | "no_team_present"
      audit_type: "street" | "door_to_door" | "private_site" | "lottery"
      auditor_approval_status: "pending" | "approved" | "suspended" | "rejected"
      check_outcome:
        | "pass"
        | "fail"
        | "not_applicable"
        | "not_observed"
        | "note"
      complaint_status: "open" | "acknowledged" | "resolved" | "withdrawn"
      complaint_subject: "about_audit" | "about_fundraiser"
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
      eligibility_flag:
        | "conflict"
        | "familiarity"
        | "exposure"
        | "capability"
        | "reach"
      evidence_kind: "photo" | "audio" | "video" | "document"
      flag_severity: "wrong" | "note" | "fine"
      observation_kind: "note" | "timing" | "count" | "incident"
      ops_item_kind:
        | "offer_expiring"
        | "review_gate"
        | "no_show"
        | "complaint"
        | "vetting"
        | "stale_write_up"
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
      shift_payment_method: "direct_debit" | "contactless"
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
      assignment_outcome: [
        "offered",
        "accepted",
        "declined",
        "expired",
        "withdrawn",
      ],
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
        "booked",
        "assigned",
        "scheduled",
        "in_progress",
        "submitted",
        "in_review",
        "released",
        "cancelled",
        "no_team_present",
      ],
      audit_type: ["street", "door_to_door", "private_site", "lottery"],
      auditor_approval_status: ["pending", "approved", "suspended", "rejected"],
      check_outcome: ["pass", "fail", "not_applicable", "not_observed", "note"],
      complaint_status: ["open", "acknowledged", "resolved", "withdrawn"],
      complaint_subject: ["about_audit", "about_fundraiser"],
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
      eligibility_flag: [
        "conflict",
        "familiarity",
        "exposure",
        "capability",
        "reach",
      ],
      evidence_kind: ["photo", "audio", "video", "document"],
      flag_severity: ["wrong", "note", "fine"],
      observation_kind: ["note", "timing", "count", "incident"],
      ops_item_kind: [
        "offer_expiring",
        "review_gate",
        "no_show",
        "complaint",
        "vetting",
        "stale_write_up",
      ],
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
      shift_payment_method: ["direct_debit", "contactless"],
      user_status: ["invited", "active", "suspended"],
    },
  },
} as const

