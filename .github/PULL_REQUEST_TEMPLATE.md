## Summary

<!-- 1–3 bullets. What changed and why. -->

## Surface touched

- [ ] `inventory`
- [ ] `trade_ledger`
- [ ] `wallets`
- [ ] `coin_ledger`
- [ ] `item_editions`
- [ ] `box_opens` / `box_open_commits`
- [ ] RLS policies
- [ ] Supabase Edge Function logic
- [ ] Frontend / UI only
- [ ] Docs / CI / infra only

## Charter compliance check

For each pillar this PR touches, confirm you're not violating it:

- [ ] Server-authoritative on money/inventory — no client-side writes added
- [ ] Append-only ledgers respected — no new UPDATE/DELETE paths on `coin_ledger` / `trade_ledger` / `box_opens` / `audit_log`
- [ ] No reprints — `item_editions.retired_at` semantics unchanged
- [ ] No item ↔ Hubba Coin trades between players
- [ ] Drop rates still match published `/odds` (if drop tables changed)
- [ ] No real-brand replicas (if assets added)
- [ ] No on-chain anything

(Tick "not applicable" inline if the PR doesn't touch a pillar.)

## Agent chain (per `docs/team.md` matrix)

For schema / trade / money-touching PRs, fill all four. For Chief-Engineer-direct or docs PRs, note "N/A".

- **Architect** (design): <!-- agent id, brief outcome -->
- **Implementer**: <!-- agent id -->
- **Reviewer** (verdict — PASS required, not PASS-WITH-NOTES): <!-- agent id, verdict -->
- **QA / dupe-bug harness** (mandatory if inventory / trade_ledger touched): <!-- agent id, outcome -->

## Test plan

- [ ] <!-- specific test step 1 -->
- [ ] <!-- specific test step 2 -->

## Risk notes

<!-- Anything a reviewer should look at twice. Trade-engine surface, RNG paths, RLS changes, migrations that can't be rolled back. -->

## Migration checklist (if this PR adds or modifies a Supabase migration)

- [ ] `packages/schema/src/db.ts` row mirror added/updated for any new or changed table
- [ ] `packages/schema/src/enums.ts` updated for any new Postgres enum
- [ ] `packages/schema/src/__tests__/enums.test.ts` updated to read the new migration file if enums changed
- [ ] All new trigger functions have `set search_path = public`
- [ ] All new tables have `ENABLE ROW LEVEL SECURITY`
- [ ] CI `charter-presence` job asserts the new migration file exists
- [ ] `docs/architecture.md` updated if the change affects a documented flow (trade / loot box / closet visit / auth)

## No carry-forwards

By opening this PR I confirm that **nothing identified during this PR's review has been deferred to a later phase, follow-up list, or comment**. Every defect, nit, drift, stale comment, missing test, missing doc, or hardening gap surfaced by the agent chain (Architect, Implementer, Reviewer, second Reviewer where required, or external automated reviewers like Codex / CodeQL) is fixed in this PR.

The only deferrals that are acceptable are entries on `docs/backlog.md` that are blocked on an external resource or upstream code that doesn't exist yet, and any such entry was already on `docs/backlog.md` before this PR's review started — not added during it.

---

By opening this PR I confirm:
- All Reviewer findings have been addressed (no "PASS WITH NOTES" merges per `CLAUDE.md`)
- No commit in this PR ships with a known defect
- Money-shaped surface changes ran TWO Reviewer agents in parallel per `CLAUDE.md` "Two-reviewer rule"
- All findings from agent chain AND external reviewers (Codex / CodeQL / Dependabot) are addressed in this PR, not deferred
