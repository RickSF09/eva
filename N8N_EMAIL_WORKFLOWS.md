# N8N Email Notification Workflows

This document describes the three n8n workflows needed for B2C email notifications.

## Prerequisites

1. Supabase credentials configured in n8n
2. Email service (SMTP/SendGrid/Resend/etc.) configured in n8n
3. Database tables created (already done via migration)

## Workflow 1: Per-Call Email Notification

**Trigger**: Webhook (POST) - called when a post_call_report is created

**Webhook URL**: `https://your-n8n-instance.com/webhook/post-call-email`

**Workflow Steps**:

1. **Webhook Trigger**
   - Method: POST
   - Path: `post-call-email`
   - Expected body: `{ "post_call_report_id": "uuid", "elder_id": "uuid", "execution_id": "uuid" }`

2. **Fetch Call Report** (Supabase Node)
   - Operation: Select
   - Table: `post_call_reports`
   - Filter: `id = {{ $json.body.post_call_report_id }}`
   - Select: `id, summary, call_started_at, call_ended_at, duration_seconds, call_status, mood_assessment, sentiment_score, tone_analysis, escalation_triggered, transcript, recording_url, execution_id, elder_id`

3. **Fetch Elder Info** (Supabase Node)
   - Operation: Select
   - Table: `elders`
   - Filter: `id = {{ $json.elder_id }}`
   - Select: `id, first_name, last_name, user_id`

4. **Fetch User** (Supabase Node)
   - Operation: Select
   - Table: `users`
   - Filter: `id = {{ $json.user_id }}`
   - Select: `id, email, first_name, last_name`

5. **Fetch Preferences** (Supabase Node)
   - Operation: Select
   - Table: `user_notification_prefs`
   - Filter: `user_id = {{ $json.id }}`
   - Select: `*`

6. **Check Preferences** (IF Node)
   - Condition: `{{ $json.email_cadence }} === 'per_call'`
   - If false: Skip to response

7. **Check If Already Sent** (Supabase Node)
   - Operation: Select
   - Table: `notification_sends`
   - Filter: `user_id = {{ $("Fetch User").item.json.id }} AND resource_type = 'post_call_report' AND resource_id = {{ $("Fetch Call Report").item.json.id }}`

8. **Not Already Sent?** (IF Node)
   - Condition: `{{ $json.length }} === 0`
   - If false: Skip to response

9. **Prepare Email Data** (Set Node)
   - Set variables:
     - `elderName`: `{{ $("Fetch Elder Info").item.json.first_name + " " + $("Fetch Elder Info").item.json.last_name }}`
     - `callDate`: `{{ $("Fetch Call Report").item.json.call_started_at }}`
     - `duration`: `{{ Math.floor($("Fetch Call Report").item.json.duration_seconds / 60) + ":" + String($("Fetch Call Report").item.json.duration_seconds % 60).padStart(2, "0") }}`
     - `status`: `{{ $("Fetch Call Report").item.json.call_status }}`
     - `summary`: `{{ $("Fetch Call Report").item.json.summary || "No summary available" }}`
     - `mood`: `{{ $("Fetch Call Report").item.json.mood_assessment || $("Fetch Call Report").item.json.sentiment_score }}`
     - `escalated`: `{{ $("Fetch Call Report").item.json.escalation_triggered }}`
     - `recordingUrl`: `{{ $("Fetch Call Report").item.json.recording_url }}`
     - `includeTranscript`: `{{ $("Fetch Preferences").item.json.include_transcript }}`
     - `includeRecording`: `{{ $("Fetch Preferences").item.json.include_recording }}`

10. **Send Email** (Email Send Node)
    - From: `noreply@eva-cares.com`
    - To: `{{ $("Fetch User").item.json.email }}`
    - Subject: `Call with {{ $json.elderName }} - {{ new Date($json.callDate).toLocaleString() }}`
    - HTML Body: See template below

11. **Log Notification** (Supabase Node)
    - Operation: Insert
    - Table: `notification_sends`
    - Data:
      - `user_id`: `{{ $("Fetch User").item.json.id }}`
      - `resource_type`: `post_call_report`
      - `resource_id`: `{{ $("Fetch Call Report").item.json.id }}`
      - `status`: `sent`

12. **Respond** (Respond to Webhook Node)
    - Response: `{ "success": true, "message": "Email sent" }`

