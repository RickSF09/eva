create type "public"."call_direction" as enum ('outbound', 'inbound');

create type "public"."eva_communication_style_enum" as enum ('caring', 'witty', 'serious');

create type "public"."max_retries_action" as enum ('email', 'escalate');


  create table "public"."billing_records" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "elder_id" uuid,
    "billing_period_start" date not null,
    "billing_period_end" date not null,
    "total_calls" integer default 0,
    "total_minutes" integer default 0,
    "total_cost" numeric(10,4) default 0.00,
    "vapi_costs" numeric(10,4) default 0.00,
    "twilio_costs" numeric(10,4) default 0.00,
    "cost_breakdown" jsonb default '{}'::jsonb,
    "status" text default 'pending'::text,
    "invoice_number" text,
    "created_at" timestamp with time zone not null default now(),
    "org_id" uuid
      );


alter table "public"."billing_records" enable row level security;


  create table "public"."billing_trial_reminders" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_subscription_id" text not null,
    "stripe_customer_id" text,
    "reminder_type" text not null,
    "trial_end_at" timestamp with time zone not null,
    "scheduled_for" timestamp with time zone not null,
    "status" text not null default 'pending'::text,
    "attempt_count" integer not null default 0,
    "last_error" text,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."call_executions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "elder_id" uuid not null,
    "schedule_id" uuid,
    "call_type" text not null,
    "status" text not null default 'pending'::text,
    "scheduled_for" timestamp with time zone,
    "attempted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "twilio_call_sid" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "retry_count" smallint default '0'::smallint,
    "open_ai_call_id" text,
    "open_ai_session_id" text,
    "answered_by" text,
    "ended_by" text,
    "picked_up" boolean,
    "onboarding_call" boolean default false,
    "retry_call" boolean default false,
    "inbound_call_back" boolean default false,
    "outbound_call_back" boolean default false,
    "snapshot_config" jsonb default '{}'::jsonb,
    "cost_metadata" jsonb default '{}'::jsonb,
    "provider_payload" jsonb default '{}'::jsonb,
    "error_message" text,
    "duration" bigint,
    "direction" public.call_direction
      );


alter table "public"."call_executions" enable row level security;


  create table "public"."call_requests" (
    "id" uuid not null default gen_random_uuid(),
    "call_id" uuid,
    "elder_id" uuid,
    "type" text,
    "description" text not null,
    "urgency" text,
    "quote" text,
    "resolved" boolean default false,
    "resolved_at" timestamp without time zone,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."call_requests" enable row level security;


  create table "public"."call_schedules" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "schedule_type" text not null default 'regular'::text,
    "frequency" text not null,
    "days_of_week" jsonb,
    "checklist" jsonb,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "org_id" uuid,
    "name" text,
    "description" text,
    "call_times" jsonb not null,
    "retry_after_minutes" integer not null,
    "max_retries" smallint default '2'::smallint,
    "max_retries_action" public.max_retries_action not null default 'email'::public.max_retries_action
      );


alter table "public"."call_schedules" enable row level security;


  create table "public"."demo_calls" (
    "id" uuid not null default gen_random_uuid(),
    "lead_id" uuid,
    "session_id" text not null,
    "started_at" timestamp with time zone default now(),
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "transcript" jsonb,
    "analysis" jsonb,
    "total_tokens" integer default 0,
    "total_cost_usd" numeric(10,6) default 0,
    "email_sent" boolean default false,
    "email_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "audio_url" text
      );


alter table "public"."demo_calls" enable row level security;


  create table "public"."demo_leads" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "email" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."demo_leads" enable row level security;


  create table "public"."elder_analysis_reports" (
    "id" uuid not null default gen_random_uuid(),
    "elder_id" uuid not null,
    "week_start_utc" date not null,
    "week_end_utc" date not null,
    "answered_calls_week" integer not null default 0,
    "minutes_called_week" numeric(10,2) not null default 0,
    "hours_called_week" numeric(10,2) not null default 0,
    "loneliness_metrics" jsonb not null default '{}'::jsonb,
    "social_metrics" jsonb not null default '{}'::jsonb,
    "engagement_metrics" jsonb not null default '{}'::jsonb,
    "supporting_health_metrics" jsonb not null default '{}'::jsonb,
    "confidence" text not null default 'low'::text,
    "generated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."elder_analysis_reports" enable row level security;


  create table "public"."elder_call_schedules" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "elder_id" uuid not null,
    "schedule_id" uuid not null,
    "active" boolean default true,
    "custom_overrides" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."elder_call_schedules" enable row level security;


  create table "public"."elder_emergency_contact" (
    "id" uuid not null default gen_random_uuid(),
    "emergency_contact_id" uuid,
    "elder_id" uuid,
    "priority order" smallint,
    "relation" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."elder_emergency_contact" enable row level security;


  create table "public"."elder_prompt_context_cache" (
    "elder_id" uuid not null,
    "last_call_execution_id" uuid,
    "last_post_call_report_id" uuid,
    "last_call_at" timestamp with time zone,
    "last_call_summary" text,
    "older_call_info" text,
    "generation_status" text not null default 'ready'::text,
    "error_message" text,
    "generated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."elder_trend_reports" (
    "id" uuid not null default gen_random_uuid(),
    "elder_id" uuid not null,
    "anchor_week_start_utc" date not null,
    "anchor_week_end_utc" date not null,
    "window_weeks" integer not null default 8,
    "source_week_count" integer not null default 0,
    "source_call_count" integer not null default 0,
    "overall_trend_state" text not null,
    "trend_confidence" text not null,
    "domain_trends" jsonb not null default '{}'::jsonb,
    "trend_features" jsonb not null default '{}'::jsonb,
    "weekly_series" jsonb not null default '[]'::jsonb,
    "period_discussion_summary" text not null default ''::text,
    "remarkable_events" jsonb not null default '[]'::jsonb,
    "happy_moments" jsonb not null default '[]'::jsonb,
    "follow_up_points" jsonb not null default '[]'::jsonb,
    "emerging_concerns" jsonb not null default '[]'::jsonb,
    "improving_signals" jsonb not null default '[]'::jsonb,
    "generated_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."elder_trend_reports" enable row level security;


  create table "public"."elders" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid,
    "first_name" text not null,
    "last_name" text not null,
    "phone" text not null,
    "address" text,
    "medical_conditions" text,
    "medications" text,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "org_id" uuid,
    "personal_info" text,
    "onboarding_completed" boolean default false,
    "onboarding_completed_at" timestamp with time zone,
    "preferences" jsonb default '{}'::jsonb,
    "eva_communication_style" public.eva_communication_style_enum not null default 'caring'::public.eva_communication_style_enum,
    "consent_pathway" text not null default 'direct_consent'::text,
    "consent_status" text not null default 'pending'::text,
    "consent_method" text,
    "consent_obtained_at" timestamp with time zone,
    "consent_decision_at" timestamp with time zone,
    "consent_recording_storage_path" text,
    "consent_recorded_by" text,
    "consent_notes" text,
    "self_consent_capable_confirmed" boolean not null default false,
    "self_consent_capable_confirmed_at" timestamp with time zone
      );


alter table "public"."elders" enable row level security;


  create table "public"."emergency_contacts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "phone" text not null,
    "email" text,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "last_contacted_at" timestamp with time zone,
    "response_rate" numeric default 0,
    "preferred_contact_hours" jsonb,
    "org_id" uuid
      );


alter table "public"."emergency_contacts" enable row level security;


  create table "public"."escalation_contact_attempts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "escalation_incident_id" uuid,
    "emergency_contact_id" uuid,
    "attempt_order" integer not null,
    "contact_method" text not null,
    "call_execution_id" uuid,
    "status" text not null,
    "answered_at" timestamp with time zone,
    "call_duration_seconds" integer,
    "summary" text,
    "created_at" timestamp with time zone not null default now(),
    "could_resolve" boolean default false
      );


alter table "public"."escalation_contact_attempts" enable row level security;


  create table "public"."escalation_followups" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "escalation_incident_id" uuid not null,
    "followup_type" text not null,
    "scheduled_for" timestamp with time zone not null,
    "call_execution_id" uuid,
    "post_call_report_id" uuid,
    "status" text not null default 'pending'::text,
    "elder_response" text,
    "help_arrived" boolean,
    "needs_further_escalation" boolean default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."escalation_followups" enable row level security;


  create table "public"."escalation_incidents" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "elder_id" uuid not null,
    "original_call_execution_id" uuid,
    "original_post_call_report_id" uuid,
    "escalation_reason" text not null,
    "severity_level" text not null,
    "elder_consent" boolean,
    "status" text not null default 'initiated'::text,
    "resolved_at" timestamp with time zone,
    "resolution_notes" text,
    "vapi_tool_call_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "skip_followup" boolean not null default false
      );


alter table "public"."escalation_incidents" enable row level security;


  create table "public"."notification_sends" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "resource_type" text not null,
    "resource_id" uuid,
    "period_start" date,
    "period_end" date,
    "provider_message_id" text,
    "sent_at" timestamp with time zone not null default now(),
    "status" text not null default 'sent'::text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_sends" enable row level security;


  create table "public"."organization_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "org_id" uuid not null,
    "email" text not null,
    "role" text not null default 'member'::text,
    "token" text not null,
    "status" text not null default 'pending'::text,
    "created_by" uuid,
    "expires_at" timestamp with time zone default (now() + '14 days'::interval),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "email_normalized" text
      );


alter table "public"."organization_invitations" enable row level security;


  create table "public"."organizations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "settings" jsonb default '{"migrated": true, "escalation_enabled": true, "max_contact_attempts": 3, "default_followup_delay_minutes": 15}'::jsonb,
    "subscription_plan" text default 'trial'::text,
    "subscription_status" text default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."organizations" enable row level security;


  create table "public"."post_call_reports" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "execution_id" uuid not null,
    "elder_id" uuid not null,
    "transcript" jsonb,
    "summary" text,
    "agenda_completion" jsonb,
    "health_indicators" jsonb,
    "escalation_triggered" boolean default false,
    "escalation_data" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "recording_url" text,
    "recording_storage_path" text,
    "conversation_quality" jsonb,
    "loneliness_indicators" jsonb,
    "physical_health" jsonb,
    "mental_health" jsonb,
    "social_environment" jsonb,
    "checklist_completion" jsonb,
    "callback_analysis" jsonb,
    "onboarding_data" jsonb,
    "transcript_raw" text
      );


alter table "public"."post_call_reports" enable row level security;


  create table "public"."user_notification_prefs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "email_cadence" text not null default 'per_call'::text,
    "only_if_call" boolean not null default true,
    "send_time_local" time without time zone not null default '18:00:00'::time without time zone,
    "timezone" text not null default 'UTC'::text,
    "weekly_day_of_week" integer,
    "include_transcript" boolean not null default false,
    "include_recording" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "to_emails" jsonb
      );


alter table "public"."user_notification_prefs" enable row level security;


  create table "public"."user_organizations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "org_id" uuid not null,
    "role" text default 'member'::text,
    "active" boolean default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_organizations" enable row level security;


  create table "public"."users" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "email" text not null,
    "first_name" text not null,
    "last_name" text not null,
    "phone" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "auth_user_id" uuid,
    "account_type" text not null default 'b2c'::text,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "subscription_status" text default 'inactive'::text,
    "subscription_plan" text,
    "subscription_current_period_end" timestamp with time zone,
    "subscription_cancel_at_period_end" boolean default false,
    "health_data_processing_consent" boolean,
    "health_data_processing_consent_timestamp" timestamp with time zone,
    "family_consent_given" boolean,
    "family_consent_given_timestamp" timestamp with time zone,
    "call_recording_notified" boolean,
    "call_recording_notified_timestamp" timestamp with time zone,
    "subscription_current_period_start" timestamp with time zone
      );


alter table "public"."users" enable row level security;

alter table "public"."weekly_insights_cron_config" add column "run_trends" boolean not null default true;

alter table "public"."weekly_insights_cron_config" add column "trend_window_weeks" integer not null default 8;

CREATE UNIQUE INDEX billing_records_pkey ON public.billing_records USING btree (id);

CREATE UNIQUE INDEX billing_trial_reminders_pkey ON public.billing_trial_reminders USING btree (id);

CREATE UNIQUE INDEX billing_trial_reminders_stripe_subscription_id_reminder_typ_key ON public.billing_trial_reminders USING btree (stripe_subscription_id, reminder_type);

CREATE UNIQUE INDEX call_executions_pkey ON public.call_executions USING btree (id);

CREATE UNIQUE INDEX call_requests_pkey ON public.call_requests USING btree (id);

CREATE UNIQUE INDEX call_schedules_pkey ON public.call_schedules USING btree (id);

CREATE UNIQUE INDEX demo_calls_pkey ON public.demo_calls USING btree (id);

CREATE UNIQUE INDEX demo_calls_session_id_key ON public.demo_calls USING btree (session_id);

