-- =====================================================================
-- SkateHubba: Avatar Closet — initial schema
-- Migration: 0001_init.sql
--
-- Architectural pillars baked into this schema:
--   1. Server-authoritative for anything touching inventory, currency, or trades.
--      Clients can SELECT their own rows via RLS, but cannot UPDATE inventory,
--      wallets, item_editions, trade_ledger, or coin_ledger directly. Those
--      mutations happen only through Edge Functions running as service_role.
--   2. Append-only ledgers (coin_ledger, trade_ledger, audit_log, box_opens).
--      Rows are inserted, never updated except for the strict state transitions
--      called out below.
--   3. Serialized item uniqueness is enforced by TWO belts:
--        a) item_editions.next_serial is a monotonic counter, advanced inside
--           the same SERIALIZABLE txn as the inventory insert.
--        b) UNIQUE(item_edition_id, serial_number) on inventory is the
--           database-level safety net.
--   4. Limited editions, once retired, are NEVER reprinted. retired_at is set
--      when next_serial > total_supply; no UPDATE may unset it.
-- =====================================================================

-- ---------- extensions ----------
create extension if not exists "pgcrypto";       -- for digest()/gen_random_uuid()
create extension if not exists "uuid-ossp";

-- ---------- helper: updated_at trigger ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- USERS
-- Backed by Supabase auth.users via FK. This table holds gameplay identity.
-- =====================================================================
create table users (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name  text not null check (char_length(display_name) between 1 and 40),
  avatar_config jsonb not null default '{}'::jsonb,  -- preset choices, palette, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- =====================================================================
-- WALLETS — Hubba Coin balances
-- One row per user. Mutations happen only through Edge Functions inside the
-- same txn as a corresponding coin_ledger INSERT. balance must equal the sum
-- of coin_ledger.amount for that user; periodic CI reconciliation enforces it.
-- =====================================================================
create table wallets (
  user_id    uuid primary key references users(id) on delete cascade,
  balance    bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
create trigger wallets_set_updated_at
  before update on wallets
  for each row execute function set_updated_at();

-- =====================================================================
-- COIN LEDGER — append-only Hubba Coin transactions
-- Every wallet mutation has a corresponding ledger row. SUM(amount) per user
-- MUST equal wallets.balance. Never UPDATE or DELETE rows here.
-- =====================================================================
create type coin_txn_kind as enum (
  'signup_bonus',
  'daily_login',
  'quest_reward',
  'achievement_reward',
  'reaction_received',
  'stripe_topup',
  'box_open_debit',
  'shop_purchase_debit',
  'admin_grant',
  'admin_revoke',
  'refund_credit'
);

create table coin_ledger (
  id            bigserial primary key,
  user_id       uuid not null references users(id) on delete restrict,
  amount        bigint not null,  -- positive = credit, negative = debit
  kind          coin_txn_kind not null,
  reference_id  uuid,             -- e.g. box_opens.id, stripe charge id, etc.
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index coin_ledger_user_created_idx on coin_ledger (user_id, created_at desc);
create index coin_ledger_kind_idx         on coin_ledger (kind);

-- =====================================================================
-- ITEM TEMPLATES — the catalog of item types
-- A template is "what the thing is" (Polestar Camo Deck). An edition is "which
-- run of it" (Polestar Camo S1, 500 minted). Inventory is "this specific copy".
-- =====================================================================
create type item_category as enum (
  'deck', 'shoe', 'top', 'bottom', 'headwear',
  'accessory', 'sticker', 'closet_decor'
);

create type item_rarity as enum (
  'common', 'uncommon', 'rare', 'epic', 'mythic'
);

create table item_templates (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  display_name    text not null,
  brand_slug      text not null,                   -- 'hubba', 'thrashr', 'polestar', ...
  category        item_category not null,
  base_rarity     item_rarity not null,
  thumbnail_path  text,                            -- supabase storage path
  mesh_path       text,                            -- supabase storage path
  texture_paths   jsonb not null default '[]'::jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger item_templates_set_updated_at
  before update on item_templates
  for each row execute function set_updated_at();
create index item_templates_brand_idx on item_templates (brand_slug);
create index item_templates_category_idx on item_templates (category);

-- =====================================================================
-- ITEM EDITIONS — limited runs of a template
-- next_serial is a monotonic counter. Mint flow:
--   UPDATE item_editions
--      SET next_serial = next_serial + 1
--    WHERE id = ?
--      AND next_serial <= total_supply
--      AND retired_at IS NULL
--   RETURNING next_serial - 1 AS minted_serial;
-- If 0 rows returned, the edition is sold out — abort.
--
-- total_supply = NULL means unlimited (house brand basics). For those,
-- serial_number on inventory is NULL.
-- =====================================================================
create table item_editions (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,100}$'),
  item_template_id  uuid not null references item_templates(id) on delete restrict,
  edition_name      text not null,                 -- "Series 1", "Founders", etc.
  total_supply      integer check (total_supply is null or total_supply > 0),
  next_serial       integer not null default 1 check (next_serial >= 1),
  opens_at          timestamptz,                   -- shop drop time, null = available immediately
  closes_at         timestamptz,                   -- forced cutoff (e.g. event end)
  retired_at        timestamptz,                   -- set when sold out; never unset
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- next_serial can grow up to total_supply + 1 (the "just sold the last one" state)
  constraint next_serial_within_supply check (
    total_supply is null or next_serial <= total_supply + 1
  )
);
create trigger item_editions_set_updated_at
  before update on item_editions
  for each row execute function set_updated_at();
create index item_editions_template_idx on item_editions (item_template_id);
create index item_editions_opens_idx on item_editions (opens_at) where opens_at is not null;

-- Guard against re-opening a retired edition
create or replace function prevent_retire_unset() returns trigger
language plpgsql as $$
begin
  if old.retired_at is not null and new.retired_at is null then
    raise exception 'item_editions.retired_at cannot be unset (edition % is permanently retired)', old.slug;
  end if;
  return new;
end;
$$;
create trigger item_editions_no_unretire
  before update on item_editions
  for each row execute function prevent_retire_unset();

-- =====================================================================
-- INVENTORY — one row per specific copy of an item owned by a user
-- This is the table that trades, boxes, and shop purchases all mutate.
-- All mutations go through Edge Functions; RLS forbids direct client writes.
-- =====================================================================
create type inventory_source as enum (
  'signup_grant',
  'box_drop',
  'shop_purchase',
  'trade_in',
  'admin_grant',
  'event_reward'
);

create table inventory (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references users(id) on delete restrict,
  item_template_id  uuid not null references item_templates(id) on delete restrict,
  item_edition_id   uuid references item_editions(id) on delete restrict,
  serial_number     integer,                       -- null = unlimited edition
  unique_token      bytea not null,                -- SHA256(template || edition || serial || created_at || server_secret)
  source            inventory_source not null,
  acquired_at       timestamptz not null default now(),
  tradeable_after   timestamptz not null default (now() + interval '7 days'),
  current_trade_id  bigint,                        -- FK added later; null = not in a pending trade
  equipped          boolean not null default false,
  displayed_in_closet boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- belt 2: a numbered serial within an edition is unique by construction
  constraint inventory_edition_serial_unique
    unique (item_edition_id, serial_number)
    deferrable initially immediate,
  -- if serial_number is set, edition must be set, and vice-versa for numbered editions
  constraint inventory_serial_requires_edition check (
    (serial_number is null) or (item_edition_id is not null)
  )
);
create trigger inventory_set_updated_at
  before update on inventory
  for each row execute function set_updated_at();

create index inventory_owner_idx on inventory (owner_id);
create index inventory_owner_equipped_idx on inventory (owner_id) where equipped;
create index inventory_owner_displayed_idx on inventory (owner_id) where displayed_in_closet;
create index inventory_template_idx on inventory (item_template_id);
create index inventory_pending_trade_idx on inventory (current_trade_id) where current_trade_id is not null;
create index inventory_tradeable_after_idx on inventory (tradeable_after);

-- =====================================================================
-- TRADE LEDGER — append-only history of every trade attempt
-- States: pending → confirmed | aborted
-- Once confirmed or aborted, status never changes. No UPDATEs except the
-- pending → confirmed/aborted transition, guarded by trigger below.
-- =====================================================================
create type trade_status as enum ('pending', 'confirmed', 'aborted');

create table trade_ledger (
  id                bigserial primary key,         -- monotonic; this is our audit anchor
  user_a            uuid not null references users(id) on delete restrict,
  user_b            uuid not null references users(id) on delete restrict,
  inventory_a       uuid not null references inventory(id) on delete restrict,
  inventory_b       uuid not null references inventory(id) on delete restrict,
  status            trade_status not null default 'pending',
  proposed_at       timestamptz not null default now(),
  resolved_at       timestamptz,
  abort_reason      text,
  metadata          jsonb not null default '{}'::jsonb,
  constraint trade_distinct_parties check (user_a <> user_b),
  constraint trade_distinct_items   check (inventory_a <> inventory_b)
);
create index trade_ledger_user_a_idx on trade_ledger (user_a, proposed_at desc);
create index trade_ledger_user_b_idx on trade_ledger (user_b, proposed_at desc);
create index trade_ledger_status_idx on trade_ledger (status) where status = 'pending';

-- Status transitions are strict: pending → confirmed | aborted, no reversal.
create or replace function enforce_trade_status_transition() returns trigger
language plpgsql as $$
begin
  if old.status = 'confirmed' and new.status <> 'confirmed' then
    raise exception 'trade % is confirmed and cannot transition', old.id;
  end if;
  if old.status = 'aborted' and new.status <> 'aborted' then
    raise exception 'trade % is aborted and cannot transition', old.id;
  end if;
  return new;
end;
$$;
create trigger trade_ledger_status_guard
  before update on trade_ledger
  for each row execute function enforce_trade_status_transition();

-- Now we can wire the inventory.current_trade_id FK
alter table inventory
  add constraint inventory_current_trade_fk
  foreign key (current_trade_id) references trade_ledger(id)
  on delete set null;

-- =====================================================================
-- LOOT BOXES — box catalog + drop tables
-- The drop_tables table is the public source of truth. The /odds page reads
-- straight from here. CI test asserts what we publish matches these rows.
-- =====================================================================
create type box_kind as enum ('daily', 'standard', 'premium', 'seasonal');

create table loot_boxes (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  display_name text not null,
  kind         box_kind not null,
  cost_hc      integer not null check (cost_hc >= 0),  -- 0 for daily/earned boxes
  available_from timestamptz,
  available_to   timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger loot_boxes_set_updated_at
  before update on loot_boxes
  for each row execute function set_updated_at();

-- Drop tables: each row is "with weight W out of total, drop this rarity",
-- and within rarity the box_open Edge Function picks a template uniformly
-- from the eligible pool. Weights are integers; sum-per-box must equal 10000.
-- A CI check enforces the sum and publishes /odds accordingly.
create table loot_box_drop_tables (
  id             bigserial primary key,
  loot_box_id    uuid not null references loot_boxes(id) on delete cascade,
  rarity         item_rarity not null,
  weight         integer not null check (weight > 0),
  metadata       jsonb not null default '{}'::jsonb,
  unique (loot_box_id, rarity)
);
create index loot_box_drop_tables_box_idx on loot_box_drop_tables (loot_box_id);

-- =====================================================================
-- BOX OPENS — append-only commit-reveal transcript for every opened box
-- Anyone (player, regulator, auditor) can re-derive the outcome from this row.
-- =====================================================================
create table box_opens (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete restrict,
  loot_box_id         uuid not null references loot_boxes(id) on delete restrict,
  server_seed_hash    bytea not null,              -- SHA256(server_seed), published at commit time
  server_seed         bytea,                       -- revealed after outcome (null until reveal)
  client_seed         bytea not null,
  nonce               bigint not null,
  outcome_index       integer not null check (outcome_index >= 0 and outcome_index < 10000),
  resulting_rarity    item_rarity not null,
  granted_inventory_id uuid references inventory(id) on delete set null,
  opened_at           timestamptz not null default now(),
  revealed_at         timestamptz,
  unique (server_seed_hash, client_seed, nonce)
);
create index box_opens_user_idx on box_opens (user_id, opened_at desc);
create index box_opens_loot_box_idx on box_opens (loot_box_id, opened_at desc);

-- =====================================================================
-- CLOSETS — per-user closet layout and theme
-- =====================================================================
create table closets (
  user_id      uuid primary key references users(id) on delete cascade,
  theme        text not null default 'classic_wood',
  layout       jsonb not null default '{}'::jsonb, -- shelf positions, deck-wall slots, etc.
  visit_count  bigint not null default 0,
  fire_count   bigint not null default 0,
  is_public    boolean not null default true,
  updated_at   timestamptz not null default now()
);
create trigger closets_set_updated_at
  before update on closets
  for each row execute function set_updated_at();

-- =====================================================================
-- REACTIONS — closet visit reactions ("fire", "respect", "want")
-- Rate-limited to N per visitor per closet per day in app logic.
-- =====================================================================
create type reaction_kind as enum ('fire', 'respect', 'want');

create table closet_reactions (
  id          bigserial primary key,
  closet_user_id uuid not null references users(id) on delete cascade,
  visitor_id  uuid not null references users(id) on delete cascade,
  kind        reaction_kind not null,
  created_at  timestamptz not null default now()
);
create index closet_reactions_closet_idx on closet_reactions (closet_user_id, created_at desc);

-- =====================================================================
-- AUDIT LOG — generic append-only system events
-- For anything that doesn't fit a dedicated ledger but still needs a trail:
-- admin actions, suspicious-pattern flags, refund operations, etc.
-- =====================================================================
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references users(id) on delete set null,  -- null = system
  event       text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_event_idx on audit_log (event, created_at desc);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc) where actor_id is not null;

-- =====================================================================
-- ROW-LEVEL SECURITY
-- The principle: clients can SELECT their own data and publicly visible data.
-- They CANNOT write to inventory, wallets, coin_ledger, trade_ledger,
-- item_editions, or box_opens directly. All mutations go through Edge
-- Functions running as service_role.
-- =====================================================================

alter table users enable row level security;
alter table wallets enable row level security;
alter table coin_ledger enable row level security;
alter table item_templates enable row level security;
alter table item_editions enable row level security;
alter table inventory enable row level security;
alter table trade_ledger enable row level security;
alter table loot_boxes enable row level security;
alter table loot_box_drop_tables enable row level security;
alter table box_opens enable row level security;
alter table closets enable row level security;
alter table closet_reactions enable row level security;
alter table audit_log enable row level security;

-- users: read your own profile; read other users' public profile fields
create policy users_self_read on users
  for select using (auth.uid() = id);
create policy users_public_read on users
  for select using (true);  -- public profile is intentional
-- updates: only your own row. This policy is intentionally open at the
-- column level: identity-shape columns (username, display_name,
-- avatar_config) are user-mutable from server actions, and the trade
-- engine never touches the users table. Money-shaped writes (wallets,
-- inventory, etc.) live on other tables behind service-role Edge
-- Functions; do NOT widen this policy to those.
create policy users_self_update on users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- wallets: read your own balance only
create policy wallets_self_read on wallets
  for select using (auth.uid() = user_id);

-- coin_ledger: read your own coin history only
create policy coin_ledger_self_read on coin_ledger
  for select using (auth.uid() = user_id);

-- item_templates / item_editions / loot_boxes / drop tables: all public
create policy item_templates_public_read on item_templates for select using (true);
create policy item_editions_public_read  on item_editions  for select using (true);
create policy loot_boxes_public_read     on loot_boxes     for select using (true);
create policy drop_tables_public_read    on loot_box_drop_tables for select using (true);

-- inventory: read your own AND any owner's "displayed_in_closet" rows
-- (so closet visitors can see what's on the walls without seeing the rest)
create policy inventory_self_read on inventory
  for select using (auth.uid() = owner_id);
create policy inventory_displayed_read on inventory
  for select using (displayed_in_closet = true);

-- trade_ledger: read trades you're a party to. Public history endpoint is
-- exposed via a SECURITY DEFINER view to avoid leaking pending trades.
create policy trade_ledger_party_read on trade_ledger
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- box_opens: read your own opens (full transcript). A public summary is
-- exposed via a SECURITY DEFINER view.
create policy box_opens_self_read on box_opens
  for select using (auth.uid() = user_id);

-- closets: public if is_public, else owner-only
create policy closets_public_read on closets
  for select using (is_public = true);
create policy closets_owner_read on closets
  for select using (auth.uid() = user_id);

-- closet_reactions: anyone can read aggregate; nobody writes via client
-- (handled by Edge Function with rate-limit logic)
create policy closet_reactions_public_read on closet_reactions for select using (true);

-- audit_log: nobody reads via client. Service-role only.

-- =====================================================================
-- DONE.
-- Next migrations (planned):
--   0002_economy_seed.sql — seed initial loot_boxes + drop_tables + hubba house items
--   0003_brand_seed.sql   — seed fictional brand item_templates
--   0004_views.sql        — public trade-history view, /odds view, leaderboard views
-- =====================================================================
