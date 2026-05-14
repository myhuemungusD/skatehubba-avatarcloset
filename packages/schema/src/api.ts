// Edge Function request/response envelopes. Phase 1 ships only `healthResponse`
// as a real schema; openBox / proposeTrade / mintShopItem are stubs until the
// respective Edge Functions land in Phase 2+.

import { z } from 'zod';

export const healthResponse = z.object({
  ok: z.literal(true),
  service: z.string(),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponse>;

// ---------------------------------------------------------------------------
// Phase 2+ stubs. Do not consume these. They exist so callers see the shape of
// the surface that's coming and so the export map is stable.
// ---------------------------------------------------------------------------

export const openBoxRequest = z
  .object({
    commit_id: z.string().uuid(),
    client_seed: z.string(),
    nonce: z.number().int().nonnegative(),
  })
  .describe('Phase 2+ stub — Edge Function not yet implemented.');
export type OpenBoxRequest = z.infer<typeof openBoxRequest>;

export const proposeTradeRequest = z
  .object({
    inventory_a: z.string().uuid(),
    inventory_b: z.string().uuid(),
    counterparty_user_id: z.string().uuid(),
  })
  .describe('Phase 3+ stub — trade engine not yet implemented.');
export type ProposeTradeRequest = z.infer<typeof proposeTradeRequest>;

export const mintShopItemRequest = z
  .object({
    item_edition_id: z.string().uuid(),
  })
  .describe('Phase 2+ stub — shop minting not yet implemented.');
export type MintShopItemRequest = z.infer<typeof mintShopItemRequest>;
