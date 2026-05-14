-- =====================================================================
-- SkateHubba: Avatar Closet — constraint hardening
-- Migration: 0005_constraint_hardening.sql
--
-- Tightens five constraint surfaces that 0001–0004 left soft:
--   1. `bytea` columns carrying SHA-256 digests or 32-byte seeds were
--      declared `bytea not null` with no length check. A 31-byte or
--      33-byte value would slip past the type system. Five explicit
--      named CHECK constraints now pin every such column at
--      octet_length = 32 (server_seed is nullable pre-reveal, so its
--      check is gated on `IS NOT NULL`).
--   2. `closet_reactions` had no per-target idempotency. A visitor could
--      hammer the same (closet_user_id, kind) row arbitrary times in a
--      UTC day, polluting the closet_reactions_closet_idx feed and
--      defeating any future reward-cap logic. A partial unique index on
--      `(visitor_id, closet_user_id, kind, ((created_at AT TIME ZONE
--      'UTC')::date))` enforces one row per (visitor, target, kind, day).
--      Note: this is DB-level per-target idempotency, NOT the per-user
--      50 HC/day reaction-reward saturation cap from docs/economy.md.
--      The cap is enforced at Edge Function time; this index is the
--      structural floor underneath it. The future reaction Edge Function
--      MUST catch SQLSTATE 23505 (unique_violation) on insert and surface
--      a friendly "you already reacted today" message rather than 500.
--   3. `users.username` was declared `text` with a permissive
--      `^[a-zA-Z0-9_]{3,24}$` regex. That allowed `Foo` and `foo` to
--      coexist as distinct rows (Postgres `text` is case-sensitive on
--      UNIQUE). Retyping to `citext` makes the UNIQUE casefold-aware;
--      a tightened lowercase-only regex CHECK and a belt-and-suspenders
--      `lower(...) = ...` CHECK pin the stored literal to lowercase so
--      every read of `username` from a typed client gets a single
--      canonical form. Pre-launch, zero rows — no backfill needed.
--   4. (Section 5, chief override) `users.username_changed_at` column
--      added for Workstream D username-change cooldown enforcement.
--      NULL on signup; set to now() the first time a user changes their
--      handle. Workstream D enforces the 30-day cooldown.
-- =====================================================================

-- =====================================================================
-- SECTION 1 — extensions
-- citext (case-insensitive text) is required for the users.username
-- retype below. Idempotent: safe across replays.
-- =====================================================================
create extension if not exists "citext";

-- =====================================================================
-- SECTION 2 — bytea length CHECKs (SHA-256 / 32-byte seeds)
-- All five columns are bytea-typed across 0001 and 0002. We assert
-- octet_length = 32 with explicit constraint names so a Reviewer can
-- grep them. server_seed is nullable until reveal (0002 immutability
-- guard handles the NULL→value transition), so its check is gated on
-- IS NOT NULL — null is legal, length-31 is not.
-- =====================================================================
alter table inventory
  add constraint inventory_unique_token_len
  check (octet_length(unique_token) = 32);

alter table box_opens
  add constraint box_opens_server_seed_hash_len
  check (octet_length(server_seed_hash) = 32);

alter table box_opens
  add constraint box_opens_server_seed_len
  check (server_seed is null or octet_length(server_seed) = 32);

alter table box_opens
  add constraint box_opens_client_seed_len
  check (octet_length(client_seed) = 32);

alter table box_open_commits
  add constraint box_open_commits_server_seed_hash_len
  check (octet_length(server_seed_hash) = 32);

-- =====================================================================
-- SECTION 3 — closet_reactions per-UTC-day uniqueness
-- Expression-indexed UNIQUE on (visitor_id, closet_user_id, kind,
-- (created_at AT TIME ZONE 'UTC')::date). Bucketing in UTC (not the
-- server's local tz) guarantees the same calendar day for every viewer.
--
-- This DB constraint is structural per-target idempotency: one
-- (visitor, target, kind) row per UTC day. The 50 HC/day reaction
-- reward cap from docs/economy.md is enforced at Edge Function time
-- and is a per-user-per-day saturation, not per-target. The two limits
-- compose; neither replaces the other.
--
-- The future reaction Edge Function MUST catch SQLSTATE 23505
-- (unique_violation) on insert here and surface a friendly
-- "you already reacted today" message rather than bubbling a 500.
-- =====================================================================
create unique index closet_reactions_one_per_visitor_target_kind_per_day
  on closet_reactions (
    visitor_id,
    closet_user_id,
    kind,
    ((created_at at time zone 'UTC')::date)
  );

-- =====================================================================
-- SECTION 4 — users.username citext + tightened regex + lowercase pin
-- Three changes, in order:
--   (a) drop the autogen CHECK from 0001 (`users_username_check`,
--       generated by Postgres from the inline `check (...)` in the
--       CREATE TABLE). We name it explicitly here, NOT IF EXISTS, so
--       a name drift fails loud rather than silently leaving the old
--       permissive regex in place.
--   (b) retype `username` to citext. The UNIQUE index is rebuilt
--       atomically; pre-launch this is zero rows and effectively free.
--       citext gives us casefold-aware UNIQUE without changing the
--       column's read shape (still serializes as text).
--   (c) re-add the regex CHECK, tightened to lowercase-only
--       `^[a-z0-9_]{3,24}$`. Add a belt-and-suspenders
--       `username::text = lower(username::text)` CHECK so the stored
--       literal is also lowercase — citext makes comparison
--       case-insensitive, but does not by itself force the on-disk
--       form. Defense-in-depth on the auth-shaped surface per
--       CLAUDE.md quality rule #2.
-- =====================================================================
alter table users
  drop constraint users_username_check;

alter table users
  alter column username type citext using username::citext;

alter table users
  add constraint users_username_format
  check (username ~ '^[a-z0-9_]{3,24}$');

alter table users
  add constraint users_username_is_lowercase
  check (username::text = lower(username::text));

-- =====================================================================
-- SECTION 5 — users.username_changed_at (chief override)
-- Added in parallel with Workstream D auth-UX work. NULL until the
-- user changes their handle for the first time; then the timestamp of
-- that change. Workstream D enforces a 30-day cooldown by comparing
-- now() - username_changed_at against interval '30 days'.
--
-- handle_new_user (0002_audit_fixes.sql) does NOT set this column —
-- fresh signups land with username_changed_at = NULL, which Workstream
-- D treats as "no prior change, change is allowed now". This is the
-- correct shape: only an actual user-initiated rename should arm the
-- cooldown.
-- =====================================================================
alter table users
  add column username_changed_at timestamptz;

comment on column users.username_changed_at is
  'NULL until the user changes their handle for the first time, then the timestamp of that change. Workstream D auth-UX enforces a 30-day cooldown by comparing now() - username_changed_at > interval ''30 days''. handle_new_user does NOT set this — the column is null for fresh signups.';
