-- Async render queue in Postgres (v2.0).
-- report_jobs rows with a payload are queued async renders. Workers claim them with
-- SELECT ... FOR UPDATE SKIP LOCKED, hold a lease (locked_until) while rendering, and retry
-- transient failures. Survives restarts and works with several backend instances.
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS payload       jsonb        NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS attempts      integer      NOT NULL DEFAULT 0;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS max_attempts  integer      NOT NULL DEFAULT 3;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS locked_by     varchar(200) NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS locked_until  timestamptz  NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS available_at  timestamptz  NULL;
ALTER TABLE public.report_jobs ADD COLUMN IF NOT EXISTS webhook_url   text         NULL;

-- Workers only scan queued work: pending jobs, and processing jobs whose lease may have expired.
CREATE INDEX IF NOT EXISTS idx_report_jobs_queue_pending
    ON public.report_jobs (available_at, created_datetime)
    WHERE status = 'pending' AND payload IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_jobs_queue_leased
    ON public.report_jobs (locked_until)
    WHERE status = 'processing' AND payload IS NOT NULL;

COMMENT ON COLUMN public.report_jobs.payload      IS 'Async render request (render command JSON); cleared when the job finishes';
COMMENT ON COLUMN public.report_jobs.attempts     IS 'Times a worker has claimed this async job';
COMMENT ON COLUMN public.report_jobs.max_attempts IS 'Claims allowed before the job is marked failed';
COMMENT ON COLUMN public.report_jobs.locked_by    IS 'Worker currently holding the job (host:pid:worker)';
COMMENT ON COLUMN public.report_jobs.locked_until IS 'Lease end; an expired lease lets another worker reclaim the job';
COMMENT ON COLUMN public.report_jobs.available_at IS 'Earliest time a pending job may be claimed (retry backoff)';
COMMENT ON COLUMN public.report_jobs.webhook_url  IS 'Optional URL notified when the async job finishes';
