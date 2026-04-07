--------------------------------------------------------------
-- OSS Core Schema
-- Creates all tables required for the open-source self-hosted deployment.
-- SaaS billing tables (plans, subscriptions, payments, credit) are in database/saas/.
--------------------------------------------------------------

--------------------------------------------------------------
-- Drop existing tables in dependency order
--------------------------------------------------------------
DROP TABLE IF EXISTS public.project_invitations CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.font_ownerships CASCADE;
DROP TABLE IF EXISTS public.fonts CASCADE;
DROP TABLE IF EXISTS public.report_jobs CASCADE;
DROP TABLE IF EXISTS public.template_versions CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.refresh_tokens CASCADE;
DROP TABLE IF EXISTS public.otp_verifications CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TABLE IF EXISTS public.analytics_daily_stats CASCADE;
DROP TABLE IF EXISTS public.analytics_hourly_stats CASCADE;
DROP TABLE IF EXISTS public.analytics_template_stats CASCADE;

--------------------------------------------------------------
-- Table: users
--------------------------------------------------------------
CREATE TABLE public.users (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    email               varchar(255)    NOT NULL,
    password_hash       varchar(255)    NULL,
    first_name          varchar(100)    NULL,
    last_name           varchar(100)    NULL,
    phone_number        varchar(20)     NULL,
    profile_image_url   varchar(500)    NULL,
    google_id           varchar(100)    NULL,
    github_id           varchar(100)    NULL,
    gitlab_id           varchar(100)    NULL,
    credit_balance      int4            DEFAULT 0 NOT NULL,     -- Always 0 in self-hosted; updated by trigger in SaaS
    status              varchar(20)     DEFAULT 'active'
                            CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT users_pkey       PRIMARY KEY (id),
    CONSTRAINT users_email_key  UNIQUE (email)
);

COMMENT ON TABLE  public.users                  IS 'Stores user accounts and authentication data.';
COMMENT ON COLUMN public.users.credit_balance   IS 'Remaining credit balance. Always 0 in self-hosted deployments; updated by billing trigger in SaaS.';
COMMENT ON COLUMN public.users.status           IS 'Account status: active, inactive, suspended, pending_verification.';

CREATE INDEX idx_users_google_id ON public.users(google_id);
CREATE INDEX idx_users_github_id ON public.users(github_id);
CREATE INDEX idx_users_gitlab_id ON public.users(gitlab_id);

