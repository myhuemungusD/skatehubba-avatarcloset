// Snapshot guard: every Postgres enum we mirror in TS must byte-match the
// CREATE TYPE definition in supabase/migrations/0001_init.sql. Drift here is a
// charter-shaped problem — drop-table rarities, trade statuses, and coin
// ledger kinds are public surface.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  BOX_KINDS,
  COIN_TXN_KINDS,
  INVENTORY_SOURCES,
  ITEM_CATEGORIES,
  ITEM_RARITIES,
  REACTION_KINDS,
  TRADE_STATUSES,
} from '../enums.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(here, '../../../../supabase/migrations/0001_init.sql');
const migration = readFileSync(migrationPath, 'utf8');

function pgEnum(typeName: string): string[] {
  const re = new RegExp(`create\\s+type\\s+${typeName}\\s+as\\s+enum\\s*\\(([^)]+)\\)`, 'i');
  const match = migration.match(re);
  if (!match || match[1] === undefined) {
    throw new Error(`enum ${typeName} not found in 0001_init.sql`);
  }
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1] as string);
}

describe('postgres enum parity', () => {
  it('coin_txn_kind matches CoinTxnKind', () => {
    expect(pgEnum('coin_txn_kind')).toEqual([...COIN_TXN_KINDS]);
  });
  it('inventory_source matches InventorySource', () => {
    expect(pgEnum('inventory_source')).toEqual([...INVENTORY_SOURCES]);
  });
  it('trade_status matches TradeStatus', () => {
    expect(pgEnum('trade_status')).toEqual([...TRADE_STATUSES]);
  });
  it('item_category matches ItemCategory', () => {
    expect(pgEnum('item_category')).toEqual([...ITEM_CATEGORIES]);
  });
  it('item_rarity matches ItemRarity', () => {
    expect(pgEnum('item_rarity')).toEqual([...ITEM_RARITIES]);
  });
  it('box_kind matches BoxKind', () => {
    expect(pgEnum('box_kind')).toEqual([...BOX_KINDS]);
  });
  it('reaction_kind matches ReactionKind', () => {
    expect(pgEnum('reaction_kind')).toEqual([...REACTION_KINDS]);
  });
});
