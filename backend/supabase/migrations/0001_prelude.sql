-- =============================================================================
-- 0001_prelude.sql
-- Extensions, enum types, and shared trigger functions.
-- Run this FIRST. Idempotent — safe to re-run.
-- =============================================================================

-- gen_random_uuid() (core since PG13, but pgcrypto guarantees availability)
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enum types (guarded so re-running does not error)
-- -----------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_status') then
    create type user_status as enum ('active', 'inactive', 'pending', 'blocked');
  end if;

  if not exists (select 1 from pg_type where typname = 'admin_status') then
    create type admin_status as enum ('active', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'election_type') then
    create type election_type as enum ('yes_no', 'multiple_choice', 'board');
  end if;

  if not exists (select 1 from pg_type where typname = 'election_status') then
    create type election_status as enum ('draft', 'nomination', 'dismissal', 'voting', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'nominee_status') then
    create type nominee_status as enum ('pending', 'confirmed', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_channel_type') then
    create type payment_channel_type as enum ('mobile', 'cash');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('contribution', 'donation', 'expense');
  end if;

  if not exists (select 1 from pg_type where typname = 'blog_status') then
    create type blog_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'announcement_type') then
    create type announcement_type as enum ('info', 'warning', 'event');
  end if;

  if not exists (select 1 from pg_type where typname = 'board_status') then
    create type board_status as enum ('upcoming', 'active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'join_request_status') then
    create type join_request_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'upload_status') then
    create type upload_status as enum ('active', 'deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'upload_owner_type') then
    create type upload_owner_type as enum ('user', 'admin', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'upload_validation_status') then
    create type upload_validation_status as enum ('passed', 'failed');
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Shared trigger functions
-- -----------------------------------------------------------------------------

-- Keeps updated_at fresh on every UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Blocks UPDATE/DELETE on append-only tables (e.g. votes) even for the
-- service_role, enforcing immutability at the database level.
create or replace function block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Table % is append-only — % is not permitted', tg_table_name, tg_op;
end;
$$;
