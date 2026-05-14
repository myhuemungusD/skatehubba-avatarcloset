# Claude project rules — SkateHubba Avatar Closet

If you're an agent reading this, read [`docs/CHARTER.md`](docs/CHARTER.md) and [`docs/team.md`](docs/team.md) first.

## Hard rules

1. **Server-authoritative for inventory, wallets, trades.** Client code never directly writes `inventory`, `wallets`, `coin_ledger`, `trade_ledger`, `item_editions`, or `box_opens`. Those mutations only happen in Supabase Edge Functions running as `service_role`. RLS already enforces this — don't try to work around it.
2. **Append-only ledgers.** `coin_ledger`, `trade_ledger`, `box_opens`, `audit_log` are insert-only. The few legal UPDATEs (trade status transitions, seed reveal) are guarded by triggers.
3. **No reprints, ever.** `item_editions.retired_at`, once set, is permanent (DB trigger enforces it). Don't add an admin tool to unset it.
4. **No item ↔ Hubba Coin trades between players.** Trades are item-for-item only. Adding a coin leg to a trade is a charter violation and a money-transmitter risk.
5. **Drop rates must match published rates.** Anything in `loot_box_drop_tables` is public. The `/odds` page is generated from these rows. A CI check enforces parity.
6. **No real-brand replicas at MVP.** See `docs/brand-bible.md`. Fictional brands only. If you're tempted to add real logos/colorways, stop and escalate.
7. **No on-chain anything at MVP.** Not Polygon, not Ethereum, not "just in case". Phase 3+ conversation only.

## Agent model

All delegated agents (`Agent` tool calls) on this project run on **Opus 4.7**. Pass `model: "opus"` on every `Agent` invocation. No Sonnet, no Haiku for substantive work — the trade engine, the schema, and the charter-touching surface are too high-leverage. If a future Claude generation is available and stronger than Opus 4.7, this rule is the place to update.

## Branch + PR rules

- Phase 0 work: directly on `claude/skater-closet-game-ZATwX`.
- Phase 1+ work: feature branches off `claude/skater-closet-game-ZATwX`, PR with reviewer-agent pass before merge.
- Never push to `main` without explicit human approval.
- Any PR touching `inventory`, `trade_ledger`, `wallets`, `coin_ledger`, `item_editions`, or `box_opens` requires the QA dupe-bug stress harness to pass.

## How to think about the trade engine

It is the highest-risk, highest-leverage piece of this product. Treat it accordingly:
- Architect agent designs before Implementer agent codes.
- SERIALIZABLE isolation, row locks, append-only ledger, monotonic IDs.
- 7-day post-acquisition hold on every newly-acquired inventory row.
- Dupe-bug stress harness mandatory before merge.

If something feels "good enough" in the trade engine, it isn't. Slow down.

## How to think about loot boxes

Commit-reveal randomness:
- Server commits to `SHA256(server_seed)` BEFORE the player provides input.
- Player provides `client_seed` + `nonce`.
- Outcome = `SHA256(server_seed || client_seed || nonce) % 10000` → drop table lookup.
- Server reveals `server_seed` after outcome; the whole transcript lands in `box_opens`.

Any third-party script can verify a past open by re-deriving the outcome from the transcript. This is a feature.

## Style

- Default to no comments. Comment only the WHY when a hidden constraint or invariant matters (see the migration file for the right kind of comment).
- Don't add features the task didn't ask for.
- Don't add backwards-compat shims for code that doesn't exist yet.
- Don't write planning docs unless asked; this project's planning is in `docs/`.

## When in doubt

Read the charter. The pillars override convenience.
