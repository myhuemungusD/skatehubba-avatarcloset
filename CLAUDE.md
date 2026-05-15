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

## Quality bar — production-level on every PR

This project ships to a public, money-shaped surface. The bar is production-level on every PR, not "Phase 1 is throwaway, we'll harden later." Specifically:

1. **No "PASS WITH NOTES" merges.** If the Reviewer agent identifies anything worth fixing — typo in a constraint name, missing `search_path`, belt-and-suspenders invariant assertion on a load-bearing trigger, anything — it gets fixed before merge. The Chief Engineer does not have discretion to skip a Reviewer finding. If a finding is genuinely unactionable, the Reviewer says so; the chief does not unilaterally downgrade it.
2. **Defense-in-depth is welcome on load-bearing surface.** The default project style rule ("don't validate scenarios that can't happen") applies to ordinary application code. It does NOT apply to triggers, RLS policies, or audit-trail invariants on `inventory`, `trade_ledger`, `wallets`, `coin_ledger`, `item_editions`, `box_opens`, or `box_open_commits`. On those surfaces, self-documenting invariant assertions are encouraged — they catch the "should be impossible but somehow isn't" class of bug, which is exactly the class that produces dupe exploits.
3. **Reviewer findings are re-Reviewed when patched.** If the Reviewer identifies issues and the chief patches them, the Reviewer runs again on the patched diff. The chief does not self-certify a fix to a Reviewer finding.
4. **No commit ships with a known defect.** "Phase 2 cleanup" is not a real backlog entry. If we see it, we fix it. Tech debt that doesn't go into a commit doesn't become tech debt.
5. **No "we'll come back to it" deferrals.** Anything we identify in a PR that needs correcting gets corrected before merge. The only legitimate deferrals are tasks blocked on an external dependency we genuinely cannot satisfy from the repo (e.g., a third-party API key, a staging environment the owner hasn't provisioned). Those go in [`docs/backlog.md`](docs/backlog.md) with the specific external blocker named. Everything else gets fixed now.

## Reviewer agent depth — Auditor-grade by default

Every Reviewer agent dispatch reads every line of every changed file. There is no "sampling," "spot-checking," or "verifying the design contract was followed." The Reviewer reads the diff in full and, in addition, reads the surrounding files needed to understand each change in context. Specifically the Reviewer must:

1. **Verify the changed surface charter-by-charter and hard-rule-by-hard-rule.** Not just "this PR doesn't touch trades." Actively confirm: no coin leg added; no `retired_at` mutation path opened; no on-chain reference introduced; no client-side write to a money table; no new RLS hole; no append-only bypass.
2. **Verify every new function has `set search_path` if it's a Postgres function.** Verify every new trigger function pins commit-time columns where appropriate. Verify every new RLS policy or view denies-by-default.
3. **Run every CI gate locally** (`pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm -r typecheck`, `pnpm -r test --run`, the three charter grep guards). Not "I trust CI" — verify locally.
4. **Cross-check every doc against every other doc.** When the migration adds a table, the architecture doc mentions it; when a flow changes, every doc that references that flow gets updated; when a comment promises behavior, the code delivers it.
5. **Run the codebase's broader greps** for known landmines: `Math.random` in security-shaped paths; `getSession()` in server components; `service_role` outside expected paths; `unique_token` exposure in views or function bodies.
6. **Surface every drift as a finding, even cosmetic ones.** Stale comments are findings. Wrong README status is a finding. Missing postmortems are findings. Per CLAUDE.md quality rule #1, the chief does not downgrade — but the Reviewer also does not pre-emptively downgrade by leaving things out of the report. List everything.

A Reviewer that returns PASS without doing the above is a Reviewer that has failed the project. The Auditor agent prompt template (used end-of-phase) is the operational floor for Reviewer prompts.

## Two-reviewer rule on money-shaped surface

Any PR touching `inventory`, `trade_ledger`, `wallets`, `coin_ledger`, `item_editions`, `box_opens`, `box_open_commits`, `trade_ledger_pending_items`, RLS policies on those tables, or Edge Functions that mutate those tables requires **two independent Reviewer agents** (both Opus 4.7) before merge. They are dispatched in parallel with identical prompts; they do not see each other's reports until both have returned. If either returns FAIL, the PR is FAIL and the chief patches and re-runs both.

This is not "double-check." It is "no single agent's blind spot determines what ships to a money surface." Codex caught 3 P1 findings our internal Reviewer missed. CodeQL caught a `Math.random` our internal Reviewer missed. The deep-dive Auditor caught 8 things our internal Reviewer missed. The lesson: one Reviewer's read is not enough on this surface.

Two Reviewers on money surface. One Reviewer is fine on docs / CI / UI-only PRs.

## Backlog discipline

The single source of truth for known debt is [`docs/backlog.md`](docs/backlog.md). It has one section per status:

- **Blocked on external resource** — the only legitimate deferrals; each entry names the specific blocker (e.g., "needs staging Supabase project").
- **Carry-forward (waiting for upstream code)** — narrowly scoped: needs an Edge Function that doesn't exist yet, needs a drop table that isn't seeded yet. Each entry names the upstream condition.
- **Active** — actively being worked. Each entry has an owner.

No other documents track debt. No "Phase X.Y follow-up list" in PR bodies, no scattered TODOs in code, no "we'll come back to this" in commit messages. If it isn't in `backlog.md`, it doesn't get to exist.

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