CREATE UNIQUE INDEX demo_leads_email_key ON public.demo_leads USING btree (email);

CREATE UNIQUE INDEX demo_leads_pkey ON public.demo_leads USING btree (id);

CREATE UNIQUE INDEX elder_analysis_reports_elder_id_week_start_utc_key ON public.elder_analysis_reports USING btree (elder_id, week_start_utc);

CREATE UNIQUE INDEX elder_analysis_reports_pkey ON public.elder_analysis_reports USING btree (id);

CREATE UNIQUE INDEX elder_call_schedules_elder_id_schedule_id_key ON public.elder_call_schedules USING btree (elder_id, schedule_id);

CREATE UNIQUE INDEX elder_call_schedules_pkey ON public.elder_call_schedules USING btree (id);

CREATE UNIQUE INDEX elder_emergency_contact_pkey ON public.elder_emergency_contact USING btree (id);

CREATE INDEX elder_prompt_context_cache_last_call_at_idx ON public.elder_prompt_context_cache USING btree (last_call_at DESC);

CREATE UNIQUE INDEX elder_prompt_context_cache_pkey ON public.elder_prompt_context_cache USING btree (elder_id);

CREATE INDEX elder_prompt_context_cache_status_updated_at_idx ON public.elder_prompt_context_cache USING btree (generation_status, updated_at DESC);

CREATE UNIQUE INDEX elder_trend_reports_pkey ON public.elder_trend_reports USING btree (id);

CREATE INDEX elders_consent_status_idx ON public.elders USING btree (consent_status);

CREATE UNIQUE INDEX elders_pkey ON public.elders USING btree (id);

CREATE UNIQUE INDEX emergency_contacts_pkey ON public.emergency_contacts USING btree (id);

CREATE UNIQUE INDEX escalation_contact_attempts_pkey ON public.escalation_contact_attempts USING btree (id);

CREATE UNIQUE INDEX escalation_followups_pkey ON public.escalation_followups USING btree (id);

CREATE UNIQUE INDEX escalation_incidents_pkey ON public.escalation_incidents USING btree (id);

CREATE INDEX idx_billing_records_org_id ON public.billing_records USING btree (org_id);

CREATE INDEX idx_billing_records_period ON public.billing_records USING btree (billing_period_start, billing_period_end);

CREATE INDEX idx_billing_records_user_id ON public.billing_records USING btree (user_id);

CREATE INDEX idx_btr_status_scheduled_for ON public.billing_trial_reminders USING btree (status, scheduled_for);

CREATE INDEX idx_btr_subscription ON public.billing_trial_reminders USING btree (stripe_subscription_id);

CREATE INDEX idx_btr_user_id ON public.billing_trial_reminders USING btree (user_id);

CREATE INDEX idx_call_executions_cost_metadata ON public.call_executions USING gin (cost_metadata);

CREATE INDEX idx_call_executions_direction ON public.call_executions USING btree (direction);

CREATE INDEX idx_call_executions_elder_id ON public.call_executions USING btree (elder_id);

CREATE INDEX idx_call_executions_elder_status ON public.call_executions USING btree (elder_id, status);

CREATE INDEX idx_call_executions_scheduled_for ON public.call_executions USING btree (scheduled_for);

CREATE INDEX idx_call_executions_snapshot_config ON public.call_executions USING gin (snapshot_config);

CREATE INDEX idx_call_executions_status ON public.call_executions USING btree (status);

CREATE INDEX idx_call_schedules_org_id ON public.call_schedules USING btree (org_id);

CREATE INDEX idx_demo_calls_email_sent ON public.demo_calls USING btree (email_sent);

CREATE INDEX idx_demo_calls_lead_id ON public.demo_calls USING btree (lead_id);

CREATE INDEX idx_demo_calls_session_id ON public.demo_calls USING btree (session_id);

CREATE INDEX idx_demo_calls_started_at ON public.demo_calls USING btree (started_at DESC);

CREATE INDEX idx_demo_leads_created_at ON public.demo_leads USING btree (created_at DESC);

CREATE INDEX idx_demo_leads_email ON public.demo_leads USING btree (email);

CREATE INDEX idx_elder_analysis_reports_elder_week_desc ON public.elder_analysis_reports USING btree (elder_id, week_start_utc DESC);

CREATE INDEX idx_elder_analysis_reports_week_desc ON public.elder_analysis_reports USING btree (week_start_utc DESC, elder_id);

CREATE INDEX idx_elder_call_schedules_active ON public.elder_call_schedules USING btree (elder_id, active) WHERE (active = true);

CREATE INDEX idx_elder_call_schedules_elder_id ON public.elder_call_schedules USING btree (elder_id);

CREATE INDEX idx_elder_call_schedules_schedule_id ON public.elder_call_schedules USING btree (schedule_id);

CREATE INDEX idx_elder_trend_reports_anchor_desc ON public.elder_trend_reports USING btree (anchor_week_start_utc DESC, elder_id);

CREATE INDEX idx_elder_trend_reports_elder_anchor_desc ON public.elder_trend_reports USING btree (elder_id, anchor_week_start_utc DESC);

CREATE UNIQUE INDEX idx_elder_trend_reports_unique ON public.elder_trend_reports USING btree (elder_id, anchor_week_start_utc, window_weeks);

CREATE INDEX idx_elders_active ON public.elders USING btree (active) WHERE (active = true);

CREATE INDEX idx_elders_org_id ON public.elders USING btree (org_id);

CREATE INDEX idx_elders_user_id ON public.elders USING btree (user_id);

CREATE INDEX idx_notification_sends_period ON public.notification_sends USING btree (period_start, period_end);

CREATE INDEX idx_notification_sends_resource ON public.notification_sends USING btree (resource_type, resource_id);

CREATE INDEX idx_notification_sends_user_id ON public.notification_sends USING btree (user_id);

CREATE INDEX idx_post_call_reports_elder_id ON public.post_call_reports USING btree (elder_id);

CREATE INDEX idx_post_call_reports_escalation ON public.post_call_reports USING btree (escalation_triggered) WHERE (escalation_triggered = true);

CREATE INDEX idx_post_call_reports_execution_id ON public.post_call_reports USING btree (execution_id);

CREATE INDEX idx_post_call_reports_recording_storage_path ON public.post_call_reports USING btree (recording_storage_path) WHERE (recording_storage_path IS NOT NULL);

CREATE INDEX idx_user_notification_prefs_user_id ON public.user_notification_prefs USING btree (user_id);

CREATE INDEX idx_user_organizations_active ON public.user_organizations USING btree (user_id, active) WHERE (active = true);

CREATE INDEX idx_user_organizations_org_id ON public.user_organizations USING btree (org_id);

CREATE INDEX idx_user_organizations_user_id ON public.user_organizations USING btree (user_id);

CREATE INDEX idx_users_account_type ON public.users USING btree (account_type);

CREATE INDEX idx_users_auth_user_id ON public.users USING btree (auth_user_id);

CREATE INDEX idx_users_stripe_customer_id ON public.users USING btree (stripe_customer_id);

CREATE UNIQUE INDEX idx_users_stripe_customer_unique ON public.users USING btree (NULLIF(btrim(stripe_customer_id), ''::text)) WHERE (NULLIF(btrim(stripe_customer_id), ''::text) IS NOT NULL);

CREATE INDEX idx_users_stripe_subscription_id ON public.users USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX idx_users_stripe_subscription_unique ON public.users USING btree (NULLIF(btrim(stripe_subscription_id), ''::text)) WHERE (NULLIF(btrim(stripe_subscription_id), ''::text) IS NOT NULL);

CREATE INDEX idx_users_subscription_status_period_end ON public.users USING btree (subscription_status, subscription_current_period_end);

CREATE UNIQUE INDEX notification_sends_pkey ON public.notification_sends USING btree (id);

CREATE UNIQUE INDEX notification_sends_user_id_resource_type_resource_id_period_key ON public.notification_sends USING btree (user_id, resource_type, resource_id, period_start);

CREATE UNIQUE INDEX organization_invitations_one_pending_per_email ON public.organization_invitations USING btree (org_id, email_normalized) WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_invitations_token_key ON public.organization_invitations USING btree (token);

CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id);

CREATE UNIQUE INDEX post_call_reports_pkey ON public.post_call_reports USING btree (id);

CREATE UNIQUE INDEX user_notification_prefs_pkey ON public.user_notification_prefs USING btree (id);

CREATE UNIQUE INDEX user_notification_prefs_user_id_key ON public.user_notification_prefs USING btree (user_id);

CREATE UNIQUE INDEX user_organizations_pkey ON public.user_organizations USING btree (id);

CREATE UNIQUE INDEX user_organizations_user_id_org_id_key ON public.user_organizations USING btree (user_id, org_id);

CREATE UNIQUE INDEX users_auth_user_id_unique ON public.users USING btree (auth_user_id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_stripe_customer_id_key ON public.users USING btree (stripe_customer_id);

alter table "public"."billing_records" add constraint "billing_records_pkey" PRIMARY KEY using index "billing_records_pkey";

alter table "public"."billing_trial_reminders" add constraint "billing_trial_reminders_pkey" PRIMARY KEY using index "billing_trial_reminders_pkey";

alter table "public"."call_executions" add constraint "call_executions_pkey" PRIMARY KEY using index "call_executions_pkey";

alter table "public"."call_requests" add constraint "call_requests_pkey" PRIMARY KEY using index "call_requests_pkey";

alter table "public"."call_schedules" add constraint "call_schedules_pkey" PRIMARY KEY using index "call_schedules_pkey";

alter table "public"."demo_calls" add constraint "demo_calls_pkey" PRIMARY KEY using index "demo_calls_pkey";

alter table "public"."demo_leads" add constraint "demo_leads_pkey" PRIMARY KEY using index "demo_leads_pkey";

alter table "public"."elder_analysis_reports" add constraint "elder_analysis_reports_pkey" PRIMARY KEY using index "elder_analysis_reports_pkey";

alter table "public"."elder_call_schedules" add constraint "elder_call_schedules_pkey" PRIMARY KEY using index "elder_call_schedules_pkey";

alter table "public"."elder_emergency_contact" add constraint "elder_emergency_contact_pkey" PRIMARY KEY using index "elder_emergency_contact_pkey";

alter table "public"."elder_prompt_context_cache" add constraint "elder_prompt_context_cache_pkey" PRIMARY KEY using index "elder_prompt_context_cache_pkey";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_pkey" PRIMARY KEY using index "elder_trend_reports_pkey";

alter table "public"."elders" add constraint "elders_pkey" PRIMARY KEY using index "elders_pkey";

alter table "public"."emergency_contacts" add constraint "emergency_contacts_pkey" PRIMARY KEY using index "emergency_contacts_pkey";

alter table "public"."escalation_contact_attempts" add constraint "escalation_contact_attempts_pkey" PRIMARY KEY using index "escalation_contact_attempts_pkey";

alter table "public"."escalation_followups" add constraint "escalation_followups_pkey" PRIMARY KEY using index "escalation_followups_pkey";

alter table "public"."escalation_incidents" add constraint "escalation_incidents_pkey" PRIMARY KEY using index "escalation_incidents_pkey";

alter table "public"."notification_sends" add constraint "notification_sends_pkey" PRIMARY KEY using index "notification_sends_pkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_pkey" PRIMARY KEY using index "organization_invitations_pkey";

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY using index "organizations_pkey";

alter table "public"."post_call_reports" add constraint "post_call_reports_pkey" PRIMARY KEY using index "post_call_reports_pkey";

alter table "public"."user_notification_prefs" add constraint "user_notification_prefs_pkey" PRIMARY KEY using index "user_notification_prefs_pkey";

alter table "public"."user_organizations" add constraint "user_organizations_pkey" PRIMARY KEY using index "user_organizations_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."billing_records" add constraint "billing_records_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) not valid;

alter table "public"."billing_records" validate constraint "billing_records_elder_id_fkey";

alter table "public"."billing_records" add constraint "billing_records_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."billing_records" validate constraint "billing_records_org_id_fkey";

alter table "public"."billing_records" add constraint "billing_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."billing_records" validate constraint "billing_records_user_id_fkey";

alter table "public"."billing_trial_reminders" add constraint "billing_trial_reminders_reminder_type_check" CHECK ((reminder_type = ANY (ARRAY['trial_48h'::text, 'trial_24h'::text]))) not valid;

alter table "public"."billing_trial_reminders" validate constraint "billing_trial_reminders_reminder_type_check";

alter table "public"."billing_trial_reminders" add constraint "billing_trial_reminders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'cancelled'::text, 'failed'::text]))) not valid;

alter table "public"."billing_trial_reminders" validate constraint "billing_trial_reminders_status_check";

alter table "public"."billing_trial_reminders" add constraint "billing_trial_reminders_stripe_subscription_id_reminder_typ_key" UNIQUE using index "billing_trial_reminders_stripe_subscription_id_reminder_typ_key";

