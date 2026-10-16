-- Explicit marker for the admin account that is managed from configuration
-- (Admin__Email / Admin__Password). Previously identified only by created_by = 'SYSTEM_INIT'.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_system_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_system_admin IS 'True for the single admin account synced from Admin__Email / Admin__Password on every startup';

-- Backfill: the oldest legacy seeded admin becomes the system admin.
UPDATE public.users
SET is_system_admin = true
WHERE id = (
        SELECT id FROM public.users
        WHERE created_by = 'SYSTEM_INIT'
        ORDER BY created_datetime, id
        LIMIT 1
    )
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE is_system_admin);

-- At most one system admin.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_system_admin
    ON public.users (is_system_admin)
    WHERE is_system_admin;
