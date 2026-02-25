-- Consent-only Slack notifications for B2C elders (org_id IS NULL).
-- Uses pg_net to post to Slack.
-- NOTE: This version reads the Slack webhook/internal URL from Postgres settings
-- because the `vault` extension is not available in this Supabase project.
--
-- Configure in Supabase SQL editor (once):
--   ALTER DATABASE postgres SET app.consent_ops_slack_webhook_url = 'https://hooks.slack.com/services/...';
--   ALTER DATABASE postgres SET app.consent_ops_internal_url = 'https://app.evacares.co.uk/internal';

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.send_consent_ops_slack_notification(
  p_event TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook_url TEXT;
  v_internal_url TEXT;
  v_text TEXT;
BEGIN
  v_webhook_url := current_setting('app.consent_ops_slack_webhook_url', true);
  v_internal_url := current_setting('app.consent_ops_internal_url', true);

  v_text := CASE p_event
    WHEN 'pending' THEN
      format(':telephone_receiver: Consent queue update: a new consent call needs review. Open internal ops: %s', v_internal_url)
    WHEN 'granted' THEN
      format(':white_check_mark: Consent queue update: consent granted. Review internal ops: %s', v_internal_url)
    WHEN 'refused' THEN
      format(':no_entry_sign: Consent queue update: consent refused. Review internal ops: %s', v_internal_url)
    ELSE
      format(':information_source: Consent queue update (%s). Open internal ops: %s', p_event, v_internal_url)
  END;

  PERFORM net.http_post(
    url := v_webhook_url,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'text', v_text,
      'unfurl_links', false,
      'unfurl_media', false
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Never block elder writes / consent updates if Slack is down or misconfigured.
    RAISE WARNING 'Consent Slack notification failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_consent_ops_on_elder_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Consent ops Slack notifications are for B2C flow only.
  IF NEW.org_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.consent_status, 'pending') = 'pending' THEN
      PERFORM public.send_consent_ops_slack_notification('pending');
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.consent_status IS DISTINCT FROM OLD.consent_status THEN
      IF NEW.consent_status IN ('pending', 'granted', 'refused') THEN
        PERFORM public.send_consent_ops_slack_notification(NEW.consent_status);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_elders_consent_ops_slack_notify
ON public.elders;

CREATE TRIGGER trg_elders_consent_ops_slack_notify
AFTER INSERT OR UPDATE OF consent_status
ON public.elders
FOR EACH ROW
EXECUTE FUNCTION public.notify_consent_ops_on_elder_changes();
