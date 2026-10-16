-- Persisted webhook delivery for async renders (v2.0).
-- When an async job with webhook_url finishes, webhook_status becomes 'pending'. Workers claim due
-- deliveries with SELECT ... FOR UPDATE SKIP LOCKED, so retries survive restarts and work across instances.
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS webhook_status     varchar(20) NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS webhook_attempts   integer     NOT NULL DEFAULT 0;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS webhook_next_at    timestamptz NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS webhook_last_error text        NULL;

CREATE INDEX IF NOT EXISTS idx_report_jobs_webhook_due
    ON public.report_jobs (webhook_next_at)
    WHERE webhook_status = 'pending';

COMMENT ON COLUMN public.report_jobs.webhook_status     IS 'Webhook delivery: pending | sent | failed (NULL = no webhook)';
COMMENT ON COLUMN public.report_jobs.webhook_attempts   IS 'Delivery attempts made so far (max 3)';
COMMENT ON COLUMN public.report_jobs.webhook_next_at    IS 'Earliest time of the next delivery attempt (also a short claim lease)';
COMMENT ON COLUMN public.report_jobs.webhook_last_error IS 'Last delivery error (HTTP status or network error)';
