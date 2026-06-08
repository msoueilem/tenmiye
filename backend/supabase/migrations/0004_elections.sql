-- =============================================================================
-- 0004_elections.sql
-- Elections, nominations, and (immutable) votes.
-- Depends on: 0003 (users).
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- elections
--   options / board_config / nominees / rounds / results are stored as JSONB,
--   matching the nested-object shapes written by the backend.
-- -----------------------------------------------------------------------------
create table if not exists elections (
  id                  text primary key default gen_random_uuid()::text,
  title               text not null,
  description         text,
  type                election_type   not null,
  status              election_status not null default 'draft',
  options             jsonb not null default '[]'::jsonb,   -- [{id,label}] for yes_no / multiple_choice
  board_config        jsonb,                                -- {seatsCount,targetNominees,shortlistCount,dismissalWindowHours}
  nominees            jsonb,                                -- [{userId,status,addedInRound,dismissedAt,dismissedInRound}]
  rounds              jsonb,                                -- [{roundNumber,nominationStart,...,status}]
  current_round       integer,
  results             jsonb,                                -- {rankings,winners,shortlist,finalizedAt,finalizedBy}
  start_time          timestamptz,
  end_time            timestamptz,
  nomination_start    timestamptz,
  nomination_end      timestamptz,
  dismissal_start     timestamptz,
  dismissal_end       timestamptz,
  voting_start        timestamptz,
  voting_end          timestamptz,
  cancellation_reason text,
  created_by          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists elections_status_idx     on elections (status);
create index if not exists elections_created_at_idx on elections (created_at desc);

drop trigger if exists trg_elections_updated_at on elections;
create trigger trg_elections_updated_at before update on elections
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- election_nominations (was the elections/{id}/nominations/{userId} subcollection)
--   One row per (election, nominator); replaced each round. nominees = uid list.
-- -----------------------------------------------------------------------------
create table if not exists election_nominations (
  election_id       text not null references elections(id) on delete cascade,
  nominator_user_id text not null references users(id) on delete cascade,
  nominees          text[] not null default '{}',
  round             integer not null,
  submitted_at      timestamptz not null default now(),
  primary key (election_id, nominator_user_id)
);
create index if not exists election_nominations_election_idx on election_nominations (election_id);

-- -----------------------------------------------------------------------------
-- votes (immutable; one vote per user per election)
--   Composite PK replaces the Firestore `${electionId}_${userId}` doc-ID key.
--   ON DELETE RESTRICT preserves election integrity (a cast vote blocks hard
--   deletion of its user/election — intentional).
-- -----------------------------------------------------------------------------
create table if not exists votes (
  election_id   text not null references elections(id) on delete restrict,
  user_id       text not null references users(id)     on delete restrict,
  election_type election_type not null,
  choices       text[] not null,
  cast_at       timestamptz not null default now(),
  primary key (election_id, user_id)
);

-- Enforce append-only: no UPDATE, no DELETE (service_role included).
drop trigger if exists trg_votes_no_update on votes;
create trigger trg_votes_no_update before update on votes
  for each row execute function block_mutation();

drop trigger if exists trg_votes_no_delete on votes;
create trigger trg_votes_no_delete before delete on votes
  for each row execute function block_mutation();
