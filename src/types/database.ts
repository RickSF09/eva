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
          attempted_at: string | null
          call_type: string
          completed_at: string | null
          created_at: string
          elder_id: string
          id: string
          instructions: string | null
          meta_data: Json | null
          open_ai_call_id: string | null
          open_ai_session_id: string | null
          retry_count: number | null
          schedule_id: string | null
          scheduled_for: string
          status: string
          to_number: string | null
          twilio_call_sid: string | null
          twilio_child_call_sid: string | null
          updated_at: string
          vapi_call_id: string | null
          voice: string | null
          webhook_url: string | null
        }
        Insert: {
          attempted_at?: string | null
          call_type: string
          completed_at?: string | null
          created_at?: string
          elder_id: string
          id?: string
          instructions?: string | null
          meta_data?: Json | null
          open_ai_call_id?: string | null
          open_ai_session_id?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for: string
          status?: string
          to_number?: string | null
          twilio_call_sid?: string | null
          twilio_child_call_sid?: string | null
          updated_at?: string
          vapi_call_id?: string | null
          voice?: string | null
          webhook_url?: string | null
        }
        Update: {
          attempted_at?: string | null
          call_type?: string
          completed_at?: string | null
          created_at?: string
          elder_id?: string
          id?: string
          instructions?: string | null
          meta_data?: Json | null
          open_ai_call_id?: string | null
          open_ai_session_id?: string | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_for?: string
          status?: string
          to_number?: string | null
          twilio_call_sid?: string | null
          twilio_child_call_sid?: string | null
          updated_at?: string
          vapi_call_id?: string | null
          voice?: string | null
          webhook_url?: string | null
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
      device_events: {
        Row: {
          created_at: string
          device_id: string | null
          elder_id: string
          event_data: string | null
          event_timestamp: string
          event_type: string
          id: string
          location_data: Json | null
          processed: boolean | null
          triggered_execution_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          elder_id: string
          event_data?: string | null
          event_timestamp: string
          event_type: string
          id?: string
          location_data?: Json | null
          processed?: boolean | null
          triggered_execution_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          elder_id?: string
          event_data?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          location_data?: Json | null
          processed?: boolean | null
          triggered_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_events_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_events_triggered_execution_id_fkey"
            columns: ["triggered_execution_id"]
            isOneToOne: false
            referencedRelation: "call_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      device_settings: {
        Row: {
          battery_level: number | null
          created_at: string
          device_metadata: Json | null
          device_serial: string | null
          device_type: string | null
          elder_id: string
          fall_detection_enabled: boolean | null
          firmware_version: string | null
          geofence_radius_meters: number | null
          geofencing_enabled: boolean | null
          id: string
          last_heartbeat: string | null
          last_sync: string | null
          sos_button_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          device_metadata?: Json | null
          device_serial?: string | null
          device_type?: string | null
          elder_id: string
          fall_detection_enabled?: boolean | null
          firmware_version?: string | null
          geofence_radius_meters?: number | null
          geofencing_enabled?: boolean | null
          id?: string
          last_heartbeat?: string | null
          last_sync?: string | null
          sos_button_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          device_metadata?: Json | null
          device_serial?: string | null
          device_type?: string | null
          elder_id?: string
          fall_detection_enabled?: boolean | null
          firmware_version?: string | null
          geofence_radius_meters?: number | null
          geofencing_enabled?: boolean | null
          id?: string
          last_heartbeat?: string | null
          last_sync?: string | null
          sos_button_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_settings_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
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
          emergency_instructions: string | null
          first_name: string
          geofence_boundaries: Json | null
          id: string
          last_name: string
          location_coordinates: Json | null
          medical_conditions: string | null
          medications: string | null
          org_id: string | null
          personal_info: string | null
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          emergency_instructions?: string | null
          first_name: string
          geofence_boundaries?: Json | null
          id?: string
          last_name: string
          location_coordinates?: Json | null
          medical_conditions?: string | null
          medications?: string | null
          org_id?: string | null
          personal_info?: string | null
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          created_at?: string
          emergency_instructions?: string | null
          first_name?: string
          geofence_boundaries?: Json | null
          id?: string
          last_name?: string
          location_coordinates?: Json | null
          medical_conditions?: string | null
          medications?: string | null
          org_id?: string | null
          personal_info?: string | null
          phone?: string
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
          contact_response: string | null
          created_at: string
          emergency_contact_id: string
          escalation_incident_id: string
          id: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          attempt_order: number
          call_duration_seconds?: number | null
          call_execution_id?: string | null
          contact_method: string
          contact_response?: string | null
          created_at?: string
          emergency_contact_id: string
          escalation_incident_id: string
          id?: string
          status: string
        }
        Update: {
          answered_at?: string | null
          attempt_order?: number
          call_duration_seconds?: number | null
          call_execution_id?: string | null
          contact_method?: string
          contact_response?: string | null
          created_at?: string
          emergency_contact_id?: string
          escalation_incident_id?: string
          id?: string
          status?: string
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
          call_ended_at: string | null
          call_started_at: string
          call_status: string
          confidence_score: number | null
          created_at: string
          duration_seconds: number | null
          elder_id: string
          escalation_data: Json | null
          escalation_triggered: boolean | null
          execution_id: string
          health_indicators: Json | null
          id: string
          mood_assessment: string | null
          recording_url: string | null
          sentiment_score: number | null
          summary: string | null
          tone_analysis: string | null
          transcript: string | null
          twilio_cost_usd: number | null
          vapi_call_id: string | null
          vapi_cost_pence: number | null
        }
        Insert: {
          agenda_completion?: Json | null
          call_ended_at?: string | null
          call_started_at: string
          call_status: string
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          elder_id: string
          escalation_data?: Json | null
          escalation_triggered?: boolean | null
          execution_id: string
          health_indicators?: Json | null
          id?: string
          mood_assessment?: string | null
          recording_url?: string | null
          sentiment_score?: number | null
          summary?: string | null
          tone_analysis?: string | null
          transcript?: string | null
          twilio_cost_usd?: number | null
          vapi_call_id?: string | null
          vapi_cost_pence?: number | null
        }
        Update: {
          agenda_completion?: Json | null
          call_ended_at?: string | null
          call_started_at?: string
          call_status?: string
          confidence_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          elder_id?: string
          escalation_data?: Json | null
          escalation_triggered?: boolean | null
          execution_id?: string
          health_indicators?: Json | null
          id?: string
          mood_assessment?: string | null
          recording_url?: string | null
          sentiment_score?: number | null
          summary?: string | null
          tone_analysis?: string | null
          transcript?: string | null
          twilio_cost_usd?: number | null
          vapi_call_id?: string | null
          vapi_cost_pence?: number | null
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
          account_type: "b2b" | "b2c" | null
          auth_user_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_current_period_end: string | null
          subscription_plan: string | null
          subscription_status: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: "b2b" | "b2c" | null
          auth_user_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: "b2b" | "b2c" | null
          auth_user_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_current_period_end?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          phone?: string | null
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
    Enums: {},
  },
} as const