alter table "public"."billing_trial_reminders" add constraint "billing_trial_reminders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."billing_trial_reminders" validate constraint "billing_trial_reminders_user_id_fkey";

alter table "public"."call_executions" add constraint "call_executions_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."call_executions" validate constraint "call_executions_elder_id_fkey";

alter table "public"."call_executions" add constraint "call_executions_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id) ON DELETE CASCADE not valid;

alter table "public"."call_executions" validate constraint "call_executions_schedule_id_fkey";

alter table "public"."call_requests" add constraint "call_requests_call_id_fkey" FOREIGN KEY (call_id) REFERENCES public.post_call_reports(id) ON DELETE CASCADE not valid;

alter table "public"."call_requests" validate constraint "call_requests_call_id_fkey";

alter table "public"."call_requests" add constraint "call_requests_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."call_requests" validate constraint "call_requests_elder_id_fkey";

alter table "public"."call_requests" add constraint "call_requests_type_check" CHECK ((type = ANY (ARRAY['household'::text, 'social'::text, 'assistance'::text, 'other'::text]))) not valid;

alter table "public"."call_requests" validate constraint "call_requests_type_check";

alter table "public"."call_requests" add constraint "call_requests_urgency_check" CHECK ((urgency = ANY (ARRAY['low'::text, 'medium'::text]))) not valid;

alter table "public"."call_requests" validate constraint "call_requests_urgency_check";

alter table "public"."call_schedules" add constraint "call_schedules_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."call_schedules" validate constraint "call_schedules_org_id_fkey";

alter table "public"."demo_calls" add constraint "demo_calls_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES public.demo_leads(id) ON DELETE CASCADE not valid;

alter table "public"."demo_calls" validate constraint "demo_calls_lead_id_fkey";

alter table "public"."demo_calls" add constraint "demo_calls_session_id_key" UNIQUE using index "demo_calls_session_id_key";

alter table "public"."demo_leads" add constraint "demo_leads_email_key" UNIQUE using index "demo_leads_email_key";

alter table "public"."elder_analysis_reports" add constraint "elder_analysis_reports_check" CHECK ((week_end_utc = (week_start_utc + 6))) not valid;

alter table "public"."elder_analysis_reports" validate constraint "elder_analysis_reports_check";

alter table "public"."elder_analysis_reports" add constraint "elder_analysis_reports_confidence_check" CHECK ((confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."elder_analysis_reports" validate constraint "elder_analysis_reports_confidence_check";

alter table "public"."elder_analysis_reports" add constraint "elder_analysis_reports_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."elder_analysis_reports" validate constraint "elder_analysis_reports_elder_id_fkey";

alter table "public"."elder_analysis_reports" add constraint "elder_analysis_reports_elder_id_week_start_utc_key" UNIQUE using index "elder_analysis_reports_elder_id_week_start_utc_key";

alter table "public"."elder_call_schedules" add constraint "elder_call_schedules_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."elder_call_schedules" validate constraint "elder_call_schedules_elder_id_fkey";

alter table "public"."elder_call_schedules" add constraint "elder_call_schedules_elder_id_schedule_id_key" UNIQUE using index "elder_call_schedules_elder_id_schedule_id_key";

alter table "public"."elder_call_schedules" add constraint "elder_call_schedules_schedule_id_fkey" FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id) ON DELETE CASCADE not valid;

alter table "public"."elder_call_schedules" validate constraint "elder_call_schedules_schedule_id_fkey";

alter table "public"."elder_emergency_contact" add constraint "elder_emergency_contact_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."elder_emergency_contact" validate constraint "elder_emergency_contact_elder_id_fkey";

alter table "public"."elder_emergency_contact" add constraint "elder_emergency_contact_emergency_contact_id_fkey" FOREIGN KEY (emergency_contact_id) REFERENCES public.emergency_contacts(id) ON DELETE CASCADE not valid;

alter table "public"."elder_emergency_contact" validate constraint "elder_emergency_contact_emergency_contact_id_fkey";

alter table "public"."elder_prompt_context_cache" add constraint "elder_prompt_context_cache_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."elder_prompt_context_cache" validate constraint "elder_prompt_context_cache_elder_id_fkey";

alter table "public"."elder_prompt_context_cache" add constraint "elder_prompt_context_cache_generation_status_check" CHECK ((generation_status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text]))) not valid;

alter table "public"."elder_prompt_context_cache" validate constraint "elder_prompt_context_cache_generation_status_check";

alter table "public"."elder_prompt_context_cache" add constraint "elder_prompt_context_cache_last_call_execution_id_fkey" FOREIGN KEY (last_call_execution_id) REFERENCES public.call_executions(id) ON DELETE SET NULL not valid;

alter table "public"."elder_prompt_context_cache" validate constraint "elder_prompt_context_cache_last_call_execution_id_fkey";

alter table "public"."elder_prompt_context_cache" add constraint "elder_prompt_context_cache_last_post_call_report_id_fkey" FOREIGN KEY (last_post_call_report_id) REFERENCES public.post_call_reports(id) ON DELETE SET NULL not valid;

alter table "public"."elder_prompt_context_cache" validate constraint "elder_prompt_context_cache_last_post_call_report_id_fkey";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_check" CHECK ((anchor_week_end_utc = (anchor_week_start_utc + 6))) not valid;

alter table "public"."elder_trend_reports" validate constraint "elder_trend_reports_check";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."elder_trend_reports" validate constraint "elder_trend_reports_elder_id_fkey";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_overall_trend_state_check" CHECK ((overall_trend_state = ANY (ARRAY['improving'::text, 'stable'::text, 'worsening'::text, 'volatile'::text, 'insufficient_data'::text]))) not valid;

alter table "public"."elder_trend_reports" validate constraint "elder_trend_reports_overall_trend_state_check";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_trend_confidence_check" CHECK ((trend_confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))) not valid;

alter table "public"."elder_trend_reports" validate constraint "elder_trend_reports_trend_confidence_check";

alter table "public"."elder_trend_reports" add constraint "elder_trend_reports_window_weeks_check" CHECK (((window_weeks >= 4) AND (window_weeks <= 12))) not valid;

alter table "public"."elder_trend_reports" validate constraint "elder_trend_reports_window_weeks_check";

alter table "public"."elders" add constraint "elders_consent_pathway_check" CHECK ((consent_pathway = 'direct_consent'::text)) not valid;

alter table "public"."elders" validate constraint "elders_consent_pathway_check";

alter table "public"."elders" add constraint "elders_consent_status_check" CHECK ((consent_status = ANY (ARRAY['pending'::text, 'granted'::text, 'refused'::text]))) not valid;

alter table "public"."elders" validate constraint "elders_consent_status_check";

alter table "public"."elders" add constraint "elders_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."elders" validate constraint "elders_org_id_fkey";

alter table "public"."elders" add constraint "elders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."elders" validate constraint "elders_user_id_fkey";

alter table "public"."emergency_contacts" add constraint "emergency_contacts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."emergency_contacts" validate constraint "emergency_contacts_org_id_fkey";

