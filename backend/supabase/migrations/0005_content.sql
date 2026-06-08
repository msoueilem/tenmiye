-- =============================================================================
-- 0005_content.sql
-- Public content: boards, blogs, announcements.
-- Depends on: 0002 (uploads), 0004 (elections).
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- boards (governance boards / terms)
-- -----------------------------------------------------------------------------
create table if not exists boards (
  id                  text primary key default gen_random_uuid()::text,
  name                text not null,
  description         text,
  role_ids            text[] not null default '{}',
  logo_upload_id      text references uploads(id) on delete set null,
  logo_url            text,
  term_start_date     timestamptz,
  term_end_date       timestamptz,
  status              board_status not null default 'upcoming',
  mandates            text[] not null default '{}',
  obligations         text[] not null default '{}',
  achievements        jsonb  not null default '[]'::jsonb,   -- [{title,description?,date?}]
  election_id         text references elections(id) on delete set null,
  predecessor_board_id text references boards(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists boards_term_start_idx on boards (term_start_date desc);

drop trigger if exists trg_boards_updated_at on boards;
create trigger trg_boards_updated_at before update on boards
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- blogs
-- -----------------------------------------------------------------------------
create table if not exists blogs (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  slug            text not null,
  content         text not null,
  tags            text[] not null default '{}',
  feature_image_id text references uploads(id) on delete set null,
  status          blog_status not null default 'draft',
  published_at    timestamptz,
  author_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists blogs_slug_key   on blogs (slug);
create index        if not exists blogs_status_idx on blogs (status);

drop trigger if exists trg_blogs_updated_at on blogs;
create trigger trg_blogs_updated_at before update on blogs
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- announcements (time-boxed site banners)
-- -----------------------------------------------------------------------------
create table if not exists announcements (
  id         text primary key default gen_random_uuid()::text,
  message    text not null,
  type       announcement_type not null,
  is_active  boolean not null default true,
  start_date timestamptz,
  end_date   timestamptz,
  cta_label  text,
  cta_url    text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists announcements_active_idx on announcements (is_active);

drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at before update on announcements
  for each row execute function set_updated_at();