**Email Template**:
```html
<html>
<body>
  <h2>Call Report: {{ elderName }}</h2>
  <p><strong>Date:</strong> {{ new Date(callDate).toLocaleString() }}</p>
  <p><strong>Duration:</strong> {{ duration }}</p>
  <p><strong>Status:</strong> {{ status }}</p>
  {{#if escalated}}
  <p style="color: red;"><strong>⚠️ Escalation Triggered</strong></p>
  {{/if}}
  <h3>Summary</h3>
  <p>{{ summary }}</p>
  {{#if mood}}
  <p><strong>Mood:</strong> {{ mood }}</p>
  {{/if}}
  {{#if includeTranscript}}
  <h3>Transcript</h3>
  <pre>{{ transcript }}</pre>
  {{/if}}
  {{#if includeRecording}}
  {{#if recordingUrl}}
  <p><a href="{{ recordingUrl }}">Listen to Recording</a></p>
  {{/if}}
  {{/if}}
  <p><a href="https://app.eva-cares.com/app/home">View Full Report</a></p>
  <hr>
  <p style="font-size: 12px; color: #666;">
    <a href="https://app.eva-cares.com/app/settings">Manage email preferences</a>
  </p>
</body>
</html>
```

**Supabase Database Trigger** (to call webhook):
```sql
CREATE OR REPLACE FUNCTION notify_post_call_report()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://your-n8n-instance.com/webhook/post-call-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'post_call_report_id', NEW.id,
      'elder_id', NEW.elder_id,
      'execution_id', NEW.execution_id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_call_report_notification
  AFTER INSERT ON post_call_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_call_report();
```

## Workflow 2: Daily Email Digest

**Trigger**: Cron (runs every 15 minutes)

**Workflow Steps**:

1. **Cron Trigger**
   - Schedule: `*/15 * * * *` (every 15 minutes)

2. **Get Current Time in UTC** (Code Node)
   - Calculate current UTC time

3. **Fetch All B2C Users with Daily Preferences** (Supabase Node)
   - Operation: Select (with join)
   - Query:
     ```sql
     SELECT u.id, u.email, u.first_name, unp.*
     FROM users u
     INNER JOIN user_notification_prefs unp ON u.id = unp.user_id
     WHERE unp.email_cadence = 'daily'
     AND u.account_type = 'b2c'
     ```

4. **Loop Over Users** (Split In Batches or For Each)

5. **Check Time Window** (IF Node)
   - Convert user's `send_time_local` and `timezone` to UTC
   - Check if current UTC time is within 15-minute window of target time
   - If false: Skip user

6. **Check If Already Sent Today** (Supabase Node)
   - Operation: Select
   - Table: `notification_sends`
   - Filter: `user_id = {{ $json.id }} AND resource_type = 'daily_digest' AND period_start = CURRENT_DATE`

7. **Not Already Sent?** (IF Node)
   - Condition: `{{ $json.length }} === 0`
   - If false: Skip user

8. **Fetch Elder for User** (Supabase Node)
   - Operation: Select
   - Table: `elders`
   - Filter: `user_id = {{ $json.id }}`
   - Select: `id, first_name, last_name`

9. **Fetch Daily Report** (Supabase Node)
   - Operation: Select
   - Table: `daily_reports`
   - Filter: `elder_id = {{ $json.elder_id }} AND report_date = CURRENT_DATE - INTERVAL '1 day'`
   - Select: `*`

10. **Check If Call Was Made** (IF Node)
    - Condition: `{{ $("Fetch Preferences").item.json.only_if_call === false OR $json.total_calls_attempted > 0 }}`
    - If false: Skip user

11. **Prepare Email Data** (Set Node)
    - Aggregate data from daily_report

12. **Send Email** (Email Send Node)
    - Subject: `Your EVA Daily Summary - {{ yesterday's date }}`
    - HTML Body: See template below

13. **Log Notification** (Supabase Node)
    - Insert into `notification_sends` with `period_start = CURRENT_DATE - INTERVAL '1 day'`

14. **Update Daily Report** (Supabase Node)
    - Update `daily_reports.email_sent = true, email_sent_at = now()`