alter table "public"."escalation_contact_attempts" add constraint "escalation_contact_attempts_call_execution_id_fkey" FOREIGN KEY (call_execution_id) REFERENCES public.call_executions(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_contact_attempts" validate constraint "escalation_contact_attempts_call_execution_id_fkey";

alter table "public"."escalation_contact_attempts" add constraint "escalation_contact_attempts_emergency_contact_id_fkey" FOREIGN KEY (emergency_contact_id) REFERENCES public.emergency_contacts(id) not valid;

alter table "public"."escalation_contact_attempts" validate constraint "escalation_contact_attempts_emergency_contact_id_fkey";

alter table "public"."escalation_contact_attempts" add constraint "escalation_contact_attempts_escalation_incident_id_fkey" FOREIGN KEY (escalation_incident_id) REFERENCES public.escalation_incidents(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_contact_attempts" validate constraint "escalation_contact_attempts_escalation_incident_id_fkey";

alter table "public"."escalation_followups" add constraint "escalation_followups_call_execution_id_fkey" FOREIGN KEY (call_execution_id) REFERENCES public.call_executions(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_followups" validate constraint "escalation_followups_call_execution_id_fkey";

alter table "public"."escalation_followups" add constraint "escalation_followups_escalation_incident_id_fkey" FOREIGN KEY (escalation_incident_id) REFERENCES public.escalation_incidents(id) not valid;

alter table "public"."escalation_followups" validate constraint "escalation_followups_escalation_incident_id_fkey";

alter table "public"."escalation_followups" add constraint "escalation_followups_post_call_report_id_fkey" FOREIGN KEY (post_call_report_id) REFERENCES public.post_call_reports(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_followups" validate constraint "escalation_followups_post_call_report_id_fkey";

alter table "public"."escalation_incidents" add constraint "escalation_incidents_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_incidents" validate constraint "escalation_incidents_elder_id_fkey";

alter table "public"."escalation_incidents" add constraint "escalation_incidents_original_call_execution_id_fkey" FOREIGN KEY (original_call_execution_id) REFERENCES public.call_executions(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_incidents" validate constraint "escalation_incidents_original_call_execution_id_fkey";

alter table "public"."escalation_incidents" add constraint "escalation_incidents_original_post_call_report_id_fkey" FOREIGN KEY (original_post_call_report_id) REFERENCES public.post_call_reports(id) ON DELETE CASCADE not valid;

alter table "public"."escalation_incidents" validate constraint "escalation_incidents_original_post_call_report_id_fkey";

alter table "public"."notification_sends" add constraint "notification_sends_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'bounced'::text]))) not valid;

alter table "public"."notification_sends" validate constraint "notification_sends_status_check";

alter table "public"."notification_sends" add constraint "notification_sends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."notification_sends" validate constraint "notification_sends_user_id_fkey";

alter table "public"."notification_sends" add constraint "notification_sends_user_id_resource_type_resource_id_period_key" UNIQUE using index "notification_sends_user_id_resource_type_resource_id_period_key";

alter table "public"."organization_invitations" add constraint "organization_invitations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_created_by_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_org_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_token_key" UNIQUE using index "organization_invitations_token_key";

alter table "public"."post_call_reports" add constraint "post_call_reports_elder_id_fkey" FOREIGN KEY (elder_id) REFERENCES public.elders(id) ON DELETE CASCADE not valid;

alter table "public"."post_call_reports" validate constraint "post_call_reports_elder_id_fkey";

alter table "public"."post_call_reports" add constraint "post_call_reports_execution_id_fkey" FOREIGN KEY (execution_id) REFERENCES public.call_executions(id) ON DELETE CASCADE not valid;

alter table "public"."post_call_reports" validate constraint "post_call_reports_execution_id_fkey";

alter table "public"."user_notification_prefs" add constraint "user_notification_prefs_email_cadence_check" CHECK ((email_cadence = ANY (ARRAY['off'::text, 'per_call'::text, 'daily'::text, 'weekly'::text]))) not valid;

alter table "public"."user_notification_prefs" validate constraint "user_notification_prefs_email_cadence_check";

alter table "public"."user_notification_prefs" add constraint "user_notification_prefs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_notification_prefs" validate constraint "user_notification_prefs_user_id_fkey";

alter table "public"."user_notification_prefs" add constraint "user_notification_prefs_user_id_key" UNIQUE using index "user_notification_prefs_user_id_key";

alter table "public"."user_notification_prefs" add constraint "user_notification_prefs_weekly_day_of_week_check" CHECK (((weekly_day_of_week >= 0) AND (weekly_day_of_week <= 6))) not valid;

alter table "public"."user_notification_prefs" validate constraint "user_notification_prefs_weekly_day_of_week_check";

alter table "public"."user_organizations" add constraint "user_organizations_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."user_organizations" validate constraint "user_organizations_org_id_fkey";

alter table "public"."user_organizations" add constraint "user_organizations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_organizations" validate constraint "user_organizations_user_id_fkey";

alter table "public"."user_organizations" add constraint "user_organizations_user_id_org_id_key" UNIQUE using index "user_organizations_user_id_org_id_key";

alter table "public"."users" add constraint "users_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_auth_user_id_fkey";

alter table "public"."users" add constraint "users_auth_user_id_unique" UNIQUE using index "users_auth_user_id_unique";

alter table "public"."users" add constraint "users_stripe_customer_id_key" UNIQUE using index "users_stripe_customer_id_key";

alter table "public"."weekly_insights_cron_config" add constraint "weekly_insights_cron_config_trend_window_weeks_check" CHECK (((trend_window_weeks >= 4) AND (trend_window_weeks <= 12))) not valid;

alter table "public"."weekly_insights_cron_config" validate constraint "weekly_insights_cron_config_trend_window_weeks_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._touch_elder_prompt_context_cache_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.add_user_to_organization(p_auth_user_id uuid, p_org_id uuid, p_role text DEFAULT 'member'::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id UUID;
    v_assignment_id UUID;
BEGIN
    -- Get or create user record
    SELECT id INTO v_user_id FROM users WHERE auth_user_id = p_auth_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found for auth_user_id: %', p_auth_user_id;
    END IF;
    
    -- Add user to organization
    INSERT INTO user_organizations (user_id, org_id, role)
    VALUES (v_user_id, p_org_id, p_role)
    ON CONFLICT (user_id, org_id) 
    DO UPDATE SET 
        role = p_role,
        active = true,
        updated_at = NOW()
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.anonymize_old_call_executions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  anonymized_count INTEGER;
BEGIN
  -- Anonymize call_executions older than 2 years by removing PII
  WITH anonymized AS (
    UPDATE call_executions
    SET 
      error_message = NULL,
      provider_payload = NULL
    WHERE 
      created_at < NOW() - INTERVAL '2 years'
      AND (error_message IS NOT NULL OR provider_payload IS NOT NULL)
    RETURNING id
  )
  SELECT COUNT(*) INTO anonymized_count FROM anonymized;
  
  -- Log the anonymization
  RAISE NOTICE 'Anonymized % call executions older than 2 years', anonymized_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_schedule_to_elder(p_elder_id uuid, p_schedule_id uuid, p_custom_overrides jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_assignment_id UUID;
    v_elder_org_id UUID;
    v_schedule_org_id UUID;
BEGIN
    -- Verify elder and schedule belong to same organization
    SELECT org_id INTO v_elder_org_id FROM elders WHERE id = p_elder_id;
    SELECT org_id INTO v_schedule_org_id FROM call_schedules WHERE id = p_schedule_id;
    
    IF v_elder_org_id != v_schedule_org_id THEN
        RAISE EXCEPTION 'Elder and schedule must belong to the same organization';
    END IF;
    
    -- Create assignment
    INSERT INTO elder_call_schedules (elder_id, schedule_id, custom_overrides)
    VALUES (p_elder_id, p_schedule_id, p_custom_overrides)
    ON CONFLICT (elder_id, schedule_id) 
    DO UPDATE SET 
        active = true,
        custom_overrides = p_custom_overrides,
        updated_at = NOW()
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_emergency_call(p_elder_id uuid, p_call_type text, p_trigger_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_execution_id UUID;
BEGIN
    INSERT INTO call_executions (
        elder_id, 
        call_type, 
        scheduled_for, 
        execution_metadata
    )
    VALUES (
        p_elder_id, 
        p_call_type, 
        NOW(), 
        p_trigger_data
    )
    RETURNING id INTO v_execution_id;
    
    RETURN v_execution_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_organization_with_membership(org_name text, user_email text DEFAULT NULL::text, user_first_name text DEFAULT NULL::text, user_last_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_org_id UUID;
  user_record_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;
  
  -- Ensure user record exists
  INSERT INTO users (auth_user_id, email, first_name, last_name)
  VALUES (
    auth.uid(),
    COALESCE(user_email, auth.email()),
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, '')
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, users.email),
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = NOW()
  RETURNING id INTO user_record_id;
  
  -- Create organization membership
  INSERT INTO user_organizations (user_id, org_id, role)
  VALUES (user_record_id, new_org_id, 'admin');
  
  RETURN new_org_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_scheduled_execution(p_elder_id uuid, p_schedule_id uuid, p_scheduled_for timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_execution_id UUID;
BEGIN
    -- Verify the elder is assigned to this schedule
    IF NOT EXISTS (
        SELECT 1 FROM elder_call_schedules 
        WHERE elder_id = p_elder_id 
        AND schedule_id = p_schedule_id 
        AND active = true
    ) THEN
        RAISE EXCEPTION 'Elder is not assigned to this schedule';
    END IF;
    
    -- Create execution
    INSERT INTO call_executions (elder_id, schedule_id, call_type, scheduled_for)
    VALUES (p_elder_id, p_schedule_id, 'scheduled', p_scheduled_for)
    RETURNING id INTO v_execution_id;
    
    RETURN v_execution_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_expired_invitations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired invitations that are more than 30 days past their expiration
  WITH deleted AS (
    DELETE FROM organization_invitations
    WHERE 
      expires_at < NOW() - INTERVAL '30 days'
      AND status IN ('pending', 'expired')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted % expired invitations', deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_call_recordings()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Update post_call_reports to remove recording URLs older than 90 days
  WITH deleted AS (
    UPDATE post_call_reports
    SET 
      recording_url = NULL,
      recording_storage_path = NULL
    WHERE 
      created_at < NOW() - INTERVAL '90 days'
      AND (recording_url IS NOT NULL OR recording_storage_path IS NOT NULL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted % call recording references older than 90 days', deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_call_transcripts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Update post_call_reports to remove transcripts older than 1 year
  WITH deleted AS (
    UPDATE post_call_reports
    SET 
      transcript = NULL,
      transcript_raw = NULL
    WHERE 
      created_at < NOW() - INTERVAL '1 year'
      AND (transcript IS NOT NULL OR transcript_raw IS NOT NULL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted % call transcripts older than 1 year', deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_demo_calls()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete demo_calls older than 30 days
  WITH deleted AS (
    DELETE FROM demo_calls
    WHERE created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted % demo calls older than 30 days', deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_old_post_call_reports()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete post_call_reports older than 2 years
  WITH deleted AS (
    DELETE FROM post_call_reports
    WHERE created_at < NOW() - INTERVAL '2 years'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted % post-call reports older than 2 years', deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_due_trial_reminders(p_url text, p_authorization text, p_limit integer DEFAULT 200, p_window interval DEFAULT '00:15:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_count integer := 0;
begin
  if coalesce(btrim(p_url), '') = '' then
    raise exception 'p_url is required';
  end if;

  if coalesce(btrim(p_authorization), '') = '' then
    raise exception 'p_authorization is required';
  end if;

  for r in
    select *
    from public.billing_trial_reminders
    where status = 'pending'
      and scheduled_for <= (now() + p_window)
    order by scheduled_for asc
    for update skip locked
    limit greatest(coalesce(p_limit, 1), 1)
  loop
    update public.billing_trial_reminders
    set status = 'processing',
        updated_at = now()
    where id = r.id;

    perform net.http_post(
      url := p_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', p_authorization
      ),
      body := to_jsonb(r)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dispatch_scheduled_calls()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$declare
  r record;
  v_count integer := 0;
begin
  /*
    Grab rows that are due soon:
    - status = 'pending'
    - scheduled_for <= now() + 2 minutes

    Lock them so if two cron runs overlap you don't double-send.
  */
  for r in
    select *
    from public.call_executions
    where status = 'pending'
      and scheduled_for <= (now() + interval '2 minutes')
    order by scheduled_for asc
    for update skip locked
  loop
    -- Mark as processing to prevent re-pickup
    update public.call_executions
    set status = 'processing',
        updated_at = now()
    where id = r.id;

    -- Fire webhook with the row payload
    perform net.http_post(
      url := 'https://eva-cares.app.n8n.cloud/webhook/scheduled-calls',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'lgvaibot0902!'
      ),
      body := to_jsonb(r)
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organizations(p_auth_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(org_id uuid, role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT uo.org_id, uo.role
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE u.auth_user_id = COALESCE(p_auth_user_id, auth.uid())
    AND uo.active = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- This function will be called when a new user signs up via Supabase Auth
  -- It ensures a user record is created in the users table
  INSERT INTO public.users (auth_user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.requeue_stale_trial_reminders(p_stale interval DEFAULT '00:45:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count integer;
begin
  update public.billing_trial_reminders
  set status = 'pending',
      last_error = coalesce(last_error, 'Requeued by stale-processing guard'),
      updated_at = now()
  where status = 'processing'
    and updated_at < (now() - p_stale);

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.run_trial_reminder_tick(p_url text, p_authorization text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_requeued integer := 0;
  v_dispatched integer := 0;
  v_sync jsonb := '{}'::jsonb;
begin
  v_requeued := public.requeue_stale_trial_reminders(interval '45 minutes');
  v_sync := public.sync_trial_reminder_queue_from_users(now());
  v_dispatched := public.dispatch_due_trial_reminders(
    p_url := p_url,
    p_authorization := p_authorization,
    p_limit := 200,
    p_window := interval '15 minutes'
  );

  return jsonb_build_object(
    'ok', true,
    'requeued', v_requeued,
    'sync', v_sync,
    'dispatched', v_dispatched,
    'at', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.schedule_next_call(p_elder_id uuid, p_schedule_id uuid, p_base_time timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_schedule RECORD;
    v_next_time TIMESTAMP WITH TIME ZONE;
    v_execution_id UUID;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule FROM call_schedules WHERE id = p_schedule_id AND active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule not found or inactive';
    END IF;
    
    -- Calculate next call time based on frequency
    CASE v_schedule.frequency
        WHEN 'daily' THEN
            v_next_time := (p_base_time::date + interval '1 day' + v_schedule.call_time::time);
        WHEN 'weekly' THEN
            v_next_time := (p_base_time::date + interval '7 days' + v_schedule.call_time::time);
        ELSE
            -- Custom frequency logic would go here
            v_next_time := (p_base_time::date + interval '1 day' + v_schedule.call_time::time);
    END CASE;
    
    -- Create call execution
    INSERT INTO call_executions (elder_id, schedule_id, call_type, scheduled_for)
    VALUES (p_elder_id, p_schedule_id, 'scheduled', v_next_time)
    RETURNING id INTO v_execution_id;
    
    RETURN v_execution_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_billing_trial_reminders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_elder_analysis_reports_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_elder_trend_reports_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_invite_email_normalized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.email_normalized := lower(NEW.email);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_trial_reminder_queue_from_users(p_now timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  u record;
  v_existing public.billing_trial_reminders%rowtype;
  v_reminder_type text;
  v_trial_end_at timestamptz;
  v_scheduled_for timestamptz;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_cancelled integer := 0;
begin
  for u in
    select
      usr.id as user_id,
      nullif(btrim(usr.stripe_subscription_id), '') as stripe_subscription_id_norm,
      nullif(btrim(usr.stripe_customer_id), '') as stripe_customer_id_norm,
      usr.subscription_current_period_end::timestamptz as trial_end_at
    from public.users usr
    where usr.subscription_status = 'trialing'
      and usr.subscription_current_period_end is not null
      and nullif(btrim(usr.stripe_subscription_id), '') is not null
  loop
    v_trial_end_at := u.trial_end_at;

    for v_reminder_type in
      select unnest(array['trial_48h'::text, 'trial_24h'::text])
    loop
      if v_reminder_type = 'trial_48h' then
        v_scheduled_for := v_trial_end_at - interval '48 hours';
      else
        v_scheduled_for := v_trial_end_at - interval '24 hours';
      end if;

      select *
      into v_existing
      from public.billing_trial_reminders r
      where r.stripe_subscription_id = u.stripe_subscription_id_norm
        and r.reminder_type = v_reminder_type
      limit 1;

      if not found then
        insert into public.billing_trial_reminders (
          user_id,
          stripe_subscription_id,
          stripe_customer_id,
          reminder_type,
          trial_end_at,
          scheduled_for,
          status,
          attempt_count,
          last_error,
          sent_at
        )
        values (
          u.user_id,
          u.stripe_subscription_id_norm,
          u.stripe_customer_id_norm,
          v_reminder_type,
          v_trial_end_at,
          v_scheduled_for,
          'pending',
          0,
          null,
          null
        );

        v_inserted := v_inserted + 1;
      else
        if (
          v_existing.user_id is distinct from u.user_id
          or v_existing.stripe_customer_id is distinct from u.stripe_customer_id_norm
          or v_existing.trial_end_at is distinct from v_trial_end_at
          or v_existing.scheduled_for is distinct from v_scheduled_for
          or v_existing.status in ('failed', 'cancelled')
        ) then
          update public.billing_trial_reminders
          set user_id = u.user_id,
              stripe_customer_id = u.stripe_customer_id_norm,
              trial_end_at = v_trial_end_at,
              scheduled_for = v_scheduled_for,
              status = 'pending',
              attempt_count = 0,
              last_error = null,
              sent_at = null,
              updated_at = now()
          where id = v_existing.id;

          v_updated := v_updated + 1;
        end if;
      end if;
    end loop;
  end loop;

  -- Cancel open rows that are no longer eligible based on current users snapshot.
  update public.billing_trial_reminders r
  set status = 'cancelled',
      last_error = 'Cancelled by queue sync: no longer eligible',
      updated_at = now()
  where r.status in ('pending', 'processing', 'failed')
    and not exists (
      select 1
      from public.users usr
      where usr.id = r.user_id
        and usr.subscription_status = 'trialing'
        and usr.subscription_current_period_end is not null
        and nullif(btrim(usr.stripe_subscription_id), '') is not null
        and nullif(btrim(usr.stripe_subscription_id), '') = r.stripe_subscription_id
        and usr.subscription_current_period_end::timestamptz = r.trial_end_at
    );

  get diagnostics v_cancelled = row_count;

  return jsonb_build_object(
    'ok', true,
    'inserted', v_inserted,
    'updated', v_updated,
    'cancelled', v_cancelled,
    'at', p_now
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_elder_prompt_context_cache(p_elder_id uuid, p_last_call_execution_id uuid, p_last_post_call_report_id uuid, p_last_call_at timestamp with time zone, p_last_call_summary text, p_older_call_info text, p_generation_status text DEFAULT 'ready'::text, p_error_message text DEFAULT NULL::text, p_generated_at timestamp with time zone DEFAULT now())
 RETURNS public.elder_prompt_context_cache
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.elder_prompt_context_cache;
BEGIN
  IF p_generation_status NOT IN ('processing', 'ready', 'failed') THEN
    RAISE EXCEPTION 'Invalid generation_status: %', p_generation_status;
  END IF;

  INSERT INTO public.elder_prompt_context_cache (
    elder_id,
    last_call_execution_id,
    last_post_call_report_id,
    last_call_at,
    last_call_summary,
    older_call_info,
    generation_status,
    error_message,
    generated_at
  )
  VALUES (
    p_elder_id,
    p_last_call_execution_id,
    p_last_post_call_report_id,
    p_last_call_at,
    p_last_call_summary,
    p_older_call_info,
    p_generation_status,
    p_error_message,
    COALESCE(p_generated_at, now())
  )
  ON CONFLICT (elder_id) DO UPDATE
  SET
    last_call_execution_id = EXCLUDED.last_call_execution_id,
    last_post_call_report_id = EXCLUDED.last_post_call_report_id,
    last_call_at = EXCLUDED.last_call_at,
    last_call_summary = EXCLUDED.last_call_summary,
    older_call_info = EXCLUDED.older_call_info,
    generation_status = EXCLUDED.generation_status,
    error_message = EXCLUDED.error_message,
    generated_at = EXCLUDED.generated_at
  WHERE
    -- same execution can retry safely
    public.elder_prompt_context_cache.last_call_execution_id = EXCLUDED.last_call_execution_id
    OR
    -- otherwise only newer/equal call timestamps can replace cache
    public.elder_prompt_context_cache.last_call_at IS NULL
    OR EXCLUDED.last_call_at IS NULL
    OR EXCLUDED.last_call_at >= public.elder_prompt_context_cache.last_call_at
  RETURNING * INTO v_row;

  -- If write was ignored because it was stale, return the current row
  IF v_row IS NULL THEN
    SELECT *
    INTO v_row
    FROM public.elder_prompt_context_cache
    WHERE elder_id = p_elder_id;
  END IF;

  RETURN v_row;
END;
$function$
;

create or replace view "public"."user_current_context" as  SELECT u.id AS user_id,
    u.auth_user_id,
    u.email,
    u.first_name,
    u.last_name,
    uo.org_id,
    o.name AS org_name,
    uo.role AS org_role,
    uo.active AS org_active
   FROM ((public.users u
     JOIN public.user_organizations uo ON ((u.id = uo.user_id)))
     JOIN public.organizations o ON ((uo.org_id = o.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true));


create or replace view "public"."v_elder_weekly_metrics" as  SELECT id,
    elder_id,
    week_start_utc,
    week_end_utc,
    answered_calls_week,
    minutes_called_week,
    hours_called_week,
    confidence,
    (NULLIF((loneliness_metrics ->> 'avg_loneliness_score'::text), ''::text))::numeric AS avg_loneliness_score,
    (NULLIF((loneliness_metrics ->> 'avg_isolation_risk_score'::text), ''::text))::numeric AS avg_isolation_risk_score,
    (NULLIF((loneliness_metrics ->> 'missing_people_rate'::text), ''::text))::numeric AS missing_people_rate,
    (NULLIF((loneliness_metrics ->> 'social_isolation_rate'::text), ''::text))::numeric AS social_isolation_rate,
    (NULLIF((engagement_metrics ->> 'avg_engagement_rating'::text), ''::text))::numeric AS avg_engagement_rating,
    (NULLIF((engagement_metrics ->> 'avg_elder_talk_ratio'::text), ''::text))::numeric AS avg_elder_talk_ratio,
    (NULLIF((social_metrics ->> 'support_system_strength_avg'::text), ''::text))::numeric AS support_system_strength_avg,
    (NULLIF((social_metrics ->> 'unique_contact_mentions'::text), ''::text))::numeric AS unique_contact_mentions,
    (NULLIF((social_metrics ->> 'social_activities_mentioned_count'::text), ''::text))::numeric AS social_activities_mentioned_count
   FROM public.elder_analysis_reports r;


CREATE OR REPLACE FUNCTION public.dispatch_weekly_insights_generation(p_week_start_utc date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  cfg record;
  request_id bigint;
  effective_week_start date;
begin
  effective_week_start := coalesce(
    p_week_start_utc,
    (date_trunc('week', now() at time zone 'UTC'))::date - 7
  );

  select endpoint_url, auth_header, enabled, run_trends, trend_window_weeks
  into cfg
  from public.weekly_insights_cron_config
  where id = true;

  if not found
     or not cfg.enabled
     or coalesce(btrim(cfg.endpoint_url), '') = ''
     or coalesce(btrim(cfg.auth_header), '') = '' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'cron_config_missing_or_disabled',
      'week_start_utc', effective_week_start::text,
      'at', now()
    );
  end if;

  request_id := net.http_post(
    url := cfg.endpoint_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', cfg.auth_header
    ),
    body := jsonb_build_object(
      'week_start_utc', effective_week_start::text,
      'backfill_weeks', 1,
      'run_trends', coalesce(cfg.run_trends, true),
      'trend_window_weeks', greatest(4, least(12, coalesce(cfg.trend_window_weeks, 8)))
    )
  );

  return jsonb_build_object(
    'ok', true,
    'request_id', request_id,
    'week_start_utc', effective_week_start::text,
    'run_trends', coalesce(cfg.run_trends, true),
    'trend_window_weeks', greatest(4, least(12, coalesce(cfg.trend_window_weeks, 8))),
    'at', now()
  );
end;
$function$
;

grant delete on table "public"."billing_records" to "anon";

grant insert on table "public"."billing_records" to "anon";

grant references on table "public"."billing_records" to "anon";

grant select on table "public"."billing_records" to "anon";

grant trigger on table "public"."billing_records" to "anon";

grant truncate on table "public"."billing_records" to "anon";

grant update on table "public"."billing_records" to "anon";

grant delete on table "public"."billing_records" to "authenticated";

grant insert on table "public"."billing_records" to "authenticated";

grant references on table "public"."billing_records" to "authenticated";

grant select on table "public"."billing_records" to "authenticated";

grant trigger on table "public"."billing_records" to "authenticated";

grant truncate on table "public"."billing_records" to "authenticated";

grant update on table "public"."billing_records" to "authenticated";

grant delete on table "public"."billing_records" to "service_role";

grant insert on table "public"."billing_records" to "service_role";

grant references on table "public"."billing_records" to "service_role";

grant select on table "public"."billing_records" to "service_role";

grant trigger on table "public"."billing_records" to "service_role";

grant truncate on table "public"."billing_records" to "service_role";

grant update on table "public"."billing_records" to "service_role";

grant delete on table "public"."billing_trial_reminders" to "anon";

grant insert on table "public"."billing_trial_reminders" to "anon";

grant references on table "public"."billing_trial_reminders" to "anon";

grant select on table "public"."billing_trial_reminders" to "anon";

grant trigger on table "public"."billing_trial_reminders" to "anon";

grant truncate on table "public"."billing_trial_reminders" to "anon";

grant update on table "public"."billing_trial_reminders" to "anon";

grant delete on table "public"."billing_trial_reminders" to "authenticated";

grant insert on table "public"."billing_trial_reminders" to "authenticated";

grant references on table "public"."billing_trial_reminders" to "authenticated";

grant select on table "public"."billing_trial_reminders" to "authenticated";

grant trigger on table "public"."billing_trial_reminders" to "authenticated";

grant truncate on table "public"."billing_trial_reminders" to "authenticated";

grant update on table "public"."billing_trial_reminders" to "authenticated";

grant delete on table "public"."billing_trial_reminders" to "service_role";

grant insert on table "public"."billing_trial_reminders" to "service_role";

grant references on table "public"."billing_trial_reminders" to "service_role";

grant select on table "public"."billing_trial_reminders" to "service_role";

grant trigger on table "public"."billing_trial_reminders" to "service_role";

grant truncate on table "public"."billing_trial_reminders" to "service_role";

grant update on table "public"."billing_trial_reminders" to "service_role";

grant delete on table "public"."call_executions" to "anon";

grant insert on table "public"."call_executions" to "anon";

grant references on table "public"."call_executions" to "anon";

grant select on table "public"."call_executions" to "anon";

grant trigger on table "public"."call_executions" to "anon";

grant truncate on table "public"."call_executions" to "anon";

grant update on table "public"."call_executions" to "anon";

grant delete on table "public"."call_executions" to "authenticated";

grant insert on table "public"."call_executions" to "authenticated";

grant references on table "public"."call_executions" to "authenticated";

grant select on table "public"."call_executions" to "authenticated";

grant trigger on table "public"."call_executions" to "authenticated";

grant truncate on table "public"."call_executions" to "authenticated";

grant update on table "public"."call_executions" to "authenticated";

grant delete on table "public"."call_executions" to "service_role";

grant insert on table "public"."call_executions" to "service_role";

grant references on table "public"."call_executions" to "service_role";

grant select on table "public"."call_executions" to "service_role";

grant trigger on table "public"."call_executions" to "service_role";

grant truncate on table "public"."call_executions" to "service_role";

grant update on table "public"."call_executions" to "service_role";

grant delete on table "public"."call_requests" to "anon";

grant insert on table "public"."call_requests" to "anon";

grant references on table "public"."call_requests" to "anon";

grant select on table "public"."call_requests" to "anon";

grant trigger on table "public"."call_requests" to "anon";

grant truncate on table "public"."call_requests" to "anon";

grant update on table "public"."call_requests" to "anon";

grant delete on table "public"."call_requests" to "authenticated";

grant insert on table "public"."call_requests" to "authenticated";

grant references on table "public"."call_requests" to "authenticated";

grant select on table "public"."call_requests" to "authenticated";

grant trigger on table "public"."call_requests" to "authenticated";

grant truncate on table "public"."call_requests" to "authenticated";

grant update on table "public"."call_requests" to "authenticated";

grant delete on table "public"."call_requests" to "service_role";

grant insert on table "public"."call_requests" to "service_role";

grant references on table "public"."call_requests" to "service_role";

grant select on table "public"."call_requests" to "service_role";

grant trigger on table "public"."call_requests" to "service_role";

grant truncate on table "public"."call_requests" to "service_role";

grant update on table "public"."call_requests" to "service_role";

grant delete on table "public"."call_schedules" to "anon";

grant insert on table "public"."call_schedules" to "anon";

grant references on table "public"."call_schedules" to "anon";

grant select on table "public"."call_schedules" to "anon";

grant trigger on table "public"."call_schedules" to "anon";

grant truncate on table "public"."call_schedules" to "anon";

grant update on table "public"."call_schedules" to "anon";

grant delete on table "public"."call_schedules" to "authenticated";

grant insert on table "public"."call_schedules" to "authenticated";

grant references on table "public"."call_schedules" to "authenticated";

grant select on table "public"."call_schedules" to "authenticated";

grant trigger on table "public"."call_schedules" to "authenticated";

grant truncate on table "public"."call_schedules" to "authenticated";

grant update on table "public"."call_schedules" to "authenticated";

grant delete on table "public"."call_schedules" to "service_role";

grant insert on table "public"."call_schedules" to "service_role";

grant references on table "public"."call_schedules" to "service_role";

grant select on table "public"."call_schedules" to "service_role";

grant trigger on table "public"."call_schedules" to "service_role";

grant truncate on table "public"."call_schedules" to "service_role";

grant update on table "public"."call_schedules" to "service_role";

grant delete on table "public"."demo_calls" to "anon";

grant insert on table "public"."demo_calls" to "anon";

grant references on table "public"."demo_calls" to "anon";

grant select on table "public"."demo_calls" to "anon";

grant trigger on table "public"."demo_calls" to "anon";

grant truncate on table "public"."demo_calls" to "anon";

grant update on table "public"."demo_calls" to "anon";

grant delete on table "public"."demo_calls" to "authenticated";

grant insert on table "public"."demo_calls" to "authenticated";

grant references on table "public"."demo_calls" to "authenticated";

grant select on table "public"."demo_calls" to "authenticated";

grant trigger on table "public"."demo_calls" to "authenticated";

grant truncate on table "public"."demo_calls" to "authenticated";

grant update on table "public"."demo_calls" to "authenticated";

grant delete on table "public"."demo_calls" to "service_role";

grant insert on table "public"."demo_calls" to "service_role";

grant references on table "public"."demo_calls" to "service_role";

grant select on table "public"."demo_calls" to "service_role";

grant trigger on table "public"."demo_calls" to "service_role";

grant truncate on table "public"."demo_calls" to "service_role";

grant update on table "public"."demo_calls" to "service_role";

grant delete on table "public"."demo_leads" to "anon";

grant insert on table "public"."demo_leads" to "anon";

grant references on table "public"."demo_leads" to "anon";

grant select on table "public"."demo_leads" to "anon";

grant trigger on table "public"."demo_leads" to "anon";

grant truncate on table "public"."demo_leads" to "anon";

grant update on table "public"."demo_leads" to "anon";

grant delete on table "public"."demo_leads" to "authenticated";

grant insert on table "public"."demo_leads" to "authenticated";

grant references on table "public"."demo_leads" to "authenticated";

grant select on table "public"."demo_leads" to "authenticated";

grant trigger on table "public"."demo_leads" to "authenticated";

grant truncate on table "public"."demo_leads" to "authenticated";

grant update on table "public"."demo_leads" to "authenticated";

grant delete on table "public"."demo_leads" to "service_role";

grant insert on table "public"."demo_leads" to "service_role";

grant references on table "public"."demo_leads" to "service_role";

grant select on table "public"."demo_leads" to "service_role";

grant trigger on table "public"."demo_leads" to "service_role";

grant truncate on table "public"."demo_leads" to "service_role";

grant update on table "public"."demo_leads" to "service_role";

grant delete on table "public"."elder_analysis_reports" to "anon";

grant insert on table "public"."elder_analysis_reports" to "anon";

grant references on table "public"."elder_analysis_reports" to "anon";

grant select on table "public"."elder_analysis_reports" to "anon";

grant trigger on table "public"."elder_analysis_reports" to "anon";

grant truncate on table "public"."elder_analysis_reports" to "anon";

grant update on table "public"."elder_analysis_reports" to "anon";

grant delete on table "public"."elder_analysis_reports" to "authenticated";

grant insert on table "public"."elder_analysis_reports" to "authenticated";

grant references on table "public"."elder_analysis_reports" to "authenticated";

grant select on table "public"."elder_analysis_reports" to "authenticated";

grant trigger on table "public"."elder_analysis_reports" to "authenticated";

grant truncate on table "public"."elder_analysis_reports" to "authenticated";

grant update on table "public"."elder_analysis_reports" to "authenticated";

grant delete on table "public"."elder_analysis_reports" to "service_role";

grant insert on table "public"."elder_analysis_reports" to "service_role";

grant references on table "public"."elder_analysis_reports" to "service_role";

grant select on table "public"."elder_analysis_reports" to "service_role";

grant trigger on table "public"."elder_analysis_reports" to "service_role";

grant truncate on table "public"."elder_analysis_reports" to "service_role";

grant update on table "public"."elder_analysis_reports" to "service_role";

grant delete on table "public"."elder_call_schedules" to "anon";

grant insert on table "public"."elder_call_schedules" to "anon";

grant references on table "public"."elder_call_schedules" to "anon";

grant select on table "public"."elder_call_schedules" to "anon";

grant trigger on table "public"."elder_call_schedules" to "anon";

grant truncate on table "public"."elder_call_schedules" to "anon";

grant update on table "public"."elder_call_schedules" to "anon";

grant delete on table "public"."elder_call_schedules" to "authenticated";

grant insert on table "public"."elder_call_schedules" to "authenticated";

grant references on table "public"."elder_call_schedules" to "authenticated";

grant select on table "public"."elder_call_schedules" to "authenticated";

grant trigger on table "public"."elder_call_schedules" to "authenticated";

grant truncate on table "public"."elder_call_schedules" to "authenticated";

grant update on table "public"."elder_call_schedules" to "authenticated";

grant delete on table "public"."elder_call_schedules" to "service_role";

grant insert on table "public"."elder_call_schedules" to "service_role";

grant references on table "public"."elder_call_schedules" to "service_role";

grant select on table "public"."elder_call_schedules" to "service_role";

grant trigger on table "public"."elder_call_schedules" to "service_role";

grant truncate on table "public"."elder_call_schedules" to "service_role";

grant update on table "public"."elder_call_schedules" to "service_role";

grant delete on table "public"."elder_emergency_contact" to "anon";

grant insert on table "public"."elder_emergency_contact" to "anon";

grant references on table "public"."elder_emergency_contact" to "anon";

grant select on table "public"."elder_emergency_contact" to "anon";

grant trigger on table "public"."elder_emergency_contact" to "anon";

grant truncate on table "public"."elder_emergency_contact" to "anon";

grant update on table "public"."elder_emergency_contact" to "anon";

grant delete on table "public"."elder_emergency_contact" to "authenticated";

grant insert on table "public"."elder_emergency_contact" to "authenticated";

grant references on table "public"."elder_emergency_contact" to "authenticated";

grant select on table "public"."elder_emergency_contact" to "authenticated";

grant trigger on table "public"."elder_emergency_contact" to "authenticated";

grant truncate on table "public"."elder_emergency_contact" to "authenticated";

grant update on table "public"."elder_emergency_contact" to "authenticated";

grant delete on table "public"."elder_emergency_contact" to "service_role";

grant insert on table "public"."elder_emergency_contact" to "service_role";

grant references on table "public"."elder_emergency_contact" to "service_role";

grant select on table "public"."elder_emergency_contact" to "service_role";

grant trigger on table "public"."elder_emergency_contact" to "service_role";

grant truncate on table "public"."elder_emergency_contact" to "service_role";

grant update on table "public"."elder_emergency_contact" to "service_role";

grant delete on table "public"."elder_prompt_context_cache" to "anon";

grant insert on table "public"."elder_prompt_context_cache" to "anon";

grant references on table "public"."elder_prompt_context_cache" to "anon";

grant select on table "public"."elder_prompt_context_cache" to "anon";

grant trigger on table "public"."elder_prompt_context_cache" to "anon";

grant truncate on table "public"."elder_prompt_context_cache" to "anon";

grant update on table "public"."elder_prompt_context_cache" to "anon";

grant delete on table "public"."elder_prompt_context_cache" to "authenticated";

grant insert on table "public"."elder_prompt_context_cache" to "authenticated";

grant references on table "public"."elder_prompt_context_cache" to "authenticated";

grant select on table "public"."elder_prompt_context_cache" to "authenticated";

grant trigger on table "public"."elder_prompt_context_cache" to "authenticated";

grant truncate on table "public"."elder_prompt_context_cache" to "authenticated";

grant update on table "public"."elder_prompt_context_cache" to "authenticated";

grant delete on table "public"."elder_prompt_context_cache" to "service_role";

grant insert on table "public"."elder_prompt_context_cache" to "service_role";

grant references on table "public"."elder_prompt_context_cache" to "service_role";

grant select on table "public"."elder_prompt_context_cache" to "service_role";

grant trigger on table "public"."elder_prompt_context_cache" to "service_role";

grant truncate on table "public"."elder_prompt_context_cache" to "service_role";

grant update on table "public"."elder_prompt_context_cache" to "service_role";

grant delete on table "public"."elder_trend_reports" to "anon";

grant insert on table "public"."elder_trend_reports" to "anon";

grant references on table "public"."elder_trend_reports" to "anon";

grant select on table "public"."elder_trend_reports" to "anon";

grant trigger on table "public"."elder_trend_reports" to "anon";

grant truncate on table "public"."elder_trend_reports" to "anon";

grant update on table "public"."elder_trend_reports" to "anon";

grant delete on table "public"."elder_trend_reports" to "authenticated";

grant insert on table "public"."elder_trend_reports" to "authenticated";

grant references on table "public"."elder_trend_reports" to "authenticated";

grant select on table "public"."elder_trend_reports" to "authenticated";

grant trigger on table "public"."elder_trend_reports" to "authenticated";

grant truncate on table "public"."elder_trend_reports" to "authenticated";

grant update on table "public"."elder_trend_reports" to "authenticated";

grant delete on table "public"."elder_trend_reports" to "service_role";

grant insert on table "public"."elder_trend_reports" to "service_role";

grant references on table "public"."elder_trend_reports" to "service_role";

grant select on table "public"."elder_trend_reports" to "service_role";

grant trigger on table "public"."elder_trend_reports" to "service_role";

grant truncate on table "public"."elder_trend_reports" to "service_role";

grant update on table "public"."elder_trend_reports" to "service_role";

grant delete on table "public"."elders" to "anon";

grant insert on table "public"."elders" to "anon";

grant references on table "public"."elders" to "anon";

grant select on table "public"."elders" to "anon";

grant trigger on table "public"."elders" to "anon";

grant truncate on table "public"."elders" to "anon";

grant update on table "public"."elders" to "anon";

grant delete on table "public"."elders" to "authenticated";

grant insert on table "public"."elders" to "authenticated";

grant references on table "public"."elders" to "authenticated";

grant select on table "public"."elders" to "authenticated";

grant trigger on table "public"."elders" to "authenticated";

grant truncate on table "public"."elders" to "authenticated";

grant update on table "public"."elders" to "authenticated";

grant delete on table "public"."elders" to "service_role";

grant insert on table "public"."elders" to "service_role";

grant references on table "public"."elders" to "service_role";

grant select on table "public"."elders" to "service_role";

grant trigger on table "public"."elders" to "service_role";

grant truncate on table "public"."elders" to "service_role";

grant update on table "public"."elders" to "service_role";

grant delete on table "public"."emergency_contacts" to "anon";

grant insert on table "public"."emergency_contacts" to "anon";

grant references on table "public"."emergency_contacts" to "anon";

grant select on table "public"."emergency_contacts" to "anon";

grant trigger on table "public"."emergency_contacts" to "anon";

grant truncate on table "public"."emergency_contacts" to "anon";

grant update on table "public"."emergency_contacts" to "anon";

grant delete on table "public"."emergency_contacts" to "authenticated";

grant insert on table "public"."emergency_contacts" to "authenticated";

grant references on table "public"."emergency_contacts" to "authenticated";

grant select on table "public"."emergency_contacts" to "authenticated";

grant trigger on table "public"."emergency_contacts" to "authenticated";

grant truncate on table "public"."emergency_contacts" to "authenticated";

grant update on table "public"."emergency_contacts" to "authenticated";

grant delete on table "public"."emergency_contacts" to "service_role";

grant insert on table "public"."emergency_contacts" to "service_role";

grant references on table "public"."emergency_contacts" to "service_role";

grant select on table "public"."emergency_contacts" to "service_role";

grant trigger on table "public"."emergency_contacts" to "service_role";

grant truncate on table "public"."emergency_contacts" to "service_role";

grant update on table "public"."emergency_contacts" to "service_role";

grant delete on table "public"."escalation_contact_attempts" to "anon";

grant insert on table "public"."escalation_contact_attempts" to "anon";

grant references on table "public"."escalation_contact_attempts" to "anon";

grant select on table "public"."escalation_contact_attempts" to "anon";

grant trigger on table "public"."escalation_contact_attempts" to "anon";

grant truncate on table "public"."escalation_contact_attempts" to "anon";

grant update on table "public"."escalation_contact_attempts" to "anon";

grant delete on table "public"."escalation_contact_attempts" to "authenticated";

grant insert on table "public"."escalation_contact_attempts" to "authenticated";

grant references on table "public"."escalation_contact_attempts" to "authenticated";

grant select on table "public"."escalation_contact_attempts" to "authenticated";

grant trigger on table "public"."escalation_contact_attempts" to "authenticated";

grant truncate on table "public"."escalation_contact_attempts" to "authenticated";

grant update on table "public"."escalation_contact_attempts" to "authenticated";

grant delete on table "public"."escalation_contact_attempts" to "service_role";

grant insert on table "public"."escalation_contact_attempts" to "service_role";

grant references on table "public"."escalation_contact_attempts" to "service_role";

grant select on table "public"."escalation_contact_attempts" to "service_role";

grant trigger on table "public"."escalation_contact_attempts" to "service_role";

grant truncate on table "public"."escalation_contact_attempts" to "service_role";

grant update on table "public"."escalation_contact_attempts" to "service_role";

grant delete on table "public"."escalation_followups" to "anon";

grant insert on table "public"."escalation_followups" to "anon";

grant references on table "public"."escalation_followups" to "anon";

grant select on table "public"."escalation_followups" to "anon";

grant trigger on table "public"."escalation_followups" to "anon";

grant truncate on table "public"."escalation_followups" to "anon";

grant update on table "public"."escalation_followups" to "anon";

grant delete on table "public"."escalation_followups" to "authenticated";

grant insert on table "public"."escalation_followups" to "authenticated";

grant references on table "public"."escalation_followups" to "authenticated";

grant select on table "public"."escalation_followups" to "authenticated";

grant trigger on table "public"."escalation_followups" to "authenticated";

grant truncate on table "public"."escalation_followups" to "authenticated";

grant update on table "public"."escalation_followups" to "authenticated";

grant delete on table "public"."escalation_followups" to "service_role";

grant insert on table "public"."escalation_followups" to "service_role";

grant references on table "public"."escalation_followups" to "service_role";

grant select on table "public"."escalation_followups" to "service_role";

grant trigger on table "public"."escalation_followups" to "service_role";

grant truncate on table "public"."escalation_followups" to "service_role";

grant update on table "public"."escalation_followups" to "service_role";

grant delete on table "public"."escalation_incidents" to "anon";

grant insert on table "public"."escalation_incidents" to "anon";

grant references on table "public"."escalation_incidents" to "anon";

grant select on table "public"."escalation_incidents" to "anon";

grant trigger on table "public"."escalation_incidents" to "anon";

grant truncate on table "public"."escalation_incidents" to "anon";

grant update on table "public"."escalation_incidents" to "anon";

grant delete on table "public"."escalation_incidents" to "authenticated";

grant insert on table "public"."escalation_incidents" to "authenticated";

grant references on table "public"."escalation_incidents" to "authenticated";

grant select on table "public"."escalation_incidents" to "authenticated";

grant trigger on table "public"."escalation_incidents" to "authenticated";

grant truncate on table "public"."escalation_incidents" to "authenticated";

grant update on table "public"."escalation_incidents" to "authenticated";

grant delete on table "public"."escalation_incidents" to "service_role";

grant insert on table "public"."escalation_incidents" to "service_role";

grant references on table "public"."escalation_incidents" to "service_role";

grant select on table "public"."escalation_incidents" to "service_role";

grant trigger on table "public"."escalation_incidents" to "service_role";

grant truncate on table "public"."escalation_incidents" to "service_role";

grant update on table "public"."escalation_incidents" to "service_role";

grant delete on table "public"."notification_sends" to "anon";

grant insert on table "public"."notification_sends" to "anon";

grant references on table "public"."notification_sends" to "anon";

grant select on table "public"."notification_sends" to "anon";

grant trigger on table "public"."notification_sends" to "anon";

grant truncate on table "public"."notification_sends" to "anon";

grant update on table "public"."notification_sends" to "anon";

grant delete on table "public"."notification_sends" to "authenticated";

grant insert on table "public"."notification_sends" to "authenticated";

grant references on table "public"."notification_sends" to "authenticated";

grant select on table "public"."notification_sends" to "authenticated";

grant trigger on table "public"."notification_sends" to "authenticated";

grant truncate on table "public"."notification_sends" to "authenticated";

grant update on table "public"."notification_sends" to "authenticated";

grant delete on table "public"."notification_sends" to "service_role";

grant insert on table "public"."notification_sends" to "service_role";

grant references on table "public"."notification_sends" to "service_role";

grant select on table "public"."notification_sends" to "service_role";

grant trigger on table "public"."notification_sends" to "service_role";

grant truncate on table "public"."notification_sends" to "service_role";

grant update on table "public"."notification_sends" to "service_role";

grant delete on table "public"."organization_invitations" to "anon";

grant insert on table "public"."organization_invitations" to "anon";

grant references on table "public"."organization_invitations" to "anon";

grant select on table "public"."organization_invitations" to "anon";

grant trigger on table "public"."organization_invitations" to "anon";

grant truncate on table "public"."organization_invitations" to "anon";

grant update on table "public"."organization_invitations" to "anon";

grant delete on table "public"."organization_invitations" to "authenticated";

grant insert on table "public"."organization_invitations" to "authenticated";

grant references on table "public"."organization_invitations" to "authenticated";

grant select on table "public"."organization_invitations" to "authenticated";

grant trigger on table "public"."organization_invitations" to "authenticated";

grant truncate on table "public"."organization_invitations" to "authenticated";

grant update on table "public"."organization_invitations" to "authenticated";

grant delete on table "public"."organization_invitations" to "service_role";

grant insert on table "public"."organization_invitations" to "service_role";

grant references on table "public"."organization_invitations" to "service_role";

grant select on table "public"."organization_invitations" to "service_role";

grant trigger on table "public"."organization_invitations" to "service_role";

grant truncate on table "public"."organization_invitations" to "service_role";

grant update on table "public"."organization_invitations" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant references on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";

grant delete on table "public"."post_call_reports" to "anon";

grant insert on table "public"."post_call_reports" to "anon";

grant references on table "public"."post_call_reports" to "anon";

grant select on table "public"."post_call_reports" to "anon";

grant trigger on table "public"."post_call_reports" to "anon";

grant truncate on table "public"."post_call_reports" to "anon";

grant update on table "public"."post_call_reports" to "anon";

grant delete on table "public"."post_call_reports" to "authenticated";

grant insert on table "public"."post_call_reports" to "authenticated";

grant references on table "public"."post_call_reports" to "authenticated";

grant select on table "public"."post_call_reports" to "authenticated";

grant trigger on table "public"."post_call_reports" to "authenticated";

grant truncate on table "public"."post_call_reports" to "authenticated";

grant update on table "public"."post_call_reports" to "authenticated";

grant delete on table "public"."post_call_reports" to "service_role";

grant insert on table "public"."post_call_reports" to "service_role";

grant references on table "public"."post_call_reports" to "service_role";

grant select on table "public"."post_call_reports" to "service_role";

grant trigger on table "public"."post_call_reports" to "service_role";

grant truncate on table "public"."post_call_reports" to "service_role";

grant update on table "public"."post_call_reports" to "service_role";

grant delete on table "public"."user_notification_prefs" to "anon";

grant insert on table "public"."user_notification_prefs" to "anon";

grant references on table "public"."user_notification_prefs" to "anon";

grant select on table "public"."user_notification_prefs" to "anon";

grant trigger on table "public"."user_notification_prefs" to "anon";

grant truncate on table "public"."user_notification_prefs" to "anon";

grant update on table "public"."user_notification_prefs" to "anon";

grant delete on table "public"."user_notification_prefs" to "authenticated";

grant insert on table "public"."user_notification_prefs" to "authenticated";

grant references on table "public"."user_notification_prefs" to "authenticated";

grant select on table "public"."user_notification_prefs" to "authenticated";

grant trigger on table "public"."user_notification_prefs" to "authenticated";

grant truncate on table "public"."user_notification_prefs" to "authenticated";

grant update on table "public"."user_notification_prefs" to "authenticated";

grant delete on table "public"."user_notification_prefs" to "service_role";

grant insert on table "public"."user_notification_prefs" to "service_role";

grant references on table "public"."user_notification_prefs" to "service_role";

grant select on table "public"."user_notification_prefs" to "service_role";

grant trigger on table "public"."user_notification_prefs" to "service_role";

grant truncate on table "public"."user_notification_prefs" to "service_role";

grant update on table "public"."user_notification_prefs" to "service_role";

grant delete on table "public"."user_organizations" to "anon";

grant insert on table "public"."user_organizations" to "anon";

grant references on table "public"."user_organizations" to "anon";

grant select on table "public"."user_organizations" to "anon";

grant trigger on table "public"."user_organizations" to "anon";

grant truncate on table "public"."user_organizations" to "anon";

grant update on table "public"."user_organizations" to "anon";

grant delete on table "public"."user_organizations" to "authenticated";

grant insert on table "public"."user_organizations" to "authenticated";

grant references on table "public"."user_organizations" to "authenticated";

grant select on table "public"."user_organizations" to "authenticated";

grant trigger on table "public"."user_organizations" to "authenticated";

grant truncate on table "public"."user_organizations" to "authenticated";

grant update on table "public"."user_organizations" to "authenticated";

grant delete on table "public"."user_organizations" to "service_role";

grant insert on table "public"."user_organizations" to "service_role";

grant references on table "public"."user_organizations" to "service_role";

grant select on table "public"."user_organizations" to "service_role";

grant trigger on table "public"."user_organizations" to "service_role";

grant truncate on table "public"."user_organizations" to "service_role";

grant update on table "public"."user_organizations" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Users can insert billing records in same organization"
  on "public"."billing_records"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update billing records in same organization"
  on "public"."billing_records"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view billing records for their organizations"
  on "public"."billing_records"
  as permissive
  for all
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view billing records in same organization"
  on "public"."billing_records"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view own billing records"
  on "public"."billing_records"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "Users can delete call executions"
  on "public"."call_executions"
  as permissive
  for delete
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT user_organizations.org_id
           FROM public.user_organizations
          WHERE ((user_organizations.user_id IN ( SELECT users.id
                   FROM public.users
                  WHERE (users.auth_user_id = auth.uid()))) AND (user_organizations.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can insert call executions in same organization"
  on "public"."call_executions"
  as permissive
  for insert
  to public
with check ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert call executions"
  on "public"."call_executions"
  as permissive
  for insert
  to public
with check ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT user_organizations.org_id
           FROM public.user_organizations
          WHERE ((user_organizations.user_id IN ( SELECT users.id
                   FROM public.users
                  WHERE (users.auth_user_id = auth.uid()))) AND (user_organizations.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can update call executions in same organization"
  on "public"."call_executions"
  as permissive
  for update
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update call executions"
  on "public"."call_executions"
  as permissive
  for update
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT user_organizations.org_id
           FROM public.user_organizations
          WHERE ((user_organizations.user_id IN ( SELECT users.id
                   FROM public.users
                  WHERE (users.auth_user_id = auth.uid()))) AND (user_organizations.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can view call executions for own elders"
  on "public"."call_executions"
  as permissive
  for all
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE (elders.user_id = auth.uid()))));



  create policy "Users can view call executions in same organization"
  on "public"."call_executions"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view call executions"
  on "public"."call_executions"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT user_organizations.org_id
           FROM public.user_organizations
          WHERE ((user_organizations.user_id IN ( SELECT users.id
                   FROM public.users
                  WHERE (users.auth_user_id = auth.uid()))) AND (user_organizations.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can update call requests for their elders"
  on "public"."call_requests"
  as permissive
  for update
  to public
using (((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((e.id = call_requests.elder_id) AND (u.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((e.id = call_requests.elder_id) AND (u.auth_user_id = auth.uid()) AND (uo.active = true))))));



  create policy "Users can view call requests for their elders"
  on "public"."call_requests"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((e.id = call_requests.elder_id) AND (u.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((e.id = call_requests.elder_id) AND (u.auth_user_id = auth.uid()) AND (uo.active = true))))));



  create policy "Individuals manage own call schedules"
  on "public"."call_schedules"
  as permissive
  for all
  to public
using (((schedule_type = 'b2c'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE (u.auth_user_id = auth.uid())))))
with check (((schedule_type = 'b2c'::text) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE (u.auth_user_id = auth.uid())))));



  create policy "Users can delete call schedules in same organization"
  on "public"."call_schedules"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert call schedules in same organization"
  on "public"."call_schedules"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update call schedules in same organization"
  on "public"."call_schedules"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view call schedules in same organization"
  on "public"."call_schedules"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view call schedules in their organizations"
  on "public"."call_schedules"
  as permissive
  for all
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Service role has full access to demo_calls"
  on "public"."demo_calls"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Service role has full access to demo_leads"
  on "public"."demo_leads"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "elder_analysis_reports_select_own_or_org"
  on "public"."elder_analysis_reports"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((u.id = e.user_id)))
  WHERE ((e.id = elder_analysis_reports.elder_id) AND ((u.auth_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.user_current_context ctx
          WHERE ((ctx.auth_user_id = auth.uid()) AND (e.org_id IS NOT NULL) AND (ctx.org_id = e.org_id) AND COALESCE(ctx.org_active, true)))))))));



  create policy "Individuals manage own elder schedules"
  on "public"."elder_call_schedules"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((u.id = e.user_id)))
  WHERE ((e.id = elder_call_schedules.elder_id) AND (u.auth_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((u.id = e.user_id)))
  WHERE ((e.id = elder_call_schedules.elder_id) AND (u.auth_user_id = auth.uid())))));



  create policy "Users can delete elder call schedules in same organization"
  on "public"."elder_call_schedules"
  as permissive
  for delete
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert elder call schedules in same organization"
  on "public"."elder_call_schedules"
  as permissive
  for insert
  to public
with check ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update elder call schedules in same organization"
  on "public"."elder_call_schedules"
  as permissive
  for update
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view elder call schedules in same organization"
  on "public"."elder_call_schedules"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view elder call schedules in their organizations"
  on "public"."elder_call_schedules"
  as permissive
  for all
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can delete elder emergency contacts in same organization"
  on "public"."elder_emergency_contact"
  as permissive
  for delete
  to public
using (((EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (e.id = elder_emergency_contact.elder_id)))) OR (EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (e.id = elder_emergency_contact.elder_id))))));



  create policy "Users can insert elder emergency contacts in same organization"
  on "public"."elder_emergency_contact"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (e.id = elder_emergency_contact.elder_id)))) OR (EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (e.id = elder_emergency_contact.elder_id))))));



  create policy "Users can update elder emergency contacts in same organization"
  on "public"."elder_emergency_contact"
  as permissive
  for update
  to public
using (((EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (e.id = elder_emergency_contact.elder_id)))) OR (EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (e.id = elder_emergency_contact.elder_id))))))
with check (((EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (e.id = elder_emergency_contact.elder_id)))) OR (EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (e.id = elder_emergency_contact.elder_id))))));



  create policy "Users can view elder emergency contacts in same organization"
  on "public"."elder_emergency_contact"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (e.id = elder_emergency_contact.elder_id)))) OR (EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (e.id = elder_emergency_contact.elder_id))))));



  create policy "elder_trend_reports_select_own_or_org"
  on "public"."elder_trend_reports"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.elders e
     JOIN public.user_current_context ctx ON ((ctx.auth_user_id = auth.uid())))
  WHERE ((e.id = elder_trend_reports.elder_id) AND ((e.user_id = ctx.user_id) OR ((e.org_id IS NOT NULL) AND (ctx.org_id = e.org_id) AND COALESCE(ctx.org_active, true)))))));



  create policy "elder_trend_reports_service_role_all"
  on "public"."elder_trend_reports"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Individuals manage own elders"
  on "public"."elders"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = elders.user_id) AND (u.auth_user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = elders.user_id) AND (u.auth_user_id = auth.uid())))));



  create policy "Users can delete elders in same organization"
  on "public"."elders"
  as permissive
  for delete
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert elders in same organization"
  on "public"."elders"
  as permissive
  for insert
  to public
