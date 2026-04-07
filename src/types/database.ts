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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      billing_period_usage: {
        Row: {
          bucket_type: string
          call_count: number
          created_at: string
          elder_id: string | null
          id: string
          minutes_included: number
          minutes_used: number
          overage_cost_pence: number
          overage_minutes: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket_type: string
          call_count?: number
          created_at?: string
          elder_id?: string | null
          id?: string
          minutes_included?: number
          minutes_used?: number
          overage_cost_pence?: number
          overage_minutes?: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket_type?: string
          call_count?: number
          created_at?: string
          elder_id?: string | null
          id?: string
          minutes_included?: number
          minutes_used?: number
          overage_cost_pence?: number
          overage_minutes?: number
          period_end?: string
          period_start?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_period_usage_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_period_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_period_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "billing_period_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          cost_breakdown: Json | null
          created_at: string
          elder_id: string | null
          id: string
          invoice_number: string | null
          org_id: string | null
          status: string | null
          total_calls: number | null
          total_cost: number | null
          total_minutes: number | null
          twilio_costs: number | null
          user_id: string
          vapi_costs: number | null
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          cost_breakdown?: Json | null
          created_at?: string
          elder_id?: string | null
          id?: string
          invoice_number?: string | null
          org_id?: string | null
          status?: string | null
          total_calls?: number | null
          total_cost?: number | null
          total_minutes?: number | null
          twilio_costs?: number | null
          user_id: string
          vapi_costs?: number | null
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          cost_breakdown?: Json | null
          created_at?: string
          elder_id?: string | null
          id?: string
          invoice_number?: string | null
          org_id?: string | null
          status?: string | null
          total_calls?: number | null
          total_cost?: number | null
          total_minutes?: number | null
          twilio_costs?: number | null
          user_id?: string
          vapi_costs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "billing_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscriptions: {
        Row: {
          billing_activated_at: string | null
          billing_phase: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          inbound_minutes_included: number
          inbound_plan_slug: string | null
          inbound_stripe_item_id: string | null
          outbound_minutes_included: number
          outbound_plan_slug: string
          overage_enabled: boolean
          overage_product_id: string | null
          overage_spend_cap_pence: number
          overage_stripe_item_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_calls_completed: number
          trial_calls_required: number
          trial_completed_at: string | null
          trial_minutes_ceiling: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_activated_at?: string | null
          billing_phase?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          inbound_minutes_included?: number
          inbound_plan_slug?: string | null
          inbound_stripe_item_id?: string | null
          outbound_minutes_included: number
          outbound_plan_slug: string
          overage_enabled?: boolean
          overage_product_id?: string | null
          overage_spend_cap_pence?: number
          overage_stripe_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_calls_completed?: number
          trial_calls_required?: number
          trial_completed_at?: string | null
          trial_minutes_ceiling?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_activated_at?: string | null
          billing_phase?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          inbound_minutes_included?: number
          inbound_plan_slug?: string | null
          inbound_stripe_item_id?: string | null
          outbound_minutes_included?: number
          outbound_plan_slug?: string
          overage_enabled?: boolean
          overage_product_id?: string | null
          overage_spend_cap_pence?: number
          overage_stripe_item_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_calls_completed?: number
          trial_calls_required?: number
          trial_completed_at?: string | null
          trial_minutes_ceiling?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "billing_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_trial_reminders: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string
          trial_end_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id: string
          trial_end_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string
          trial_end_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_trial_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "billing_trial_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_executions: {
        Row: {
          answered_by: string | null
          attempted_at: string | null
          call_type: string
          completed_at: string | null
          cost_metadata: Json | null
          created_at: string
          direction: Database["public"]["Enums"]["call_direction"] | null
          duration: number | null
          elder_id: string
          ended_by: string | null
          error_message: string | null
          id: string
          inbound_call_back: boolean | null
          onboarding_call: boolean | null
          open_ai_call_id: string | null
          open_ai_session_id: string | null
          outbound_call_back: boolean | null
          picked_up: boolean | null
          provider_payload: Json | null
          retry_call: boolean | null
          retry_count: number | null
          schedule_id: string | null
          scheduled_for: string | null
          snapshot_config: Json | null
          status: string
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          answered_by?: string | null
          attempted_at?: string | null
          call_type: string
          completed_at?: string | null
          cost_metadata?: Json | null
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"] | null
          duration?: number | null
          elder_id: string
          ended_by?: string | null
          error_message?: string | null
          id?: string
          inbound_call_back?: boolean | null
          onboarding_call?: boolean | null
          open_ai_call_id?: string | null
          open_ai_session_id?: string | null
          outbound_call_back?: boolean | null
          picked_up?: boolean | null
          provider_payload?: Json | null
          retry_call?: boolean | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for?: string | null
          snapshot_config?: Json | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          answered_by?: string | null
          attempted_at?: string | null
          call_type?: string
          completed_at?: string | null
          cost_metadata?: Json | null
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"] | null
          duration?: number | null
          elder_id?: string
          ended_by?: string | null
          error_message?: string | null
          id?: string
          inbound_call_back?: boolean | null
          onboarding_call?: boolean | null
          open_ai_call_id?: string | null
          open_ai_session_id?: string | null
          outbound_call_back?: boolean | null
          picked_up?: boolean | null
          provider_payload?: Json | null
          retry_call?: boolean | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for?: string | null
          snapshot_config?: Json | null
          status?: string
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_executions_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "call_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      call_requests: {
        Row: {
          call_id: string | null
          created_at: string | null
          description: string
          elder_id: string | null
          id: string
          quote: string | null
          resolved: boolean | null
          resolved_at: string | null
          type: string | null
          urgency: string | null
        }
        Insert: {
          call_id?: string | null
          created_at?: string | null
          description: string
          elder_id?: string | null
          id?: string
          quote?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          type?: string | null
          urgency?: string | null
        }
        Update: {
          call_id?: string | null
          created_at?: string | null
          description?: string
          elder_id?: string | null
          id?: string
          quote?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          type?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_requests_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "post_call_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_requests_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      call_schedules: {
        Row: {
          active: boolean | null
          call_times: Json
          checklist: Json | null
          created_at: string
          days_of_week: Json | null
          description: string | null
          frequency: string
          id: string
          max_retries: number | null
          max_retries_action: Database["public"]["Enums"]["max_retries_action"]
          name: string | null
          org_id: string | null
          retry_after_minutes: number
          schedule_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          call_times: Json
          checklist?: Json | null
          created_at?: string
          days_of_week?: Json | null
          description?: string | null
          frequency: string
          id?: string
          max_retries?: number | null
          max_retries_action?: Database["public"]["Enums"]["max_retries_action"]
          name?: string | null
          org_id?: string | null
          retry_after_minutes: number
          schedule_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          call_times?: Json
          checklist?: Json | null
          created_at?: string
          days_of_week?: Json | null
          description?: string | null
          frequency?: string
          id?: string
          max_retries?: number | null
          max_retries_action?: Database["public"]["Enums"]["max_retries_action"]
          name?: string | null
          org_id?: string | null
          retry_after_minutes?: number
          schedule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_calls: {
        Row: {
          analysis: Json | null
          audio_url: string | null
          created_at: string | null
          duration_seconds: number | null
          email_sent: boolean | null
          email_sent_at: string | null
          ended_at: string | null
          id: string
          lead_id: string | null
          session_id: string
          started_at: string | null
          total_cost_usd: number | null
          total_tokens: number | null
          transcript: Json | null
          updated_at: string | null
        }
        Insert: {
          analysis?: Json | null
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          session_id: string
          started_at?: string | null
          total_cost_usd?: number | null
          total_tokens?: number | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Update: {
          analysis?: Json | null
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          session_id?: string
          started_at?: string | null
          total_cost_usd?: number | null
          total_tokens?: number | null
          transcript?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "demo_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      elder_analysis_reports: {
        Row: {
          answered_calls_week: number
          confidence: string
          created_at: string
          elder_id: string
          engagement_metrics: Json
          generated_at: string
          hours_called_week: number
          id: string
          loneliness_metrics: Json
          minutes_called_week: number
          social_metrics: Json
          supporting_health_metrics: Json
          updated_at: string
          week_end_utc: string
          week_start_utc: string
        }
        Insert: {
          answered_calls_week?: number
          confidence?: string
          created_at?: string
          elder_id: string
          engagement_metrics?: Json
          generated_at?: string
          hours_called_week?: number
          id?: string
          loneliness_metrics?: Json
          minutes_called_week?: number
          social_metrics?: Json
          supporting_health_metrics?: Json
          updated_at?: string
          week_end_utc: string
          week_start_utc: string
        }
        Update: {
          answered_calls_week?: number
          confidence?: string
          created_at?: string
          elder_id?: string
          engagement_metrics?: Json
          generated_at?: string
          hours_called_week?: number
          id?: string
          loneliness_metrics?: Json
          minutes_called_week?: number
          social_metrics?: Json
          supporting_health_metrics?: Json
          updated_at?: string
          week_end_utc?: string
          week_start_utc?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_analysis_reports_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_call_schedules: {
        Row: {
          active: boolean | null
          created_at: string
          custom_overrides: Json | null
          elder_id: string
          id: string
          schedule_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          custom_overrides?: Json | null
          elder_id: string
          id?: string
          schedule_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          custom_overrides?: Json | null
          elder_id?: string
          id?: string
          schedule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_call_schedules_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elder_call_schedules_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "call_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_emergency_contact: {
        Row: {
          created_at: string
          elder_id: string | null
          emergency_contact_id: string | null
          id: string
          "priority order": number | null
          relation: string | null
        }
        Insert: {
          created_at?: string
          elder_id?: string | null
          emergency_contact_id?: string | null
          id?: string
          "priority order"?: number | null
          relation?: string | null
        }
        Update: {
          created_at?: string
          elder_id?: string | null
          emergency_contact_id?: string | null
          id?: string
          "priority order"?: number | null
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elder_emergency_contact_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elder_emergency_contact_emergency_contact_id_fkey"
            columns: ["emergency_contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_prompt_context_cache: {
        Row: {
          created_at: string
          elder_id: string
          error_message: string | null
          generated_at: string
          generation_status: string
          last_call_at: string | null
          last_call_execution_id: string | null
          last_call_summary: string | null
          last_post_call_report_id: string | null
          older_call_info: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          elder_id: string
          error_message?: string | null
          generated_at?: string
          generation_status?: string
          last_call_at?: string | null
          last_call_execution_id?: string | null
          last_call_summary?: string | null
          last_post_call_report_id?: string | null
          older_call_info?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          elder_id?: string
          error_message?: string | null
          generated_at?: string
          generation_status?: string
          last_call_at?: string | null
          last_call_execution_id?: string | null
          last_call_summary?: string | null
          last_post_call_report_id?: string | null
          older_call_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_prompt_context_cache_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: true
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elder_prompt_context_cache_last_call_execution_id_fkey"
            columns: ["last_call_execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elder_prompt_context_cache_last_post_call_report_id_fkey"
            columns: ["last_post_call_report_id"]
            isOneToOne: false
            referencedRelation: "post_call_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      elder_trend_reports: {
        Row: {
          anchor_week_end_utc: string
          anchor_week_start_utc: string
          created_at: string
          domain_trends: Json
          elder_id: string
          emerging_concerns: Json
          follow_up_points: Json
          generated_at: string
          happy_moments: Json
          id: string
          improving_signals: Json
          overall_trend_state: string
          period_discussion_summary: string
          remarkable_events: Json
          source_call_count: number
          source_week_count: number
          trend_confidence: string
          trend_features: Json
          updated_at: string
          weekly_series: Json
          window_weeks: number
        }
        Insert: {
          anchor_week_end_utc: string
          anchor_week_start_utc: string
          created_at?: string
          domain_trends?: Json
          elder_id: string
          emerging_concerns?: Json
          follow_up_points?: Json
          generated_at?: string
          happy_moments?: Json
          id?: string
          improving_signals?: Json
          overall_trend_state: string
          period_discussion_summary?: string
          remarkable_events?: Json
          source_call_count?: number
          source_week_count?: number
          trend_confidence: string
          trend_features?: Json
          updated_at?: string
          weekly_series?: Json
          window_weeks?: number
        }
        Update: {
          anchor_week_end_utc?: string
          anchor_week_start_utc?: string
          created_at?: string
          domain_trends?: Json
          elder_id?: string
          emerging_concerns?: Json
          follow_up_points?: Json
          generated_at?: string
          happy_moments?: Json
          id?: string
          improving_signals?: Json
          overall_trend_state?: string
          period_discussion_summary?: string
          remarkable_events?: Json
          source_call_count?: number
          source_week_count?: number
          trend_confidence?: string
          trend_features?: Json
          updated_at?: string
          weekly_series?: Json
          window_weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "elder_trend_reports_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      elders: {
        Row: {
          active: boolean | null
          address: string | null
          consent_decision_at: string | null
          consent_method: string | null
          consent_notes: string | null
          consent_obtained_at: string | null
          consent_pathway: string
          consent_recorded_by: string | null
          consent_recording_storage_path: string | null
          consent_status: string
          created_at: string
          eva_communication_style: Database["public"]["Enums"]["eva_communication_style_enum"]
          first_name: string
          id: string
          last_name: string
          medical_conditions: string | null
          medications: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          org_id: string | null
          personal_info: string | null
          phone: string
          preferences: Json | null
          self_consent_capable_confirmed: boolean
          self_consent_capable_confirmed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          consent_decision_at?: string | null
          consent_method?: string | null
          consent_notes?: string | null
          consent_obtained_at?: string | null
          consent_pathway?: string
          consent_recorded_by?: string | null
          consent_recording_storage_path?: string | null
          consent_status?: string
          created_at?: string
          eva_communication_style?: Database["public"]["Enums"]["eva_communication_style_enum"]
          first_name: string
          id?: string
          last_name: string
          medical_conditions?: string | null
          medications?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          org_id?: string | null
          personal_info?: string | null
          phone: string
          preferences?: Json | null
          self_consent_capable_confirmed?: boolean
          self_consent_capable_confirmed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          consent_decision_at?: string | null
          consent_method?: string | null
          consent_notes?: string | null
          consent_obtained_at?: string | null
          consent_pathway?: string
          consent_recorded_by?: string | null
          consent_recording_storage_path?: string | null
          consent_status?: string
          created_at?: string
          eva_communication_style?: Database["public"]["Enums"]["eva_communication_style_enum"]
          first_name?: string
          id?: string
          last_name?: string
          medical_conditions?: string | null
          medications?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          org_id?: string | null
          personal_info?: string | null
          phone?: string
          preferences?: Json | null
          self_consent_capable_confirmed?: boolean
          self_consent_capable_confirmed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "elders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          provider: string
          provider_event_id: string | null
          provider_message_id: string | null
          received_at: string
          signature_verified: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          payload: Json
          provider?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          received_at?: string
          signature_verified?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          provider?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          received_at?: string
          signature_verified?: boolean
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          active: boolean | null
          created_at: string
          email: string | null
          id: string
          last_contacted_at: string | null
          name: string
          org_id: string | null
          phone: string
          preferred_contact_hours: Json | null
          response_rate: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          org_id?: string | null
          phone: string
          preferred_contact_hours?: Json | null
          response_rate?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          org_id?: string | null
          phone?: string
          preferred_contact_hours?: Json | null
          response_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_contact_attempts: {
        Row: {
          answered_at: string | null
          attempt_order: number
          call_duration_seconds: number | null
          call_execution_id: string | null
          contact_method: string
          could_resolve: boolean | null
          created_at: string
          emergency_contact_id: string | null
          escalation_incident_id: string | null
          id: string
          status: string
          summary: string | null
        }
        Insert: {
          answered_at?: string | null
          attempt_order: number
          call_duration_seconds?: number | null
          call_execution_id?: string | null
          contact_method: string
          could_resolve?: boolean | null
          created_at?: string
          emergency_contact_id?: string | null
          escalation_incident_id?: string | null
          id?: string
          status: string
          summary?: string | null
        }
        Update: {
          answered_at?: string | null
          attempt_order?: number
          call_duration_seconds?: number | null
          call_execution_id?: string | null
          contact_method?: string
          could_resolve?: boolean | null
          created_at?: string
          emergency_contact_id?: string | null
          escalation_incident_id?: string | null
          id?: string
          status?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_contact_attempts_call_execution_id_fkey"
            columns: ["call_execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_contact_attempts_emergency_contact_id_fkey"
            columns: ["emergency_contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_contact_attempts_escalation_incident_id_fkey"
            columns: ["escalation_incident_id"]
            isOneToOne: false
            referencedRelation: "escalation_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_followups: {
        Row: {
          call_execution_id: string | null
          created_at: string
          elder_response: string | null
          escalation_incident_id: string
          followup_type: string
          help_arrived: boolean | null
          id: string
          needs_further_escalation: boolean | null
          post_call_report_id: string | null
          scheduled_for: string
          status: string
        }
        Insert: {
          call_execution_id?: string | null
          created_at?: string
          elder_response?: string | null
          escalation_incident_id: string
          followup_type: string
          help_arrived?: boolean | null
          id?: string
          needs_further_escalation?: boolean | null
          post_call_report_id?: string | null
          scheduled_for: string
          status?: string
        }
        Update: {
          call_execution_id?: string | null
          created_at?: string
          elder_response?: string | null
          escalation_incident_id?: string
          followup_type?: string
          help_arrived?: boolean | null
          id?: string
          needs_further_escalation?: boolean | null
          post_call_report_id?: string | null
          scheduled_for?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_followups_call_execution_id_fkey"
            columns: ["call_execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_followups_escalation_incident_id_fkey"
            columns: ["escalation_incident_id"]
            isOneToOne: false
            referencedRelation: "escalation_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_followups_post_call_report_id_fkey"
            columns: ["post_call_report_id"]
            isOneToOne: false
            referencedRelation: "post_call_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_incidents: {
        Row: {
          created_at: string
          elder_consent: boolean | null
          elder_id: string
          escalation_reason: string
          id: string
          original_call_execution_id: string | null
          original_post_call_report_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity_level: string
          skip_followup: boolean
          status: string
          updated_at: string
          vapi_tool_call_data: Json | null
        }
        Insert: {
          created_at?: string
          elder_consent?: boolean | null
          elder_id: string
          escalation_reason: string
          id?: string
          original_call_execution_id?: string | null
          original_post_call_report_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity_level: string
          skip_followup?: boolean
          status?: string
          updated_at?: string
          vapi_tool_call_data?: Json | null
        }
        Update: {
          created_at?: string
          elder_consent?: boolean | null
          elder_id?: string
          escalation_reason?: string
          id?: string
          original_call_execution_id?: string | null
          original_post_call_report_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity_level?: string
          skip_followup?: boolean
          status?: string
          updated_at?: string
          vapi_tool_call_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_incidents_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_incidents_original_call_execution_id_fkey"
            columns: ["original_call_execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_incidents_original_post_call_report_id_fkey"
            columns: ["original_post_call_report_id"]
            isOneToOne: false
            referencedRelation: "post_call_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sends: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          period_end: string | null
          period_start: string | null
          provider_message_id: string | null
          resource_id: string | null
          resource_type: string
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          provider_message_id?: string | null
          resource_id?: string | null
          resource_type: string
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          provider_message_id?: string | null
          resource_id?: string | null
          resource_type?: string
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_sends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          email_normalized: string | null
          expires_at: string | null
          id: string
          org_id: string
          role: string
          status: string
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          email_normalized?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          role?: string
          status?: string
          token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          email_normalized?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_org_id_fkey"
            columns: ["org_id"]
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
          settings: Json | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_call_reports: {
        Row: {
          agenda_completion: Json | null
          callback_analysis: Json | null
          checklist_completion: Json | null
          conversation_quality: Json | null
          created_at: string
          elder_id: string
          escalation_data: Json | null
          escalation_triggered: boolean | null
          execution_id: string
          health_indicators: Json | null
          id: string
          loneliness_indicators: Json | null
          mental_health: Json | null
          onboarding_data: Json | null
          physical_health: Json | null
          recording_storage_path: string | null
          recording_url: string | null
          social_environment: Json | null
          summary: string | null
          transcript: Json | null
          transcript_raw: string | null
        }
        Insert: {
          agenda_completion?: Json | null
          callback_analysis?: Json | null
          checklist_completion?: Json | null
          conversation_quality?: Json | null
          created_at?: string
          elder_id: string
          escalation_data?: Json | null
          escalation_triggered?: boolean | null
          execution_id: string
          health_indicators?: Json | null
          id?: string
          loneliness_indicators?: Json | null
          mental_health?: Json | null
          onboarding_data?: Json | null
          physical_health?: Json | null
          recording_storage_path?: string | null
          recording_url?: string | null
          social_environment?: Json | null
          summary?: string | null
          transcript?: Json | null
          transcript_raw?: string | null
        }
        Update: {
          agenda_completion?: Json | null
          callback_analysis?: Json | null
          checklist_completion?: Json | null
          conversation_quality?: Json | null
          created_at?: string
          elder_id?: string
          escalation_data?: Json | null
          escalation_triggered?: boolean | null
          execution_id?: string
          health_indicators?: Json | null
          id?: string
          loneliness_indicators?: Json | null
          mental_health?: Json | null
          onboarding_data?: Json | null
          physical_health?: Json | null
          recording_storage_path?: string | null
          recording_url?: string | null
          social_environment?: Json | null
          summary?: string | null
          transcript?: Json | null
          transcript_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_call_reports_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_reports_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_prefs: {
        Row: {
          created_at: string
          id: string
          include_recording: boolean
          include_transcript: boolean
          only_if_call: boolean
          per_call_email_enabled: boolean
          send_time_local: string
          timezone: string
          to_emails: Json | null
          updated_at: string
          user_id: string
          weekly_day_of_week: number | null
          weekly_email_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          include_recording?: boolean
          include_transcript?: boolean
          only_if_call?: boolean
          per_call_email_enabled?: boolean
          send_time_local?: string
          timezone?: string
          to_emails?: Json | null
          updated_at?: string
          user_id: string
          weekly_day_of_week?: number | null
          weekly_email_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          include_recording?: boolean
          include_transcript?: boolean
          only_if_call?: boolean
          per_call_email_enabled?: boolean
          send_time_local?: string
          timezone?: string
          to_emails?: Json | null
          updated_at?: string
          user_id?: string
          weekly_day_of_week?: number | null
          weekly_email_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_notification_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          org_id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          org_id: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          org_id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_current_context"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_type: string
          active_billing_subscription_id: string | null
          auth_user_id: string | null
          billing_phase: string | null
          call_recording_notified: boolean | null
          call_recording_notified_timestamp: string | null
          created_at: string
          email: string
          family_consent_given: boolean | null
          family_consent_given_timestamp: string | null
          first_name: string
          health_data_processing_consent: boolean | null
          health_data_processing_consent_timestamp: string | null
          id: string
          last_name: string
          phone: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_current_period_end: string | null
          subscription_current_period_start: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          active_billing_subscription_id?: string | null
          auth_user_id?: string | null
          billing_phase?: string | null
          call_recording_notified?: boolean | null
          call_recording_notified_timestamp?: string | null
          created_at?: string
          email: string
          family_consent_given?: boolean | null
          family_consent_given_timestamp?: string | null
          first_name: string
          health_data_processing_consent?: boolean | null
          health_data_processing_consent_timestamp?: string | null
          id?: string
          last_name: string
          phone?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          active_billing_subscription_id?: string | null
          auth_user_id?: string | null
          billing_phase?: string | null
          call_recording_notified?: boolean | null
          call_recording_notified_timestamp?: string | null
          created_at?: string
          email?: string
          family_consent_given?: boolean | null
          family_consent_given_timestamp?: string | null
          first_name?: string
          health_data_processing_consent?: boolean | null
          health_data_processing_consent_timestamp?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_current_period_end?: string | null
          subscription_current_period_start?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_active_billing_subscription_id_fkey"
            columns: ["active_billing_subscription_id"]
            isOneToOne: false
            referencedRelation: "billing_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_insights_cron_config: {
        Row: {
          auth_header: string | null
          enabled: boolean
          endpoint_url: string | null
          id: boolean
          run_trends: boolean
          trend_window_weeks: number
          updated_at: string
        }
        Insert: {
          auth_header?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: boolean
          run_trends?: boolean
          trend_window_weeks?: number
          updated_at?: string
        }
        Update: {
          auth_header?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: boolean
          run_trends?: boolean
          trend_window_weeks?: number
          updated_at?: string
        }
        Relationships: []
      }
      weekly_post_call_digest_cron_config: {
        Row: {
          auth_header: string | null
          enabled: boolean
          endpoint_url: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          auth_header?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          auth_header?: string | null
          enabled?: boolean
          endpoint_url?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_current_context: {
        Row: {
          auth_user_id: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          org_active: boolean | null
          org_id: string | null
          org_name: string | null
          org_role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_elder_weekly_metrics: {
        Row: {
          answered_calls_week: number | null
          avg_elder_talk_ratio: number | null
          avg_engagement_rating: number | null
          avg_isolation_risk_score: number | null
          avg_loneliness_score: number | null
          confidence: string | null
          elder_id: string | null
          hours_called_week: number | null
          id: string | null
          minutes_called_week: number | null
          missing_people_rate: number | null
          social_activities_mentioned_count: number | null
          social_isolation_rate: number | null
          support_system_strength_avg: number | null
          unique_contact_mentions: number | null
          week_end_utc: string | null
          week_start_utc: string | null
        }
        Insert: {
          answered_calls_week?: number | null
          avg_elder_talk_ratio?: never
          avg_engagement_rating?: never
          avg_isolation_risk_score?: never
          avg_loneliness_score?: never
          confidence?: string | null
          elder_id?: string | null
          hours_called_week?: number | null
          id?: string | null
          minutes_called_week?: number | null
          missing_people_rate?: never
          social_activities_mentioned_count?: never
          social_isolation_rate?: never
          support_system_strength_avg?: never
          unique_contact_mentions?: never
          week_end_utc?: string | null
          week_start_utc?: string | null
        }
        Update: {
          answered_calls_week?: number | null
          avg_elder_talk_ratio?: never
          avg_engagement_rating?: never
          avg_isolation_risk_score?: never
          avg_loneliness_score?: never
          confidence?: string | null
          elder_id?: string | null
          hours_called_week?: number | null
          id?: string | null
          minutes_called_week?: number | null
          missing_people_rate?: never
          social_activities_mentioned_count?: never
          social_isolation_rate?: never
          support_system_strength_avg?: never
          unique_contact_mentions?: never
          week_end_utc?: string | null
          week_start_utc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elder_analysis_reports_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_user_to_organization: {
        Args: { p_auth_user_id: string; p_org_id: string; p_role?: string }
        Returns: string
      }
      anonymize_old_call_executions: { Args: never; Returns: undefined }
      assign_schedule_to_elder: {
        Args: {
          p_custom_overrides?: Json
          p_elder_id: string
          p_schedule_id: string
        }
        Returns: string
      }
      create_emergency_call: {
        Args: { p_call_type: string; p_elder_id: string; p_trigger_data?: Json }
        Returns: string
      }
      create_organization_with_membership: {
        Args: {
          org_name: string
          user_email?: string
          user_first_name?: string
          user_last_name?: string
        }
        Returns: string
      }
      create_scheduled_execution: {
        Args: {
          p_elder_id: string
          p_schedule_id: string
          p_scheduled_for: string
        }
        Returns: string
      }
      delete_expired_invitations: { Args: never; Returns: undefined }
      delete_old_call_recordings: { Args: never; Returns: undefined }
      delete_old_call_transcripts: { Args: never; Returns: undefined }
      delete_old_demo_calls: { Args: never; Returns: undefined }
      delete_old_post_call_reports: { Args: never; Returns: undefined }
      dispatch_due_trial_reminders: {
        Args: {
          p_authorization: string
          p_limit?: number
          p_url: string
          p_window?: string
        }
        Returns: number
      }
      dispatch_scheduled_calls: { Args: never; Returns: number }
      dispatch_weekly_insights_generation: {
        Args: { p_week_start_utc?: string }
        Returns: Json
      }
      dispatch_weekly_post_call_digests: {
        Args: { p_now_utc?: string }
        Returns: Json
      }
      get_user_organizations: {
        Args: { p_auth_user_id?: string }
        Returns: {
          org_id: string
          role: string
        }[]
      }
      next_scheduled_time_from_json_schedule: {
        Args: { p_call_times: Json; p_days_of_week: Json; p_from_ts?: string }
        Returns: string
      }
      requeue_stale_trial_reminders: {
        Args: { p_stale?: string }
        Returns: number
      }
      run_trial_reminder_tick: {
        Args: { p_authorization: string; p_url: string }
        Returns: Json
      }
      run_weekly_insights_tick: { Args: never; Returns: Json }
      run_weekly_post_call_digest_tick: { Args: never; Returns: Json }
      schedule_next_call: {
        Args: {
          p_base_time?: string
          p_elder_id: string
          p_schedule_id: string
        }
        Returns: string
      }
      seed_pending_scheduled_calls_for_elder: {
        Args: { p_elder_id: string; p_from_ts?: string }
        Returns: number
      }
      send_consent_ops_slack_notification: {
        Args: { p_event: string }
        Returns: undefined
      }
      sync_trial_reminder_queue_from_users: {
        Args: { p_now?: string }
        Returns: Json
      }
      upsert_elder_prompt_context_cache: {
        Args: {
          p_elder_id: string
          p_error_message?: string
          p_generated_at?: string
          p_generation_status?: string
          p_last_call_at: string
          p_last_call_execution_id: string
          p_last_call_summary: string
          p_last_post_call_report_id: string
          p_older_call_info: string
        }
        Returns: {
          created_at: string
          elder_id: string
          error_message: string | null
          generated_at: string
          generation_status: string
          last_call_at: string | null
          last_call_execution_id: string | null
          last_call_summary: string | null
          last_post_call_report_id: string | null
          older_call_info: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "elder_prompt_context_cache"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      call_direction: "outbound" | "inbound"
      eva_communication_style_enum: "caring" | "witty" | "serious"
      max_retries_action: "email" | "escalate"
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
      call_direction: ["outbound", "inbound"],
      eva_communication_style_enum: ["caring", "witty", "serious"],
      max_retries_action: ["email", "escalate"],
    },
  },
} as const