**Email Template**:
```html
<html>
<body>
  <h2>Your EVA Daily Summary - {{ reportDate }}</h2>
  <h3>Call Statistics</h3>
  <ul>
    <li><strong>Scheduled:</strong> {{ total_calls_scheduled }}</li>
    <li><strong>Attempted:</strong> {{ total_calls_attempted }}</li>
    <li><strong>Successful:</strong> {{ successful_calls }}</li>
    <li><strong>Missed:</strong> {{ missed_calls }}</li>
    <li><strong>Failed:</strong> {{ failed_calls }}</li>
  </ul>
  {{#if average_call_duration}}
  <p><strong>Average Call Duration:</strong> {{ average_call_duration }} minutes</p>
  {{/if}}
  {{#if overall_mood}}
  <p><strong>Overall Mood:</strong> {{ overall_mood }}</p>
  {{/if}}
  {{#if escalations}}
  <p style="color: red;"><strong>⚠️ Escalations:</strong> {{ escalations }}</p>
  {{/if}}
  {{#if summary}}
  <h3>Summary</h3>
  <p>{{ summary }}</p>
  {{/if}}
  <p><a href="https://app.eva-cares.com/app/home">View Dashboard</a></p>
  <hr>
  <p style="font-size: 12px; color: #666;">
    <a href="https://app.eva-cares.com/app/settings">Manage email preferences</a>
  </p>
</body>
</html>
```

## Workflow 3: Weekly Email Digest

**Trigger**: Cron (runs hourly)

**Workflow Steps**:

1. **Cron Trigger**
   - Schedule: `0 * * * *` (every hour)

2. **Get Current Time in UTC** (Code Node)

3. **Fetch All B2C Users with Weekly Preferences** (Supabase Node)
   - Operation: Select (with join)
   - Query:
     ```sql
     SELECT u.id, u.email, u.first_name, unp.*
     FROM users u
     INNER JOIN user_notification_prefs unp ON u.id = unp.user_id
     WHERE unp.email_cadence = 'weekly'
     AND u.account_type = 'b2c'
     ```

4. **Loop Over Users** (Split In Batches or For Each)

5. **Check Day and Time** (IF Node)
   - Get current day of week in user's timezone
   - Check if matches `weekly_day_of_week`
   - Convert `send_time_local` + `timezone` to UTC
   - Check if current UTC time is within 1-hour window
   - If false: Skip user

6. **Check If Already Sent This Week** (Supabase Node)
   - Operation: Select
   - Table: `notification_sends`
   - Filter: `user_id = {{ $json.id }} AND resource_type = 'weekly_digest' AND period_start >= DATE_TRUNC('week', CURRENT_DATE)`

7. **Not Already Sent?** (IF Node)
   - Condition: `{{ $json.length }} === 0`
   - If false: Skip user

8. **Fetch Elder for User** (Supabase Node)

9. **Fetch Weekly Data** (Supabase Node)
   - Query last 7 days of `post_call_reports` and aggregate

10. **Check If Call Was Made** (IF Node)
    - Condition: `{{ $("Fetch Preferences").item.json.only_if_call === false OR call_count > 0 }}`

11. **Prepare Email Data** (Set Node)
    - Aggregate: total calls, successful calls, average mood, escalations, etc.

12. **Send Email** (Email Send Node)
    - Subject: `Your EVA Weekly Summary - {{ week range }}`

13. **Log Notification** (Supabase Node)
    - Insert with `period_start` and `period_end` for the week

**Email Template**:
```html
<html>
<body>
  <h2>Your EVA Weekly Summary</h2>
  <p><strong>Week of:</strong> {{ weekStart }} - {{ weekEnd }}</p>
  <h3>Call Statistics</h3>
  <ul>
    <li><strong>Total Calls:</strong> {{ total_calls }}</li>
    <li><strong>Successful:</strong> {{ successful_calls }}</li>
    <li><strong>Missed:</strong> {{ missed_calls }}</li>
    <li><strong>Average Duration:</strong> {{ avg_duration }} minutes</li>
  </ul>
  <h3>Mood Trends</h3>
  <p><strong>Average Mood:</strong> {{ avg_mood }}</p>
  {{#if mood_trend}}
  <p><strong>Trend:</strong> {{ mood_trend }}</p>
  {{/if}}
  {{#if escalations}}
  <p style="color: red;"><strong>⚠️ Escalations This Week:</strong> {{ escalations }}</p>
  {{/if}}
  <h3>Highlights</h3>
  <ul>
    {{#each highlights}}
    <li>{{ this }}</li>
    {{/each}}
  </ul>
  <p><a href="https://app.eva-cares.com/app/home">View Dashboard</a></p>
  <hr>
  <p style="font-size: 12px; color: #666;">
    <a href="https://app.eva-cares.com/app/settings">Manage email preferences</a>
  </p>
</body>
</html>
```

## Notes

- All workflows should handle errors gracefully and log failures
- Consider adding retry logic for failed email sends
- Monitor `notification_sends` table for delivery tracking
- Update email templates to match your brand
- Test timezone conversions carefully
- Consider rate limiting for email sends

