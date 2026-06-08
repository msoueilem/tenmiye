-- =============================================================================
-- 0008_rls.sql
-- Row Level Security: enable on every table, then grant the minimal public
-- (anon / authenticated) access. Everything else is reachable only through the
-- backend's service_role key, which bypasses RLS — mirroring the current
-- "all writes go through the backend Admin SDK" model.
-- Run this LAST. Idempotent (policies are dropped-then-created).
-- =============================================================================

-- On Supabase these roles already exist; the guard makes the script portable
-- (and self-validating on a plain Postgres) without overriding Supabase's setup.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere. With RLS on and no permissive policy, anon/authenticated
-- get NO access; service_role still has full access.
-- -----------------------------------------------------------------------------
alter table roles                enable row level security;
alter table tiers                enable row level security;
alter table uploads              enable row level security;
alter table settings             enable row level security;
alter table users                enable row level security;
alter table public_members       enable row level security;
alter table admin_accounts       enable row level security;
alter table refresh_tokens       enable row level security;
alter table elections            enable row level security;
alter table election_nominations enable row level security;
alter table votes                enable row level security;
alter table boards               enable row level security;
alter table blogs                enable row level security;
alter table announcements        enable row level security;
alter table payment_channels     enable row level security;
alter table transactions         enable row level security;
alter table join_requests        enable row level security;
alter table messages             enable row level security;

-- -----------------------------------------------------------------------------
-- Public READ policies (anon + authenticated) — mirror firestore.rules
-- `allow read: if true`. Drafts/inactive rows are hidden even though the
-- backend (service_role) can still see everything.
-- -----------------------------------------------------------------------------
drop policy if exists public_members_read on public_members;
create policy public_members_read on public_members
  for select to anon, authenticated using (true);

drop policy if exists tiers_read on tiers;
create policy tiers_read on tiers
  for select to anon, authenticated using (true);

drop policy if exists settings_read on settings;
create policy settings_read on settings
  for select to anon, authenticated using (true);

drop policy if exists uploads_read on uploads;
create policy uploads_read on uploads
  for select to anon, authenticated using (true);

drop policy if exists boards_read on boards;
create policy boards_read on boards
  for select to anon, authenticated using (true);

drop policy if exists elections_read on elections;
create policy elections_read on elections
  for select to anon, authenticated using (true);

-- Hardening over the original rules: expose only published / active content
-- to the public; the dashboard reads the rest via service_role.
drop policy if exists blogs_read_published on blogs;
create policy blogs_read_published on blogs
  for select to anon, authenticated using (status = 'published');

drop policy if exists announcements_read_active on announcements;
create policy announcements_read_active on announcements
  for select to anon, authenticated using (is_active = true);

-- -----------------------------------------------------------------------------
-- Public WRITE policies — only the two append-only public forms, matching
-- firestore.rules `allow create: if true` for join-requests and messages.
-- No SELECT/UPDATE/DELETE for the public; the dashboard manages them.
-- -----------------------------------------------------------------------------
drop policy if exists join_requests_public_insert on join_requests;
create policy join_requests_public_insert on join_requests
  for insert to anon, authenticated with check (true);

drop policy if exists messages_public_insert on messages;
create policy messages_public_insert on messages
  for insert to anon, authenticated with check (true);

-- -----------------------------------------------------------------------------
-- Intentionally NO anon/authenticated policies (backend-only via service_role):
--   users, admin_accounts, refresh_tokens, roles, election_nominations,
--   votes, payment_channels, transactions.
-- =============================================================================
