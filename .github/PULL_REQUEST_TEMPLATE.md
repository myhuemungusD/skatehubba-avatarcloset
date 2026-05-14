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

---

By opening this PR I confirm:
- All Reviewer findings have been addressed (no "PASS WITH NOTES" merges per `CLAUDE.md`)
- No commit in this PR ships with a known defect
