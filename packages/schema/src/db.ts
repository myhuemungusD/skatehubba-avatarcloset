// READ-shape mirrors of Supabase tables (see supabase/migrations/0001_init.sql
// and 0002_audit_fixes.sql). Timestamps are ISO strings; bytea is base64.
// These are intentionally read-only types — the Edge Functions own writes.

import type {
  BoxKind,
  CoinTxnKind,
  InventorySource,
  ItemCategory,
  ItemRarity,
  ReactionKind,
  TradeStatus,
} from './enums.js';

export type IsoTimestamp = string;
export type Uuid = string;
export type Base64Bytes = string;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export interface UserRow {
  id: Uuid;
  username: string;
  display_name: string;
  avatar_config: JsonValue;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WalletRow {
  user_id: Uuid;
  balance: number;
  updated_at: IsoTimestamp;
}

export interface CoinLedgerRow {
  id: number;
  user_id: Uuid;
  amount: number;
  kind: CoinTxnKind;
  reference_id: Uuid | null;
  metadata: JsonValue;
  created_at: IsoTimestamp;
}

export interface ItemTemplateRow {
  id: Uuid;
  slug: string;
  display_name: string;
  brand_slug: string;
  category: ItemCategory;
  base_rarity: ItemRarity;
  thumbnail_path: string | null;
  mesh_path: string | null;
  texture_paths: JsonValue;
  metadata: JsonValue;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface ItemEditionRow {
  id: Uuid;
  slug: string;
  item_template_id: Uuid;
  edition_name: string;
  total_supply: number | null;
  next_serial: number;
  opens_at: IsoTimestamp | null;
  closes_at: IsoTimestamp | null;
  retired_at: IsoTimestamp | null;
  metadata: JsonValue;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface InventoryRow {
  id: Uuid;
  owner_id: Uuid;
  item_template_id: Uuid;
  item_edition_id: Uuid | null;
  serial_number: number | null;
  unique_token: Base64Bytes;
  source: InventorySource;
  acquired_at: IsoTimestamp;
  tradeable_after: IsoTimestamp;
  current_trade_id: number | null;
  equipped: boolean;
  displayed_in_closet: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface TradeLedgerRow {
  id: number;
  user_a: Uuid;
  user_b: Uuid;
  inventory_a: Uuid;
  inventory_b: Uuid;
  status: TradeStatus;
  proposed_at: IsoTimestamp;
  resolved_at: IsoTimestamp | null;
  abort_reason: string | null;
  metadata: JsonValue;
}

export interface LootBoxRow {
  id: Uuid;
  slug: string;
  display_name: string;
  kind: BoxKind;
  cost_hc: number;
  available_from: IsoTimestamp | null;
  available_to: IsoTimestamp | null;
  metadata: JsonValue;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface LootBoxDropTableRow {
  id: number;
  loot_box_id: Uuid;
  rarity: ItemRarity;
  weight: number;
  metadata: JsonValue;
}

export interface BoxOpenCommitRow {
  id: Uuid;
  user_id: Uuid;
  loot_box_id: Uuid;
  server_seed_hash: Base64Bytes;
  committed_at: IsoTimestamp;
}

export interface BoxOpenRow {
  id: Uuid;
  user_id: Uuid;
  loot_box_id: Uuid;
  commit_id: Uuid;
  server_seed_hash: Base64Bytes;
  server_seed: Base64Bytes | null;
  client_seed: Base64Bytes;
  nonce: number;
  outcome_index: number;
  resulting_rarity: ItemRarity;
  granted_inventory_id: Uuid | null;
  opened_at: IsoTimestamp;
  revealed_at: IsoTimestamp | null;
}

export interface ClosetRow {
  user_id: Uuid;
  theme: string;
  layout: JsonValue;
  visit_count: number;
  fire_count: number;
  is_public: boolean;
  updated_at: IsoTimestamp;
}

export interface ClosetReactionRow {
  id: number;
  closet_user_id: Uuid;
  visitor_id: Uuid;
  kind: ReactionKind;
  created_at: IsoTimestamp;
}

export interface AuditLogRow {
  id: number;
  actor_id: Uuid | null;
  event: string;
  payload: JsonValue;
  created_at: IsoTimestamp;
}

// View from 0002_audit_fixes.sql — column-narrowed, owner-bound projection
// of inventory rows that are currently displayed in a closet.
export interface PublicClosetInventoryRow {
  item_template_id: Uuid;
  item_edition_id: Uuid | null;
  serial_number: number | null;
  displayed_in_closet: boolean;
  owner_id: Uuid;
}
