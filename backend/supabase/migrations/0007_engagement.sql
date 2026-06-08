-- =============================================================================
-- 0007_engagement.sql
-- Public-submitted records: join requests and contact messages.
-- Depends on: 0002 (tiers).
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- join_requests (membership applications from the public site)
-- -----------------------------------------------------------------------------
create table if not exists join_requests (
  id               text primary key default gen_random_uuid()::text,
  full_name        text not null,
  phone            text not null,
  tier_id          text references tiers(id) on delete set null,
  city             text,
  message          text,
  status           join_request_status not null default 'pending',
  rejection_reason text,
  reviewed_by      text,
  reviewed_at      timestamptz,
  created_user_id  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists join_requests_created_at_idx on join_requests (created_at desc);
create index if not exists join_requests_status_idx     on join_requests (status);

drop trigger if exists trg_join_requests_updated_at on join_requests;
create trigger trg_join_requests_updated_at before update on join_requests
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- messages (contact-form submissions)
-- -----------------------------------------------------------------------------
create table if not exists messages (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text,
  phone      text,
  body       text not null,
  read       boolean not null default false,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_created_at_idx on messages (created_at desc);
create index if not exists messages_read_idx       on messages (read);