with check ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update elders in same organization"
  on "public"."elders"
  as permissive
  for update
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view elders in same organization"
  on "public"."elders"
  as permissive
  for select
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view elders in their organizations"
  on "public"."elders"
  as permissive
  for all
  to public
using ((org_id IN ( SELECT uo.org_id
   FROM (public.user_organizations uo
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "ec_delete_org_members"
  on "public"."emergency_contacts"
  as permissive
  for delete
  to public
using ((((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = emergency_contacts.org_id))))) OR ((org_id IS NULL) AND (auth.uid() IS NOT NULL))));



  create policy "ec_insert_org_members"
  on "public"."emergency_contacts"
  as permissive
  for insert
  to public
with check ((((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = emergency_contacts.org_id))))) OR ((org_id IS NULL) AND (EXISTS ( SELECT 1
   FROM public.users u
  WHERE (u.auth_user_id = auth.uid()))))));



  create policy "ec_select_org_members"
  on "public"."emergency_contacts"
  as permissive
  for select
  to public
using ((((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = emergency_contacts.org_id))))) OR ((org_id IS NULL) AND (auth.uid() IS NOT NULL))));



  create policy "ec_update_org_members"
  on "public"."emergency_contacts"
  as permissive
  for update
  to public
using ((((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = emergency_contacts.org_id))))) OR ((org_id IS NULL) AND (auth.uid() IS NOT NULL))))
with check ((((org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = emergency_contacts.org_id))))) OR ((org_id IS NULL) AND (auth.uid() IS NOT NULL))));



  create policy "Users can insert escalation contact attempts"
  on "public"."escalation_contact_attempts"
  as permissive
  for insert
  to public
