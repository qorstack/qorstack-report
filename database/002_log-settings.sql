-- Add log settings to projects table
ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS log_enabled       boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS log_retention_days integer NOT NULL DEFAULT 90;

COMMENT ON COLUMN public.projects.log_enabled        IS 'Whether report job logging is enabled for this project';
COMMENT ON COLUMN public.projects.log_retention_days IS 'Number of days to retain report job logs (0 = keep forever)';
