-- Align scheduling fallback timezone with product expectation:
-- browser timezone when available, otherwise Europe/London.

CREATE OR REPLACE FUNCTION public.next_scheduled_time_from_json_schedule_with_timezone(
  p_days_of_week JSONB,
  p_call_times JSONB,
  p_from_ts TIMESTAMPTZ DEFAULT now(),
  p_timezone TEXT DEFAULT 'Europe/London'
)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
WITH resolved_timezone AS (
  SELECT COALESCE(
    (
      SELECT name
      FROM pg_timezone_names
      WHERE name = COALESCE(NULLIF(trim(p_timezone), ''), 'Europe/London')
      LIMIT 1
    ),
    'Europe/London'
  ) AS tz
),
raw_days AS (
  SELECT value AS day_text
  FROM jsonb_array_elements_text(COALESCE(p_days_of_week, '[]'::jsonb)) AS t(value)
),
valid_days AS (
  SELECT day_text::INT AS dow
  FROM raw_days
  WHERE day_text ~ '^\d+$'
    AND day_text::INT BETWEEN 0 AND 6
),
raw_times AS (
  SELECT trim(value) AS hhmm
  FROM jsonb_array_elements_text(COALESCE(p_call_times, '[]'::jsonb)) AS t(value)
),
parsed_times AS (
  SELECT
    hhmm,
    split_part(hhmm, ':', 1)::INT AS hour_part,
    split_part(hhmm, ':', 2)::INT AS minute_part
  FROM raw_times
  WHERE hhmm ~ '^\d{1,2}:\d{2}$'
),
valid_times AS (
  SELECT make_time(hour_part, minute_part, 0) AS call_time
  FROM parsed_times
  WHERE hour_part BETWEEN 0 AND 23
    AND minute_part BETWEEN 0 AND 59
),
candidate_days AS (
  SELECT ((p_from_ts AT TIME ZONE rt.tz)::DATE + g.day_offset)::DATE AS local_date, rt.tz
  FROM generate_series(0, 7) AS g(day_offset)
  CROSS JOIN resolved_timezone rt
),
candidate_timestamps AS (
  SELECT ((d.local_date + t.call_time) AT TIME ZONE d.tz) AS scheduled_for
  FROM candidate_days d
  JOIN valid_days wd
    ON EXTRACT(DOW FROM d.local_date)::INT = wd.dow
  JOIN valid_times t
    ON TRUE
)
SELECT MIN(scheduled_for)
FROM candidate_timestamps
WHERE scheduled_for > p_from_ts;
$$;

CREATE OR REPLACE FUNCTION public.seed_pending_scheduled_calls_for_elder(
  p_elder_id UUID,
  p_from_ts TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  WITH eligible_schedules AS (
    SELECT
      ecs.schedule_id,
      public.next_scheduled_time_from_json_schedule_with_timezone(
        cs.days_of_week::jsonb,
        cs.call_times::jsonb,
        p_from_ts,
        COALESCE(NULLIF(trim(to_jsonb(u)->>'timezone'), ''), 'Europe/London')
      ) AS scheduled_for
    FROM public.elder_call_schedules ecs
    JOIN public.call_schedules cs
      ON cs.id = ecs.schedule_id
    JOIN public.elders e
      ON e.id = ecs.elder_id
    LEFT JOIN public.users u
      ON u.id = e.user_id
    WHERE ecs.elder_id = p_elder_id
      AND COALESCE(ecs.active, TRUE)
      AND COALESCE(cs.active, TRUE)
      AND COALESCE(e.active, TRUE)
      AND e.consent_status = 'granted'
  ),
  inserted_rows AS (
    INSERT INTO public.call_executions (
      elder_id,
      schedule_id,
      call_type,
      status,
      scheduled_for
    )
    SELECT
      p_elder_id,
      es.schedule_id,
      'scheduled',
      'pending',
      es.scheduled_for
    FROM eligible_schedules es
    WHERE es.scheduled_for IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.call_executions ce
        WHERE ce.elder_id = p_elder_id
          AND ce.schedule_id = es.schedule_id
          AND ce.call_type = 'scheduled'
          AND ce.status = 'pending'
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count
  FROM inserted_rows;

  RETURN v_inserted_count;
END;
$$;
