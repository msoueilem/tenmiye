-- =============================================================================
-- 0002_reference.sql
-- Reference / lookup tables with no dependencies: roles, tiers, uploads, settings.
-- Idempotent.
-- =============================================================================

-- Text primary keys (gen_random_uuid()::text) preserve existing Firestore
-- document IDs verbatim during data import, and accept Firebase Auth UIDs.

-- -----------------------------------------------------------------------------
-- roles
-- -----------------------------------------------------------------------------
create table if not exists roles (
  id               text primary key default gen_random_uuid()::text,
  name             text not null,
  slug             text not null,
  description      text,
  responsibilities text[]      not null default '{}',
  permissions      text[]      not null default '{}',
  is_active        boolean     not null default true,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists roles_slug_key on roles (slug);

drop trigger if exists trg_roles_updated_at on roles;
create trigger trg_roles_updated_at before update on roles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- tiers (membership tiers / contribution levels)
-- -----------------------------------------------------------------------------
create table if not exists tiers (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  slug           text not null,
  description    text,
  monthly_amount numeric(14,2) not null,
  is_active      boolean     not null default true,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists tiers_slug_key on tiers (slug);

drop trigger if exists trg_tiers_updated_at on tiers;
create trigger trg_tiers_updated_at before update on tiers
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- uploads (file metadata; binaries live in object storage)
-- -----------------------------------------------------------------------------
create table if not exists uploads (
  id                 text primary key default gen_random_uuid()::text,
  original_name      text,
  mime_type          text,
  extension          text,
  size_bytes         bigint,
  storage_path       text,
  download_url       text,
  url_expires_at     timestamptz,
  storage_deleted    boolean not null default false,
  storage_deleted_at timestamptz,
  owner_type         upload_owner_type,
  owner_id           text,
  purpose            text,
  status             upload_status not null default 'active',
  validation_status  upload_validation_status not null default 'passed',
  validation_errors  text[],
  uploaded_by        text,
  uploaded_at        timestamptz not null default now(),
  deleted            boolean not null default false,
  deleted_at         timestamptz,
  deleted_by         text,
  deletion_reason    text,
  deletion_note      text,
  replaced_by        text,
  replaced_at        timestamptz,
  dimensions         jsonb,
  thumbnail_path     text,
  thumbnail_url      text,
  reference_count    integer not null default 0,
  history            jsonb   not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         text
);
-- Mirrors the Firestore (deleted, createdAt desc) composite index.
create index if not exists uploads_deleted_created_at_idx on uploads (deleted, created_at desc);

drop trigger if exists trg_uploads_updated_at on uploads;
create trigger trg_uploads_updated_at before update on uploads
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- settings (singleton CMS document — always id = 'public')
-- -----------------------------------------------------------------------------
create table if not exists settings (
  id                    text primary key default 'public',
  title                 text,
  logo_url              text,
  favicon_url           text,
  about_text            text,
  members_count         integer,
  projects_count        integer,
  active_projects_count integer,
  contact               jsonb,
  initiatives           jsonb  not null default '[]'::jsonb,
  achievements          text[] not null default '{}',
  team_hierarchy        jsonb,
  current_aspect        jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint settings_singleton check (id = 'public')
);

drop trigger if exists trg_settings_updated_at on settings;
create trigger trg_settings_updated_at before update on settings
  for each row execute function set_updated_at();

-- The app's settings endpoints assume the singleton row exists; create an empty
-- one so reads/updates work immediately. Content is managed via the dashboard.
insert into settings (id) values ('public') on conflict (id) do nothing;