--------------------------------------------------------------
-- Table: refresh_tokens
--------------------------------------------------------------
CREATE TABLE public.refresh_tokens (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    user_id             uuid            NOT NULL,
    token               varchar(500)    NOT NULL,
    expires_at          timestamptz     NOT NULL,
    revoked_at          timestamptz     NULL,
    created_ip          varchar(50)     NULL,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    CONSTRAINT refresh_tokens_pkey      PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token   ON public.refresh_tokens(token);

--------------------------------------------------------------
-- Table: otp_verifications
--------------------------------------------------------------
CREATE TABLE public.otp_verifications (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    email               varchar(255)    NOT NULL,
    otp_code            varchar(10)     NOT NULL,
    ref_code            varchar(20)     NOT NULL,
    type                varchar(50)     NOT NULL CHECK (type IN ('REGISTER', 'FORGOT_PASSWORD')),
    expires_at          timestamptz     NOT NULL,
    is_verified         bool            DEFAULT false,
    verified_at         timestamptz     NULL,
    verification_token  varchar(500)    NULL,
    is_consumed         bool            DEFAULT false,
    created_datetime    timestamptz     DEFAULT now(),
    CONSTRAINT otp_verifications_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_otp_email    ON public.otp_verifications(email);
CREATE INDEX idx_otp_ref_code ON public.otp_verifications(ref_code);

--------------------------------------------------------------
-- Table: projects
--------------------------------------------------------------
CREATE TABLE public.projects (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    user_id             uuid            NOT NULL,
    name                varchar(200)    NOT NULL,
    description         text            NULL,
    status              varchar(20)     DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT projects_pkey        PRIMARY KEY (id),
    CONSTRAINT projects_user_fkey   FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE  public.projects           IS 'Groups templates and API keys under a named project.';
COMMENT ON COLUMN public.projects.user_id   IS 'User who owns this project.';

CREATE INDEX idx_projects_user_id ON public.projects(user_id);

--------------------------------------------------------------
-- Table: project_members
-- Multi-user project support with role-based access control.
--
-- Role hierarchy (highest → lowest):
--   owner  → creates the project, manages all members, can delete the project
--   admin  → manages members (except removing owners), manages fonts and templates
--   editor → creates/edits templates, uploads fonts, renders reports
--------------------------------------------------------------
CREATE TABLE public.project_members (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    project_id          uuid            NOT NULL,
    user_id             uuid            NOT NULL,
    role                varchar(20)     NOT NULL DEFAULT 'editor'
                            CHECK (role IN ('owner', 'admin', 'editor')),
    invited_by_user_id  uuid            NULL,           -- NULL = original owner (created the project)
    joined_at           timestamptz     NULL,           -- NULL = original owner (no confirmation required)
    is_active           bool            NOT NULL DEFAULT true,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     NOT NULL DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT project_members_pkey             PRIMARY KEY (id),
    CONSTRAINT project_members_fk_project       FOREIGN KEY (project_id)            REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT project_members_fk_user          FOREIGN KEY (user_id)               REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT project_members_fk_invited_by    FOREIGN KEY (invited_by_user_id)    REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT project_members_uq               UNIQUE (project_id, user_id)
);

COMMENT ON TABLE  public.project_members        IS 'Project membership with role-based access control.';
COMMENT ON COLUMN public.project_members.role   IS 'Role: owner = project creator, admin = manager, editor = contributor.';

CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id    ON public.project_members(user_id);
CREATE INDEX idx_project_members_role       ON public.project_members(project_id, role);

--------------------------------------------------------------
-- Table: project_invitations
-- Email invitations for joining a project.
-- Supports inviting users who do not yet have an account.
--------------------------------------------------------------
CREATE TABLE public.project_invitations (
    id                      uuid            DEFAULT gen_random_uuid() NOT NULL,
    project_id              uuid            NOT NULL,
    email                   varchar(255)    NOT NULL,
    role                    varchar(20)     NOT NULL DEFAULT 'editor'
                                CHECK (role IN ('admin', 'editor')),    -- owner cannot be invited; ownership must be transferred
    token                   varchar(500)    NOT NULL,
    invited_by_user_id      uuid            NOT NULL,
    status                  varchar(20)     NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at              timestamptz     NOT NULL,
    accepted_at             timestamptz     NULL,
    accepted_by_user_id     uuid            NULL,
    declined_at             timestamptz     NULL,
    cancelled_at            timestamptz     NULL,
    created_by              varchar(100)    NULL,
    created_datetime        timestamptz     NOT NULL DEFAULT now(),
    updated_by              varchar(100)    NULL,
    updated_datetime        timestamptz     NULL,
    CONSTRAINT project_invitations_pkey             PRIMARY KEY (id),
    CONSTRAINT project_invitations_fk_project       FOREIGN KEY (project_id)            REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT project_invitations_fk_invited_by    FOREIGN KEY (invited_by_user_id)    REFERENCES public.users(id),
    CONSTRAINT project_invitations_fk_accepted_by   FOREIGN KEY (accepted_by_user_id)   REFERENCES public.users(id),
    CONSTRAINT project_invitations_token_key        UNIQUE (token)
);

COMMENT ON TABLE  public.project_invitations IS 'Email invitations for joining a project. Supports users who do not yet have an account.';

CREATE INDEX idx_project_invitations_project_id ON public.project_invitations(project_id);
CREATE INDEX idx_project_invitations_email      ON public.project_invitations(email);
CREATE INDEX idx_project_invitations_token      ON public.project_invitations(token);
CREATE INDEX idx_project_invitations_status     ON public.project_invitations(status, expires_at);

--------------------------------------------------------------
-- Table: api_keys
--------------------------------------------------------------
CREATE TABLE public.api_keys (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    user_id             uuid            NOT NULL,
    project_id          uuid            NULL,
    x_api_key           varchar(200)    NOT NULL,
    name                varchar(200)    NULL,
    is_active           bool            DEFAULT true,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT api_keys_pkey            PRIMARY KEY (id),
    CONSTRAINT api_keys_unique_key      UNIQUE (x_api_key),
    CONSTRAINT api_keys_user_id_fkey    FOREIGN KEY (user_id)       REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT api_keys_project_id_fkey FOREIGN KEY (project_id)    REFERENCES public.projects(id) ON DELETE SET NULL
);

CREATE INDEX idx_api_keys_project_id ON public.api_keys(project_id);
CREATE INDEX idx_api_keys_user_id    ON public.api_keys(user_id);

--------------------------------------------------------------
-- Table: templates
--------------------------------------------------------------
CREATE TABLE public.templates (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    user_id             uuid            NOT NULL,
    project_id          uuid            NULL,
    template_key        varchar(100)    NOT NULL,
    name                varchar(200)    NOT NULL,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT templates_pkey               PRIMARY KEY (id),
    CONSTRAINT templates_user_id_fkey       FOREIGN KEY (user_id)       REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT templates_project_id_fkey    FOREIGN KEY (project_id)    REFERENCES public.projects(id) ON DELETE SET NULL,
    CONSTRAINT templates_project_key_unique UNIQUE (project_id, template_key)
);

COMMENT ON COLUMN public.templates.template_key IS 'User-defined key for accessing this template via the API.';

CREATE INDEX idx_templates_user_id    ON public.templates(user_id);
CREATE INDEX idx_templates_project_id ON public.templates(project_id);

--------------------------------------------------------------
-- Table: template_versions
--------------------------------------------------------------
CREATE TABLE public.template_versions (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    template_id         uuid            NOT NULL,
    version             int4            NOT NULL DEFAULT 1,
    file_path           text            NOT NULL,
    status              varchar(20)     DEFAULT 'active',
    preview_file_path   text            NULL,
    sandbox_payload     json            NULL,
    sandbox_file_path   text            NULL,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT template_versions_pkey               PRIMARY KEY (id),
    CONSTRAINT template_versions_template_id_fkey   FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE
);

--------------------------------------------------------------
-- Table: report_jobs
--------------------------------------------------------------
CREATE TABLE public.report_jobs (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    user_id             uuid            NOT NULL,
    api_key_id          uuid            NULL,
    source_type         varchar(100)    NULL,
    template_version_id uuid            NULL,
    status              varchar(20)     DEFAULT 'pending',
    request_data        jsonb           NULL,
    output_file_path    text            NULL,
    error_message       text            NULL,
    started_at          timestamptz     NULL,
    finished_at         timestamptz     NULL,
    duration_ms         int8            NULL,
    file_size_bytes     int8            NULL,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT report_jobs_pkey         PRIMARY KEY (id),
    CONSTRAINT report_jobs_user_fkey    FOREIGN KEY (user_id)               REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT report_jobs_api_fkey     FOREIGN KEY (api_key_id)            REFERENCES public.api_keys(id) ON DELETE SET NULL,
    CONSTRAINT report_jobs_version_fkey FOREIGN KEY (template_version_id)   REFERENCES public.template_versions(id) ON DELETE SET NULL
);

COMMENT ON COLUMN public.report_jobs.status IS 'Job status: pending, processing, success, failed.';

CREATE INDEX idx_report_jobs_user_created           ON public.report_jobs(user_id, created_datetime DESC);
CREATE INDEX idx_report_jobs_user_status_created    ON public.report_jobs(user_id, status, created_datetime DESC);
CREATE INDEX idx_report_jobs_user_template_created  ON public.report_jobs(user_id, template_version_id, created_datetime DESC);

--------------------------------------------------------------
-- Tables: analytics summary (pre-computed for dashboard performance)
--------------------------------------------------------------
CREATE TABLE public.analytics_daily_stats (
    id                      uuid    DEFAULT gen_random_uuid() NOT NULL,
    user_id                 uuid    NOT NULL,
    project_id              uuid    NULL,
    stat_date               date    NOT NULL,
    total_count             int4    DEFAULT 0 NOT NULL,
    success_count           int4    DEFAULT 0 NOT NULL,
    failed_count            int4    DEFAULT 0 NOT NULL,
    total_duration_ms       int8    DEFAULT 0 NOT NULL,
    total_file_size_bytes   int8    DEFAULT 0 NOT NULL,
    CONSTRAINT analytics_daily_stats_pkey   PRIMARY KEY (id),
    CONSTRAINT analytics_daily_stats_unique UNIQUE (user_id, project_id, stat_date),
    CONSTRAINT analytics_daily_stats_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_daily_user_date          ON public.analytics_daily_stats(user_id, stat_date DESC);
CREATE INDEX idx_analytics_daily_user_project_date  ON public.analytics_daily_stats(user_id, project_id, stat_date DESC);

CREATE TABLE public.analytics_hourly_stats (
    id          uuid    DEFAULT gen_random_uuid() NOT NULL,
    user_id     uuid    NOT NULL,
    stat_date   date    NOT NULL,
    stat_hour   int2    NOT NULL CHECK (stat_hour >= 0 AND stat_hour <= 23),
    total_count int4    DEFAULT 0 NOT NULL,
    CONSTRAINT analytics_hourly_stats_pkey      PRIMARY KEY (id),
    CONSTRAINT analytics_hourly_stats_unique    UNIQUE (user_id, stat_date, stat_hour),
    CONSTRAINT analytics_hourly_stats_user_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_analytics_hourly_user_date ON public.analytics_hourly_stats(user_id, stat_date DESC);

CREATE TABLE public.analytics_template_stats (
    id                      uuid        DEFAULT gen_random_uuid() NOT NULL,
    user_id                 uuid        NOT NULL,
    template_version_id     uuid        NULL,
    stat_date               date        NOT NULL,
    total_count             int4        DEFAULT 0 NOT NULL,
    success_count           int4        DEFAULT 0 NOT NULL,
    failed_count            int4        DEFAULT 0 NOT NULL,
    total_duration_ms       int8        DEFAULT 0 NOT NULL,
    total_file_size_bytes   int8        DEFAULT 0 NOT NULL,
    last_generated_at       timestamptz NULL,
    CONSTRAINT analytics_template_stats_pkey        PRIMARY KEY (id),
    CONSTRAINT analytics_template_stats_unique      UNIQUE (user_id, template_version_id, stat_date),
    CONSTRAINT analytics_template_stats_user_fkey   FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT analytics_template_stats_version_fkey FOREIGN KEY (template_version_id) REFERENCES public.template_versions(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_template_user_date       ON public.analytics_template_stats(user_id, stat_date DESC);
CREATE INDEX idx_analytics_template_user_version    ON public.analytics_template_stats(user_id, template_version_id, stat_date DESC);

--------------------------------------------------------------
-- Trigger: auto-update analytics summary tables on report_job insert
--------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_analytics_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_stat_date     date;
    v_stat_hour     int2;
    v_project_id    uuid;
    v_is_success    int4;
    v_is_failed     int4;
BEGIN
    v_stat_date := COALESCE(NEW.created_datetime, now())::date;
    v_stat_hour := EXTRACT(HOUR FROM COALESCE(NEW.created_datetime, now()))::int2;

    SELECT t.project_id INTO v_project_id
    FROM public.template_versions tv
    JOIN public.templates t ON t.id = tv.template_id
    WHERE tv.id = NEW.template_version_id;

    v_is_success := CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END;
    v_is_failed  := CASE WHEN NEW.status = 'failed'  THEN 1 ELSE 0 END;

    INSERT INTO public.analytics_daily_stats (user_id, project_id, stat_date, total_count, success_count, failed_count, total_duration_ms, total_file_size_bytes)
    VALUES (NEW.user_id, v_project_id, v_stat_date, 1, v_is_success, v_is_failed, COALESCE(NEW.duration_ms, 0), COALESCE(NEW.file_size_bytes, 0))
    ON CONFLICT (user_id, project_id, stat_date)
    DO UPDATE SET
        total_count           = analytics_daily_stats.total_count + 1,
        success_count         = analytics_daily_stats.success_count + EXCLUDED.success_count,
        failed_count          = analytics_daily_stats.failed_count + EXCLUDED.failed_count,
        total_duration_ms     = analytics_daily_stats.total_duration_ms + EXCLUDED.total_duration_ms,
        total_file_size_bytes = analytics_daily_stats.total_file_size_bytes + EXCLUDED.total_file_size_bytes;

    INSERT INTO public.analytics_hourly_stats (user_id, stat_date, stat_hour, total_count)
    VALUES (NEW.user_id, v_stat_date, v_stat_hour, 1)
    ON CONFLICT (user_id, stat_date, stat_hour)
    DO UPDATE SET total_count = analytics_hourly_stats.total_count + 1;

    IF NEW.template_version_id IS NOT NULL THEN
        INSERT INTO public.analytics_template_stats (user_id, template_version_id, stat_date, total_count, success_count, failed_count, total_duration_ms, total_file_size_bytes, last_generated_at)
        VALUES (NEW.user_id, NEW.template_version_id, v_stat_date, 1, v_is_success, v_is_failed, COALESCE(NEW.duration_ms, 0), COALESCE(NEW.file_size_bytes, 0), NEW.created_datetime)
        ON CONFLICT (user_id, template_version_id, stat_date)
        DO UPDATE SET
            total_count           = analytics_template_stats.total_count + 1,
            success_count         = analytics_template_stats.success_count + EXCLUDED.success_count,
            failed_count          = analytics_template_stats.failed_count + EXCLUDED.failed_count,
            total_duration_ms     = analytics_template_stats.total_duration_ms + EXCLUDED.total_duration_ms,
            total_file_size_bytes = analytics_template_stats.total_file_size_bytes + EXCLUDED.total_file_size_bytes,
            last_generated_at     = GREATEST(analytics_template_stats.last_generated_at, EXCLUDED.last_generated_at);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_analytics_stats
AFTER INSERT ON public.report_jobs
FOR EACH ROW EXECUTE FUNCTION public.fn_update_analytics_stats();

--------------------------------------------------------------
-- Table: fonts
-- Storage backends (configured via FontStorage:Provider in appsettings.json):
--   Local  - Files in ./fonts/ (bind-mounted with Gotenberg). storage_bucket = NULL
--   MinIO  - Files in MinIO bucket. storage_bucket = "fonts"
--------------------------------------------------------------
CREATE TABLE public.fonts (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    name                varchar(255)    NOT NULL,
    family_name         varchar(255)    NOT NULL,
    sub_family_name     varchar(100)    NOT NULL DEFAULT 'Regular',
    weight              smallint        NOT NULL DEFAULT 400,
    is_italic           bool            NOT NULL DEFAULT false,
    file_format         varchar(10)     NOT NULL
                            CHECK (file_format IN ('ttf', 'otf', 'woff', 'woff2')),
    file_size_bytes     bigint          NOT NULL,
    file_hash           varchar(64)     NOT NULL,
    storage_bucket      varchar(255)    NULL,
    storage_key         varchar(500)    NOT NULL,
    preview_image_key   varchar(500)    NULL,
    sync_source         varchar(20)     NOT NULL DEFAULT 'upload'
                            CHECK (sync_source IN ('startup_scan', 'upload')),
    is_system_font      bool            NOT NULL DEFAULT false,
    is_active           bool            NOT NULL DEFAULT true,
    description         text            NULL,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     NOT NULL DEFAULT now(),
    updated_by          varchar(100)    NULL,
    updated_datetime    timestamptz     NULL,
    CONSTRAINT fonts_pkey               PRIMARY KEY (id),
    CONSTRAINT fonts_bucket_key_unique  UNIQUE (storage_bucket, storage_key)
);

COMMENT ON TABLE  public.fonts              IS 'Stores font metadata. Files are in local volume or MinIO depending on configuration.';
COMMENT ON COLUMN public.fonts.weight       IS 'Font weight: 100=Thin, 400=Regular, 700=Bold, 900=Black.';
COMMENT ON COLUMN public.fonts.is_system_font IS 'System font available to all projects without requiring ownership.';

CREATE INDEX idx_fonts_family_name  ON public.fonts(family_name);
CREATE INDEX idx_fonts_is_active    ON public.fonts(is_active);
CREATE INDEX idx_fonts_is_system    ON public.fonts(is_system_font);
CREATE INDEX idx_fonts_file_hash    ON public.fonts(file_hash);

--------------------------------------------------------------
-- Table: font_ownerships
-- Fonts are scoped to projects. All members of a project share its fonts.
--------------------------------------------------------------
CREATE TABLE public.font_ownerships (
    id                  uuid            DEFAULT gen_random_uuid() NOT NULL,
    font_id             uuid            NOT NULL,
    project_id          uuid            NOT NULL,
    uploaded_by_user_id uuid            NOT NULL,
    license_note        text            NULL,
    is_active           bool            NOT NULL DEFAULT true,
    created_by          varchar(100)    NULL,
    created_datetime    timestamptz     NOT NULL DEFAULT now(),
    CONSTRAINT font_ownerships_pkey         PRIMARY KEY (id),
    CONSTRAINT font_ownerships_fk_font      FOREIGN KEY (font_id)               REFERENCES public.fonts(id) ON DELETE CASCADE,
    CONSTRAINT font_ownerships_fk_project   FOREIGN KEY (project_id)            REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT font_ownerships_fk_user      FOREIGN KEY (uploaded_by_user_id)   REFERENCES public.users(id),
    CONSTRAINT font_ownerships_uq           UNIQUE (font_id, project_id)
);

CREATE INDEX idx_font_ownerships_font_id    ON public.font_ownerships(font_id);
CREATE INDEX idx_font_ownerships_project_id ON public.font_ownerships(project_id);

--------------------------------------------------------------
-- View: v_project_accessible_fonts
--------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_project_accessible_fonts AS
SELECT
    f.id AS font_id, f.name, f.family_name, f.sub_family_name,
    f.weight, f.is_italic, f.file_format, f.file_size_bytes,
    f.storage_bucket, f.storage_key, f.is_system_font,
    NULL::uuid AS project_id, 'system' AS access_type
FROM public.fonts f
WHERE f.is_active = true AND f.is_system_font = true

UNION ALL

SELECT
    f.id AS font_id, f.name, f.family_name, f.sub_family_name,
    f.weight, f.is_italic, f.file_format, f.file_size_bytes,
    f.storage_bucket, f.storage_key, f.is_system_font,
    fo.project_id AS project_id, 'owner' AS access_type
FROM public.fonts f
JOIN public.font_ownerships fo ON fo.font_id = f.id AND fo.is_active = true
WHERE f.is_active = true;

COMMENT ON VIEW public.v_project_accessible_fonts IS 'All fonts accessible to each project: system fonts (all projects) and owned fonts (uploaded by the project).';

--------------------------------------------------------------
-- View: v_project_member_fonts
--------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_project_member_fonts AS
SELECT paf.*, pm.user_id AS member_user_id, pm.role AS member_role
FROM public.v_project_accessible_fonts paf
JOIN public.project_members pm ON pm.project_id = paf.project_id AND pm.is_active = true
WHERE paf.project_id IS NOT NULL

UNION ALL

SELECT paf.*, pm.user_id AS member_user_id, pm.role AS member_role
FROM public.v_project_accessible_fonts paf
CROSS JOIN public.project_members pm
WHERE paf.project_id IS NULL AND paf.access_type = 'system' AND pm.is_active = true;

COMMENT ON VIEW public.v_project_member_fonts IS 'All fonts accessible to each project member: owned project fonts and system fonts.';

--------------------------------------------------------------
-- Seed: register all existing project owners in project_members
--------------------------------------------------------------
INSERT INTO public.project_members (project_id, user_id, role, joined_at, created_by)
SELECT id, user_id, 'owner', created_datetime, 'SYSTEM_INIT'
FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;
