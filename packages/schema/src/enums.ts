// Postgres enum mirrors. Keep these values byte-identical to the CREATE TYPE
// statements in supabase/migrations/0001_init.sql — the snapshot guard in
// __tests__/enums.test.ts will flag drift.

export const COIN_TXN_KINDS = [
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
  'refund_credit',
] as const;
export type CoinTxnKind = (typeof COIN_TXN_KINDS)[number];

export const INVENTORY_SOURCES = [
  'signup_grant',
  'box_drop',
  'shop_purchase',
  'trade_in',
  'admin_grant',
  'event_reward',
] as const;
export type InventorySource = (typeof INVENTORY_SOURCES)[number];

export const TRADE_STATUSES = ['pending', 'confirmed', 'aborted'] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

export const ITEM_CATEGORIES = [
  'deck',
  'shoe',
  'top',
  'bottom',
  'headwear',
  'accessory',
  'sticker',
  'closet_decor',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'mythic'] as const;
export type ItemRarity = (typeof ITEM_RARITIES)[number];

export const BOX_KINDS = ['daily', 'standard', 'premium', 'seasonal'] as const;
export type BoxKind = (typeof BOX_KINDS)[number];

export const REACTION_KINDS = ['fire', 'respect', 'want'] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];
