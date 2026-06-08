-- =============================================================================
-- 0003_identity.sql
-- Members, public mirror, admin accounts, refresh tokens.
-- Depends on: 0002 (roles, tiers, uploads).
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users (private member records). id holds the Firebase Auth UID on import.
-- -----------------------------------------------------------------------------
create table if not exists users (
  id                 text primary key default gen_random_uuid()::text,
  full_name          text not null,
  full_name_ar       text,
  full_name_fr       text,
  phone_number       text not null,
  whatsapp_number    text,
  national_id        text,
  city               text,
  region_id          text,                         -- region CODE (regions are an external lookup, not a table)
  join_request_id    text,
  role_id            text references roles(id) on delete set null,
  tier_id            text references tiers(id) on delete set null,
  profile_picture_id text references uploads(id) on delete set null,
  outside_platform   boolean not null default false,
  outside_whatsapp   boolean not null default false,
  is_blocked         boolean not null default false,
  status             user_status not null default 'pending',
  password_hash      text,
  approved_by        text,
  approved_at        timestamptz,
  last_login_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index if not exists users_phone_number_key    on users (phone_number);
create unique index if not exists users_whatsapp_number_key on users (whatsapp_number) where whatsapp_number is not null;
create unique index if not exists users_national_id_key     on users (national_id)     where national_id is not null;
create index        if not exists users_role_id_idx         on users (role_id);
create index        if not exists users_tier_id_idx         on users (tier_id);
create index        if not exists users_created_at_idx      on users (created_at desc);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- public_members (public-facing directory mirror; id = users.id)
-- -----------------------------------------------------------------------------
create table if not exists public_members (
  id              text primary key,
  full_name       text not null,
  full_name_ar    text,
  full_name_fr    text,
  phone_number    text,
  whatsapp_number text,
  photo_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_public_members_updated_at on public_members;
create trigger trg_public_members_updated_at before update on public_members
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- admin_accounts (Google-OAuth admins + RBAC permissions)
-- -----------------------------------------------------------------------------
create table if not exists admin_accounts (
  id           text primary key default gen_random_uuid()::text,
  google_email text not null,
  user_id      text,
  permissions  text[] not null default '{}',
  status       admin_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists admin_accounts_google_email_key on admin_accounts (google_email);

drop trigger if exists trg_admin_accounts_updated_at on admin_accounts;
create trigger trg_admin_accounts_updated_at before update on admin_accounts
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- refresh_tokens (hashed JWT refresh tokens, rotated on use)
-- -----------------------------------------------------------------------------
create table if not exists refresh_tokens (
  id         text primary key default gen_random_uuid()::text,
  user_id    text not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index if not exists refresh_tokens_token_hash_key   on refresh_tokens (token_hash);
create index        if not exists refresh_tokens_user_expires_idx on refresh_tokens (user_id, expires_at);
