-- =====================================================================
-- SkateHubba: Avatar Closet — audit fixes
-- Migration: 0002_audit_fixes.sql
--
-- Closes seven gaps in 0001_init.sql identified by the Architect audit:
--   1. Closet-visitor RLS policy on `inventory` leaked unique_token and
--      acquisition timestamps. Replaced with a column-narrowed public view.
--   2. box_opens UPDATE was unguarded; a service-role bug could rewrite a
--      committed outcome. A BEFORE UPDATE trigger pins every column except
--      the one-shot NULL→value transition on granted_inventory_id and the
--      reveal pair (server_seed, revealed_at).
--   3. Commit-reveal had no row to commit TO before the player provided
--      input. New `box_open_commits` table holds the commitment; `box_opens`
--      references it via `commit_id`.
--   4. Partial UNIQUE indexes on (inventory_a) and (inventory_b) WHERE
--      status='pending' prevent the same row entering two pending trades.
--   5. Append-only ledgers were enforced by policy only; service_role
--      bypassed RLS. Triggers now raise on UPDATE/DELETE.
--   6. New auth.users rows had no automatic `users`/`wallets`/`closets`
--      provisioning. SECURITY DEFINER trigger handles it + signup bonus.
--   7. coin_ledger.amount = 0 rows were legal; they aren't anymore.
-- =====================================================================

-- =====================================================================
-- 1. BOX_OPEN_COMMITS — pre-input commitment row
-- One row per "server has chosen server_seed and published its hash, but the
-- player has not yet posted client_seed/nonce". box_opens.commit_id points
-- back here so the audit trail is two-step.
-- =====================================================================
create table box_open_commits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete restrict,
  loot_box_id       uuid not null references loot_boxes(id) on delete restrict,
  server_seed_hash  bytea not null,
  committed_at      timestamptz not null default now()
);
create index box_open_commits_user_idx
  on box_open_commits (user_id, committed_at desc);

alter table box_open_commits enable row level security;
create policy box_open_commits_self_read on box_open_commits
  for select using (auth.uid() = user_id);

-- =====================================================================
-- 2. BOX_OPENS.COMMIT_ID — back-reference to the commitment
-- =====================================================================
alter table box_opens
  add column commit_id uuid not null references box_open_commits(id) on delete restrict;
create index box_opens_commit_idx on box_opens (commit_id);

-- =====================================================================
-- 3. COIN_LEDGER.AMOUNT must be non-zero
-- A zero-amount ledger row is meaningless and breaks the wallet-balance
-- reconciliation invariant if it slips in as a credit-shaped "no-op".
-- =====================================================================
alter table coin_ledger
  add constraint coin_ledger_amount_nonzero check (amount <> 0);

-- =====================================================================
-- 4. TRADE_LEDGER pending-uniqueness — partial UNIQUE indexes
-- A given inventory row may appear in at most one pending trade at a time.
-- Postgres does not allow partial UNIQUE as a table constraint, so we use
-- partial unique indexes instead. Users may legitimately propose multiple
-- parallel item-for-item trades, so we do NOT add (user_a, user_b).
-- =====================================================================
create unique index trade_ledger_pending_inv_a
  on trade_ledger (inventory_a) where status = 'pending';
create unique index trade_ledger_pending_inv_b
  on trade_ledger (inventory_b) where status = 'pending';

