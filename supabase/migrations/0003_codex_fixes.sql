-- =====================================================================
-- SkateHubba: Avatar Closet — codex fixes
-- Migration: 0003_codex_fixes.sql
--
-- Closes three findings raised by an external automated reviewer (Codex)
-- against 0002_audit_fixes.sql. All three are real defects on the
-- money-shaped surface:
--   1. Cross-column collision (inventory_a of trade #1 = inventory_b of
--      trade #2) slips past the two partial UNIQUE indexes from
--      0002. Replaced with a side-table projection whose single
--      UNIQUE(inventory_id) is the actual invariant.
--   2. public_closet_inventory exposed every displayed row regardless of
--      closets.is_public. Recreated with an INNER JOIN on closets so a
--      missing or private closet row fails closed.
--   3. enforce_trade_status_transition pinned nothing on the pending →
--      pending or pending → resolved paths. Service-role code could
--      rewrite inventory_a, user_b, proposed_at, etc. on a live trade.
--      Extended to pin the immutable columns and to enforce the
--      resolved_at / abort_reason rules per target status.
-- =====================================================================

-- =====================================================================
-- 1. ENFORCE_TRADE_STATUS_TRANSITION — extended with pending-row pins
-- Pure CREATE OR REPLACE; the trade_ledger_status_guard trigger from
-- 0001 already wires this function on BEFORE UPDATE. search_path is
-- pinned to public to neutralize CVE-2018-1058 search-path hijack.
-- =====================================================================
create or replace function enforce_trade_status_transition() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'confirmed' and new.status <> 'confirmed' then
    raise exception 'trade % is confirmed and cannot transition', old.id;
  end if;
  if old.status = 'aborted' and new.status <> 'aborted' then
    raise exception 'trade % is aborted and cannot transition', old.id;
  end if;

  if old.status = 'pending' then
    if old.id          is distinct from new.id          then raise exception 'trade_ledger.id is immutable'; end if;
    if old.user_a      is distinct from new.user_a      then raise exception 'trade_ledger.user_a is immutable while pending'; end if;
    if old.user_b      is distinct from new.user_b      then raise exception 'trade_ledger.user_b is immutable while pending'; end if;
    if old.inventory_a is distinct from new.inventory_a then raise exception 'trade_ledger.inventory_a is immutable while pending'; end if;
    if old.inventory_b is distinct from new.inventory_b then raise exception 'trade_ledger.inventory_b is immutable while pending'; end if;
    if old.proposed_at is distinct from new.proposed_at then raise exception 'trade_ledger.proposed_at is immutable'; end if;

    if new.status = 'confirmed' then
      if new.resolved_at is null then raise exception 'trade % confirmed without resolved_at', new.id; end if;
      if new.abort_reason is not null then raise exception 'trade % confirmed must have null abort_reason', new.id; end if;
    elsif new.status = 'aborted' then
      if new.resolved_at is null then raise exception 'trade % aborted without resolved_at', new.id; end if;
    else
      if old.resolved_at  is distinct from new.resolved_at  then raise exception 'trade_ledger.resolved_at must remain null while pending'; end if;
      if old.abort_reason is distinct from new.abort_reason then raise exception 'trade_ledger.abort_reason must remain null while pending'; end if;
    end if;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- 2. PUBLIC_CLOSET_INVENTORY — fail-closed on closets.is_public
-- The previous definition exposed any displayed_in_closet=true row even
-- when the owner had toggled their closet private (or had no closets
-- row at all). INNER JOIN on closets makes the absence of a public
-- closet row deny exposure rather than permit it.
-- =====================================================================
drop view public_closet_inventory;

create view public_closet_inventory
  with (security_invoker = false) as
  select
    i.item_template_id,
    i.item_edition_id,
    i.serial_number,
    i.displayed_in_closet,
    i.owner_id
  from inventory i
  inner join closets c on c.user_id = i.owner_id
  where i.displayed_in_closet = true
    and c.is_public = true;
alter view public_closet_inventory owner to postgres;
grant select on public_closet_inventory to anon, authenticated;

-- =====================================================================
-- 3. TRADE_LEDGER_PENDING_ITEMS — side-table projection
-- Two partial UNIQUE indexes on trade_ledger(inventory_a) and
-- trade_ledger(inventory_b) cannot catch a cross-column collision: row 1
-- with inventory_a=X and row 2 with inventory_b=X both look unique
-- within their own column. The invariant we want is "this inventory row
-- appears in AT MOST one pending trade", which is a single-column
-- UNIQUE on a projection that flattens both slots. Two rows per pending
-- trade (slot 'a' and slot 'b'); the unique index spans both.
--
-- Written only by the sync trigger below; never by application code.
-- RLS is enabled with no policies, so authenticated/anon clients cannot
-- see or touch it. service_role bypasses RLS via Edge Functions.
-- =====================================================================
create table trade_ledger_pending_items (
  trade_id      bigint not null references trade_ledger(id) on delete restrict,
  inventory_id  uuid   not null references inventory(id)     on delete restrict,
  slot          char(1) not null check (slot in ('a','b')),
  primary key (trade_id, slot),
  unique (inventory_id)
);
create index trade_ledger_pending_items_trade_idx
  on trade_ledger_pending_items (trade_id);

alter table trade_ledger_pending_items enable row level security;

-- Sync function: project pending trade_ledger rows into the side-table,
-- and clear them out on pending → confirmed/aborted. Cross-column dupes
-- surface here as a UNIQUE violation on inventory_id at INSERT time.
create or replace function sync_pending_trade_items() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      insert into trade_ledger_pending_items (trade_id, inventory_id, slot)
        values (new.id, new.inventory_a, 'a'),
               (new.id, new.inventory_b, 'b');
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status <> 'pending' then
      delete from trade_ledger_pending_items where trade_id = new.id;
    end if;
  end if;
  return null;
end;
$$;

-- AFTER timing: the BEFORE-update guard from 0001 runs first, so by the
-- time we project, the status transition has already been approved.
create trigger trade_ledger_pending_items_sync
  after insert or update of status on trade_ledger
  for each row execute function sync_pending_trade_items();

-- Backfill any existing pending rows. Pre-launch this is expected to be
-- zero rows; the statement is here so a future replay of this migration
-- against a populated DB stays consistent. Direct INSERTs do not fire
-- the trigger above (which is on trade_ledger, not on this table).
insert into trade_ledger_pending_items (trade_id, inventory_id, slot)
  select id, inventory_a, 'a' from trade_ledger where status = 'pending';
insert into trade_ledger_pending_items (trade_id, inventory_id, slot)
  select id, inventory_b, 'b' from trade_ledger where status = 'pending';

-- The two partial UNIQUE indexes from 0002 are now superseded by the
-- side-table's UNIQUE(inventory_id). Drop them so there is exactly one
-- source of truth for the "one pending trade per inventory row"
-- invariant.
drop index trade_ledger_pending_inv_a;
drop index trade_ledger_pending_inv_b;