with check ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can select escalation contact attempts"
  on "public"."escalation_contact_attempts"
  as permissive
  for select
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can update escalation contact attempts"
  on "public"."escalation_contact_attempts"
  as permissive
  for update
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can view escalation contact attempts in their organizatio"
  on "public"."escalation_contact_attempts"
  as permissive
  for all
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (((public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert escalation followups"
  on "public"."escalation_followups"
  as permissive
  for insert
  to public
with check ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can select escalation followups"
  on "public"."escalation_followups"
  as permissive
  for select
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can update escalation followups"
  on "public"."escalation_followups"
  as permissive
  for update
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
  WHERE ((e.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (e.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can view escalation followups in their organizations"
  on "public"."escalation_followups"
  as permissive
  for all
  to public
using ((escalation_incident_id IN ( SELECT ei.id
   FROM (((public.escalation_incidents ei
     JOIN public.elders e ON ((ei.elder_id = e.id)))
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can insert escalation incidents"
  on "public"."escalation_incidents"
  as permissive
  for insert
  to public
with check ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can select escalation incidents"
  on "public"."escalation_incidents"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can update escalation incidents"
  on "public"."escalation_incidents"
  as permissive
  for update
  to public
using ((elder_id IN ( SELECT elders.id
   FROM public.elders
  WHERE ((elders.org_id IN ( SELECT uo.org_id
           FROM (public.user_organizations uo
             JOIN public.users u ON ((uo.user_id = u.id)))
          WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))) OR (elders.user_id IN ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))))));



  create policy "Users can view escalation incidents in their organizations"
  on "public"."escalation_incidents"
  as permissive
  for all
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view their own notification sends"
  on "public"."notification_sends"
  as permissive
  for select
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Invited user can accept their invitation"
  on "public"."organization_invitations"
  as permissive
  for update
  to public
using ((lower(email) = lower(( SELECT users.email
   FROM public.users
  WHERE (users.auth_user_id = auth.uid())))));



  create policy "Invited user can view invitations by email"
  on "public"."organization_invitations"
  as permissive
  for select
  to public
using ((lower(email) = lower(( SELECT users.email
   FROM public.users
  WHERE (users.auth_user_id = auth.uid())))));



  create policy "Org admins can create invitations"
  on "public"."organization_invitations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.user_organizations uo
  WHERE ((uo.org_id = organization_invitations.org_id) AND (uo.user_id = ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid()))) AND (uo.role = 'admin'::text) AND (uo.active = true)))));



  create policy "Org admins can delete invitations"
  on "public"."organization_invitations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_organizations uo
  WHERE ((uo.org_id = organization_invitations.org_id) AND (uo.user_id = ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid()))) AND (uo.role = 'admin'::text) AND (uo.active = true)))));



  create policy "Org admins can update invitations"
  on "public"."organization_invitations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_organizations uo
  WHERE ((uo.org_id = organization_invitations.org_id) AND (uo.user_id = ( SELECT users.id
           FROM public.users
          WHERE (users.auth_user_id = auth.uid()))) AND (uo.role = 'admin'::text) AND (uo.active = true)))));



  create policy "org_delete_members"
  on "public"."organizations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = organizations.id)))));



  create policy "org_insert_members"
  on "public"."organizations"
  as permissive
  for insert
  to public