-- =====================================================================
-- 5. BOX_OPENS immutability
-- Pre-reveal (OLD.server_seed IS NULL): every commit-time field is locked;
--   the only legal change is setting server_seed + revealed_at and, at the
--   same time or later, granted_inventory_id from NULL to a value.
-- Post-reveal: every column is locked. granted_inventory_id may still
--   transition NULL→value exactly once (covers the "reveal first, then
--   mint the limited inventory row" ordering) but never value→NULL or
--   value→different-value.
-- =====================================================================
create or replace function enforce_box_opens_immutability() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id            is distinct from new.user_id            then raise exception 'box_opens.user_id is immutable'; end if;
  if old.loot_box_id        is distinct from new.loot_box_id        then raise exception 'box_opens.loot_box_id is immutable'; end if;
  if old.commit_id          is distinct from new.commit_id          then raise exception 'box_opens.commit_id is immutable'; end if;
  if old.server_seed_hash   is distinct from new.server_seed_hash   then raise exception 'box_opens.server_seed_hash is immutable'; end if;
  if old.client_seed        is distinct from new.client_seed        then raise exception 'box_opens.client_seed is immutable'; end if;
  if old.nonce              is distinct from new.nonce              then raise exception 'box_opens.nonce is immutable'; end if;
  if old.outcome_index      is distinct from new.outcome_index      then raise exception 'box_opens.outcome_index is immutable'; end if;
  if old.resulting_rarity   is distinct from new.resulting_rarity   then raise exception 'box_opens.resulting_rarity is immutable'; end if;
  if old.opened_at          is distinct from new.opened_at          then raise exception 'box_opens.opened_at is immutable'; end if;

  if old.server_seed is null then
    -- Invariant: pre-reveal rows must have revealed_at IS NULL. If somehow
    -- they don't, refuse the UPDATE rather than silently propagate a corrupt
    -- state. Defense-in-depth on the load-bearing audit row.
    if old.revealed_at is not null then
      raise exception 'box_opens: invariant violation — revealed_at set while server_seed is null (row %)', old.id;
    end if;
    -- pre-reveal → reveal transition: server_seed and revealed_at move from
    -- NULL to a value together. Neither half-reveal direction is legal.
    if new.server_seed is null and new.revealed_at is not null then
      raise exception 'box_opens: revealed_at cannot be set without server_seed';
    end if;
    if new.server_seed is not null and new.revealed_at is null then
      raise exception 'box_opens: server_seed cannot be set without revealed_at';
    end if;
  else
    -- post-reveal: server_seed and revealed_at are pinned.
    if old.server_seed is distinct from new.server_seed then
      raise exception 'box_opens.server_seed is immutable once revealed';
    end if;
    if old.revealed_at is distinct from new.revealed_at then
      raise exception 'box_opens.revealed_at is immutable once revealed';
    end if;
  end if;

  -- granted_inventory_id may transition NULL→value exactly once.
  if old.granted_inventory_id is not null
     and old.granted_inventory_id is distinct from new.granted_inventory_id then
    raise exception 'box_opens.granted_inventory_id may only transition NULL to a value, once';
  end if;

  return new;
end;
$$;
create trigger box_opens_immutability_guard
  before update on box_opens
  for each row execute function enforce_box_opens_immutability();

-- =====================================================================
-- 6. APPEND-ONLY ledgers — shared raise function
-- coin_ledger and audit_log raise on both UPDATE and DELETE.
-- box_opens raises on DELETE (UPDATE goes through the immutability guard
-- above). trade_ledger raises on DELETE only; its UPDATE path is the
-- pending → confirmed | aborted transition guarded in 0001_init.sql.
-- =====================================================================
create or replace function raise_append_only() returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception '% on % is forbidden: this table is append-only', tg_op, tg_table_name;
  return null;
end;
$$;

create trigger coin_ledger_no_update
  before update on coin_ledger
  for each row execute function raise_append_only();
create trigger coin_ledger_no_delete
  before delete on coin_ledger
  for each row execute function raise_append_only();

create trigger audit_log_no_update
  before update on audit_log
  for each row execute function raise_append_only();
create trigger audit_log_no_delete
  before delete on audit_log
  for each row execute function raise_append_only();

create trigger box_opens_no_delete
  before delete on box_opens
  for each row execute function raise_append_only();

create trigger trade_ledger_no_delete
  before delete on trade_ledger
  for each row execute function raise_append_only();

-- =====================================================================
-- 7. CLOSET-VISITOR VIEW — public_closet_inventory
-- The old `inventory_displayed_read` RLS policy exposed every column on a
-- displayed row, including the verifier `unique_token` and the
-- post-acquisition hold timestamps. Drop the policy; expose a column-
-- narrowed view owned by postgres so it bypasses inventory RLS via
-- definer rights (security_invoker = false).
-- =====================================================================
drop policy inventory_displayed_read on inventory;

create view public_closet_inventory
  with (security_invoker = false) as
  select
    item_template_id,
    item_edition_id,
    serial_number,
    displayed_in_closet,
    owner_id
  from inventory
  where displayed_in_closet = true;
alter view public_closet_inventory owner to postgres;
grant select on public_closet_inventory to anon, authenticated;

-- =====================================================================
-- 8. HANDLE_NEW_USER — provision gameplay rows on auth signup
-- Runs AS SECURITY DEFINER so it can write to gameplay tables. search_path
-- is pinned to (public, auth) to neutralize CVE-2018-1058 search-path
-- hijack. Username/display-name fall back to a deterministic id-derived
-- handle; collisions retry once with a numeric suffix before raising.
-- Signup bonus is 500 HC (see docs/economy.md).
-- =====================================================================
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_username text;
  meta_display  text;
  fallback      text := 'skater_' || substring(new.id::text, 1, 8);
  final_user    text;
  final_display text;
begin
  meta_username := nullif(new.raw_user_meta_data->>'username', '');
  meta_display  := nullif(new.raw_user_meta_data->>'display_name', '');

  final_user    := coalesce(meta_username, fallback);
  final_display := coalesce(meta_display, meta_username, fallback);

  begin
    insert into users (id, username, display_name)
    values (new.id, final_user, final_display);
  exception when unique_violation then
    final_user := final_user || '_' || floor(random() * 1000)::int::text;
    insert into users (id, username, display_name)
    values (new.id, final_user, final_display);
  end;

  insert into wallets (user_id, balance) values (new.id, 500);
  insert into coin_ledger (user_id, amount, kind)
    values (new.id, 500, 'signup_bonus');
  insert into closets (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
