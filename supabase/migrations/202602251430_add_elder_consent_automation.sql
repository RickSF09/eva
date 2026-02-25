ALTER TABLE public.elders
ADD COLUMN IF NOT EXISTS consent_pathway TEXT NOT NULL DEFAULT 'direct_consent',
ADD COLUMN IF NOT EXISTS consent_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS consent_method TEXT,
ADD COLUMN IF NOT EXISTS consent_obtained_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_decision_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_recording_storage_path TEXT,
ADD COLUMN IF NOT EXISTS consent_recording_external_url TEXT,
ADD COLUMN IF NOT EXISTS consent_recorded_by TEXT,
ADD COLUMN IF NOT EXISTS consent_notes TEXT,
ADD COLUMN IF NOT EXISTS self_consent_capable_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS self_consent_capable_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.elders
DROP CONSTRAINT IF EXISTS elders_consent_pathway_check;

ALTER TABLE public.elders
ADD CONSTRAINT elders_consent_pathway_check
CHECK (consent_pathway IN ('direct_consent'));

ALTER TABLE public.elders
DROP CONSTRAINT IF EXISTS elders_consent_status_check;

ALTER TABLE public.elders
ADD CONSTRAINT elders_consent_status_check
CHECK (consent_status IN ('pending', 'granted', 'refused'));

CREATE INDEX IF NOT EXISTS elders_consent_status_idx
ON public.elders (consent_status);

-- Computes the next scheduled timestamp from a JSON schedule payload.
-- This mirrors the client behavior conceptually (next matching day/time after "now")
-- using the database session timezone.
CREATE OR REPLACE FUNCTION public.next_scheduled_time_from_json_schedule(
  p_days_of_week JSONB,
  p_call_times JSONB,
  p_from_ts TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
AS $$
WITH raw_days AS (
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
  SELECT ((p_from_ts AT TIME ZONE current_setting('TIMEZONE'))::DATE + g.day_offset) AS local_date
  FROM generate_series(0, 7) AS g(day_offset)
),
candidate_timestamps AS (
  SELECT ((d.local_date + t.call_time) AT TIME ZONE current_setting('TIMEZONE')) AS scheduled_for
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
      public.next_scheduled_time_from_json_schedule(
        cs.days_of_week::jsonb,
        cs.call_times::jsonb,
        p_from_ts
      ) AS scheduled_for
    FROM public.elder_call_schedules ecs
    JOIN public.call_schedules cs
      ON cs.id = ecs.schedule_id
    JOIN public.elders e
      ON e.id = ecs.elder_id
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

CREATE OR REPLACE FUNCTION public.guard_scheduled_calls_require_consent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_consent_status TEXT;
BEGIN
  IF NEW.call_type IS DISTINCT FROM 'scheduled' THEN
    RETURN NEW;
  END IF;

  SELECT e.consent_status
  INTO v_consent_status
  FROM public.elders e
  WHERE e.id = NEW.elder_id;

  IF COALESCE(v_consent_status, 'pending') <> 'granted' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Cannot create a scheduled call before elder consent is granted',
      DETAIL = format(
        'elder_id=%s, consent_status=%s',
        NEW.elder_id,
        COALESCE(v_consent_status, 'null')
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_call_executions_require_granted_consent
ON public.call_executions;

CREATE TRIGGER trg_call_executions_require_granted_consent
BEFORE INSERT OR UPDATE OF elder_id, call_type
ON public.call_executions
FOR EACH ROW
EXECUTE FUNCTION public.guard_scheduled_calls_require_consent();

CREATE OR REPLACE FUNCTION public.handle_elder_consent_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.consent_status = 'granted' THEN
      PERFORM public.seed_pending_scheduled_calls_for_elder(NEW.id, now());
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.consent_status IS DISTINCT FROM OLD.consent_status THEN
      IF NEW.consent_status = 'granted' THEN
        PERFORM public.seed_pending_scheduled_calls_for_elder(NEW.id, now());
      ELSIF COALESCE(NEW.consent_status, 'pending') <> 'granted' THEN
        DELETE FROM public.call_executions ce
        WHERE ce.elder_id = NEW.id
          AND ce.call_type = 'scheduled'
          AND ce.status = 'pending';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_elders_consent_status_sync_calls
ON public.elders;

CREATE TRIGGER trg_elders_consent_status_sync_calls
AFTER INSERT OR UPDATE OF consent_status
ON public.elders
FOR EACH ROW
EXECUTE FUNCTION public.handle_elder_consent_status_change();