with check (true);



  create policy "org_select_members"
  on "public"."organizations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = organizations.id)))));



  create policy "org_update_members"
  on "public"."organizations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = organizations.id)))))
with check ((EXISTS ( SELECT 1
   FROM (public.user_organizations uo
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true) AND (uo.org_id = organizations.id)))));



  create policy "Users can insert post call reports in same organization"
  on "public"."post_call_reports"
  as permissive
  for insert
  to public
with check ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can update post call reports in same organization"
  on "public"."post_call_reports"
  as permissive
  for update
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view post call reports in same organization"
  on "public"."post_call_reports"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view post call reports in their organizations"
  on "public"."post_call_reports"
  as permissive
  for all
  to public
using ((elder_id IN ( SELECT e.id
   FROM ((public.elders e
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((u.id = uo.user_id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true)))));



  create policy "Users can view post_call_reports for own elders"
  on "public"."post_call_reports"
  as permissive
  for select
  to public
using ((elder_id IN ( SELECT elders.id
   FROM (public.elders
     JOIN public.users ON ((elders.user_id = users.id)))
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can insert their own notification preferences"
  on "public"."user_notification_prefs"
  as permissive
  for insert
  to public
with check ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can update their own notification preferences"
  on "public"."user_notification_prefs"
  as permissive
  for update
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can view their own notification preferences"
  on "public"."user_notification_prefs"
  as permissive
  for select
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can create own organization memberships"
  on "public"."user_organizations"
  as permissive
  for insert
  to public
with check (((auth.uid() IS NOT NULL) AND ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))) OR (user_id IS NULL))));



  create policy "Users can join orgs only via a valid invitation"
  on "public"."user_organizations"
  as permissive
  for insert
  to public
with check (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_invitations inv
  WHERE ((inv.org_id = user_organizations.org_id) AND (lower(inv.email) = lower(( SELECT users.email
           FROM public.users
          WHERE (users.auth_user_id = auth.uid())))) AND (inv.status = 'pending'::text) AND ((inv.expires_at IS NULL) OR (inv.expires_at > now())))))));



  create policy "Users can update own user organizations"
  on "public"."user_organizations"
  as permissive
  for update
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can view own organization memberships"
  on "public"."user_organizations"
  as permissive
  for all
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can view own user organizations"
  on "public"."user_organizations"
  as permissive
  for select
  to public
