# Security disclosure

This product has a money-shaped surface: virtual currency, numbered limited items, and peer-to-peer trades. Some bug classes are far more impactful than typical web bugs, and we triage them differently. **Do not file a public GitHub issue for any of the categories below.** Use the private disclosure path.

## High-impact categories (always private, always Sev-0)

- **Trade dupe / item duplication** — any path that creates a copy of an inventory row, splits ownership, or lets an item appear in two places.
- **Currency mint / wallet manipulation** — any path that grants Hubba Coins without a corresponding `coin_ledger` debit, or that lets a player edit their `wallets.balance`.
- **RLS bypass** — any way for an unauthenticated or non-owner client to read or write `inventory`, `wallets`, `coin_ledger`, `trade_ledger`, `item_editions`, `box_opens`, or `box_open_commits` beyond what the policies in `0001_init.sql` and `0002_audit_fixes.sql` permit.
- **RNG attack on loot boxes** — any way to predict, influence, or replay the commit-reveal outcome of a `box_opens` row before the server reveals `server_seed`.
- **`unique_token` forgery** — any way to generate or copy an `inventory.unique_token` for an item the attacker does not legitimately own.
- **`item_editions.retired_at` bypass** — any path that lets a retired edition be revived or have its supply expanded.
- **Auth / session hijack** affecting any of the above surfaces.

## How to report

Email: **jayham710@gmail.com** with subject `[SkateHubba security]`.

Encrypt with PGP if you can — request a key in your first email and we'll send one. Include:

1. Affected URL / endpoint / table.
2. Minimal reproduction steps. Ideally a small script or curl invocation.
3. What you observed vs what should happen.
4. Your handle / contact for follow-up.

## What we promise

- **Acknowledge within 48 hours.**
- **Triage decision (Sev 0–3) within 5 business days.**
- **Patch ETA communicated within 10 business days.**
- **Credit you publicly when fixed** (or remain anonymous on request).
- **Will not pursue you legally** for good-faith research that meets the rules below.

## Rules of engagement

- Test against your own accounts only. No probing of other players' inventory or trades.
- No automated scanning that creates load (e.g. opening 10,000 boxes in a loop).
- No social engineering against staff or contractors.
- No publishing details until we've shipped a fix, or 90 days after acknowledgement — whichever is sooner.
- Do not use found vulnerabilities to extract Hubba Coins, items, or real money. If you accidentally do, report immediately and we'll reverse the state.

## Bounty (post-launch)

A real bug bounty program goes live with public launch. Pre-launch, recognition + a hand-written thank-you + early-access cosmetic for the disclosing researcher.

## Lower-severity bugs

Everything else (visual glitches, broken UI, performance) — open a regular GitHub issue using the bug report template.
