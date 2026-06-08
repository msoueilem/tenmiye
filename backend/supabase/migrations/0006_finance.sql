-- =============================================================================
-- 0006_finance.sql
-- Payment channels and financial transactions.
-- Depends on: 0002 (uploads), 0003 (users).
-- Idempotent.
--
-- NOTE: transactions are mutable by design — the backend updates them on
-- verify / disable — so no append-only trigger is applied here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- payment_channels
-- -----------------------------------------------------------------------------
create table if not exists payment_channels (
  id                  text primary key default gen_random_uuid()::text,
  name                text not null,
  type                payment_channel_type not null,
  wallet_number       text,
  wallet_owner        text,
  requires_screenshot boolean not null default false,
  requires_receiver   boolean not null default false,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists payment_channels_name_key on payment_channels (name);

drop trigger if exists trg_payment_channels_updated_at on payment_channels;
create trigger trg_payment_channels_updated_at before update on payment_channels
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- transactions (contributions / donations / expenses)
--   year & month are denormalised from `date` for fast reporting filters.
-- -----------------------------------------------------------------------------
create table if not exists transactions (
  id                  text primary key default gen_random_uuid()::text,
  type                transaction_type not null,
  amount              numeric(14,2) not null,
  date                timestamptz not null,
  year                integer not null,
  month               integer not null,
  payment_channel_id  text not null references payment_channels(id) on delete restrict,
  received_by         text,
  received_by_note    text,
  screenshot_upload_id text references uploads(id) on delete set null,
  user_id             text references users(id) on delete set null,
  period              text,
  paid_to             text,
  purpose             text,
  receipt_upload_id   text references uploads(id) on delete set null,
  notes               text,
  recorded_by         text,
  verified_by         text,
  verified_at         timestamptz,
  is_active           boolean not null default true,
  disabled_by         text,
  disabled_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Reporting indexes — mirror backend/firestore.indexes.json (transactions).
create index if not exists transactions_type_date_idx              on transactions (type, date desc);
create index if not exists transactions_year_date_idx              on transactions (year, date desc);
create index if not exists transactions_month_date_idx             on transactions (month, date desc);
create index if not exists transactions_user_date_idx              on transactions (user_id, date desc);
create index if not exists transactions_type_year_date_idx         on transactions (type, year, date desc);
create index if not exists transactions_type_year_month_date_idx   on transactions (type, year, month, date desc);
create index if not exists transactions_year_month_date_idx        on transactions (year, month, date desc);

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at before update on transactions
  for each row execute function set_updated_at();