using ((user_id IN ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));



  create policy "Users can view their organization memberships"
  on "public"."user_organizations"
  as permissive
  for select
  to public
using (true);



  create policy "Users can create own profile"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((auth.uid() = auth_user_id));



  create policy "Users can insert their own profile"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((auth.uid() = auth_user_id));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = auth_user_id));



  create policy "Users can view own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = auth_user_id));



  create policy "Users can view their own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = auth_user_id));


CREATE TRIGGER trg_billing_trial_reminders_updated_at BEFORE UPDATE ON public.billing_trial_reminders FOR EACH ROW EXECUTE FUNCTION public.set_billing_trial_reminders_updated_at();

CREATE TRIGGER trg_call_executions_require_granted_consent BEFORE INSERT OR UPDATE OF elder_id, call_type ON public.call_executions FOR EACH ROW EXECUTE FUNCTION public.guard_scheduled_calls_require_consent();

CREATE TRIGGER update_call_executions_updated_at BEFORE UPDATE ON public.call_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_schedules_updated_at BEFORE UPDATE ON public.call_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER new_demo_lead_n8n AFTER INSERT OR UPDATE ON public.demo_leads FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://eva-cares.app.n8n.cloud/webhook/demo_leads', 'POST', '{"Content-type":"application/json","Authorization":"lgvaibot0902!"}', '{}', '5000');

CREATE TRIGGER trg_elder_analysis_reports_updated_at BEFORE UPDATE ON public.elder_analysis_reports FOR EACH ROW EXECUTE FUNCTION public.set_elder_analysis_reports_updated_at();

CREATE TRIGGER update_elder_call_schedules_updated_at BEFORE UPDATE ON public.elder_call_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_touch_elder_prompt_context_cache_updated_at BEFORE UPDATE ON public.elder_prompt_context_cache FOR EACH ROW EXECUTE FUNCTION public._touch_elder_prompt_context_cache_updated_at();

CREATE TRIGGER trg_elder_trend_reports_updated_at BEFORE UPDATE ON public.elder_trend_reports FOR EACH ROW EXECUTE FUNCTION public.set_elder_trend_reports_updated_at();

CREATE TRIGGER trg_elders_consent_ops_slack_notify AFTER INSERT OR UPDATE OF consent_status ON public.elders FOR EACH ROW EXECUTE FUNCTION public.notify_consent_ops_on_elder_changes();

CREATE TRIGGER trg_elders_consent_status_sync_calls AFTER INSERT OR UPDATE OF consent_status ON public.elders FOR EACH ROW EXECUTE FUNCTION public.handle_elder_consent_status_change();

CREATE TRIGGER update_elders_updated_at BEFORE UPDATE ON public.elders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_set_invite_email_normalized BEFORE INSERT OR UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.set_invite_email_normalized();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_prefs_updated_at BEFORE UPDATE ON public.user_notification_prefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_organizations_updated_at BEFORE UPDATE ON public.user_organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER b2c_user_notification_prefs_ai AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_b2c_notification_prefs();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();


  create policy "B2C users can download recordings for own elders"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'recordings'::text) AND ((regexp_split_to_array(name, '/'::text))[1] IN ( SELECT (ce.id)::text AS id
   FROM ((public.call_executions ce
     JOIN public.elders e ON ((ce.elder_id = e.id)))
     JOIN public.users u ON ((e.user_id = u.id)))
  WHERE (u.auth_user_id = auth.uid())))));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'demo-recordings'::text));



  create policy "Service Role Upload"
  on "storage"."objects"
  as permissive
  for insert
  to service_role
with check ((bucket_id = 'demo-recordings'::text));



  create policy "Service role can delete recordings"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'recordings'::text));



  create policy "Service role can upload recordings"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'recordings'::text));



  create policy "Users can download recordings for their organization elders"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'recordings'::text) AND ((regexp_split_to_array(name, '/'::text))[1] IN ( SELECT (ce.id)::text AS id
   FROM (((public.call_executions ce
     JOIN public.elders e ON ((ce.elder_id = e.id)))
     JOIN public.user_organizations uo ON ((e.org_id = uo.org_id)))
     JOIN public.users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = auth.uid()) AND (uo.active = true))))));



