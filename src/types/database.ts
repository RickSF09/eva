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
      call_executions: {
        Row: {
          answered_by: string | null
          attempted_at: string | null
          call_type: string
          completed_at: string | null
          cost_metadata: Json | null
          created_at: string
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
      daily_reports: {
        Row: {
          average_call_duration: number | null
          average_sentiment_score: number | null
          call_summary_stats: Json | null
          created_at: string
          device_events_count: number | null
          elder_id: string
          email_sent: boolean | null
          email_sent_at: string | null
          escalations: number | null
          failed_calls: number | null
          health_metrics: Json | null
          id: string
          missed_calls: number | null
          overall_mood: string | null
          overall_tone: string | null
          report_date: string
          successful_calls: number | null
          summary: string | null
          total_call_costs: number | null
          total_calls_attempted: number | null
          total_calls_scheduled: number | null
        }
        Insert: {
          average_call_duration?: number | null
          average_sentiment_score?: number | null
          call_summary_stats?: Json | null
          created_at?: string
          device_events_count?: number | null
          elder_id: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          escalations?: number | null
          failed_calls?: number | null
          health_metrics?: Json | null
          id?: string
          missed_calls?: number | null
          overall_mood?: string | null
          overall_tone?: string | null
          report_date: string
          successful_calls?: number | null
          summary?: string | null
          total_call_costs?: number | null
          total_calls_attempted?: number | null
          total_calls_scheduled?: number | null
        }
        Update: {
          average_call_duration?: number | null
          average_sentiment_score?: number | null
          call_summary_stats?: Json | null
          created_at?: string
          device_events_count?: number | null
          elder_id?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          escalations?: number | null
          failed_calls?: number | null
          health_metrics?: Json | null
          id?: string
          missed_calls?: number | null
          overall_mood?: string | null
          overall_tone?: string | null
          report_date?: string
          successful_calls?: number | null
          summary?: string | null
          total_call_costs?: number | null
          total_calls_attempted?: number | null
          total_calls_scheduled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
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
          ai_concerns: Json | null
          ai_early_warnings: Json | null
          ai_narrative: string | null
          ai_recommendations: Json | null
          analysis_date: string
          avg_energy_level: number | null
          avg_mood_score: number | null
          avg_pain_level: number | null
          call_completion_rate: number | null
          created_at: string | null
          elder_id: string
          energy_trend: number | null
          escalations_count: number | null
          id: string
          mood_trend: number | null
          overall_health_score: number | null
          pain_trend: number | null
          period_days: number | null
          risk_level: string | null
          trend_direction: string | null
        }
        Insert: {
          ai_concerns?: Json | null
          ai_early_warnings?: Json | null
          ai_narrative?: string | null
          ai_recommendations?: Json | null
          analysis_date?: string
          avg_energy_level?: number | null
          avg_mood_score?: number | null
          avg_pain_level?: number | null
          call_completion_rate?: number | null
          created_at?: string | null
          elder_id: string
          energy_trend?: number | null
          escalations_count?: number | null
          id?: string
          mood_trend?: number | null
          overall_health_score?: number | null
          pain_trend?: number | null
          period_days?: number | null
          risk_level?: string | null
          trend_direction?: string | null
        }
        Update: {
          ai_concerns?: Json | null
          ai_early_warnings?: Json | null
          ai_narrative?: string | null
          ai_recommendations?: Json | null
          analysis_date?: string
          avg_energy_level?: number | null
          avg_mood_score?: number | null
          avg_pain_level?: number | null
          call_completion_rate?: number | null
          created_at?: string | null
          elder_id?: string
          energy_trend?: number | null
          escalations_count?: number | null
          id?: string
          mood_trend?: number | null
          overall_health_score?: number | null
          pain_trend?: number | null
          period_days?: number | null
          risk_level?: string | null
          trend_direction?: string | null
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
      elders: {
        Row: {
          active: boolean | null
          address: string | null
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
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
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
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
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
          email_cadence: string
          id: string
          include_recording: boolean
          include_transcript: boolean
          only_if_call: boolean
          send_time_local: string
          timezone: string
          to_emails: Json | null
          updated_at: string
          user_id: string
          weekly_day_of_week: number | null
        }
        Insert: {
          created_at?: string
          email_cadence?: string
          id?: string
          include_recording?: boolean
          include_transcript?: boolean
          only_if_call?: boolean
          send_time_local?: string
          timezone?: string
          to_emails?: Json | null
          updated_at?: string
          user_id: string
          weekly_day_of_week?: number | null
        }
        Update: {
          created_at?: string
          email_cadence?: string
          id?: string
          include_recording?: boolean
          include_transcript?: boolean
          only_if_call?: boolean
          send_time_local?: string
          timezone?: string
          to_emails?: Json | null
          updated_at?: string
          user_id?: string
          weekly_day_of_week?: number | null
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
          auth_user_id: string | null
          call_recording_notified: boolean | null
          call_recording_notified_timestamp: boolean | null
          created_at: string
          email: string
          family_consent_given: boolean | null
          family_consent_given_timestamp: string[] | null
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
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          auth_user_id?: string | null
          call_recording_notified?: boolean | null
          call_recording_notified_timestamp?: boolean | null
          created_at?: string
          email: string
          family_consent_given?: boolean | null
          family_consent_given_timestamp?: string[] | null
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
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          auth_user_id?: string | null
          call_recording_notified?: boolean | null
          call_recording_notified_timestamp?: boolean | null
          created_at?: string
          email?: string
          family_consent_given?: boolean | null
          family_consent_given_timestamp?: string[] | null
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
          subscription_plan?: string | null
          subscription_status?: string | null
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
    }
    Functions: {
      add_user_to_organization: {
        Args: { p_auth_user_id: string; p_org_id: string; p_role?: string }
        Returns: string
      }
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
      dispatch_scheduled_calls: { Args: never; Returns: number }
      get_user_organizations: {
        Args: { p_auth_user_id?: string }
        Returns: {
          org_id: string
          role: string
        }[]
      }
      schedule_next_call: {
        Args: {
          p_base_time?: string
          p_elder_id: string
          p_schedule_id: string
        }
        Returns: string
      }
    }
    Enums: {
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
      eva_communication_style_enum: ["caring", "witty", "serious"],
      max_retries_action: ["email", "escalate"],
    },
  },
} as const
