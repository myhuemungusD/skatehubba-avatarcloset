# Phase 0 postmortem — foundation

**Ended at:** commit `7f0d6c8` (merged into `main` as part of squash-merge `aba2dad`).

**Scope:** charter, hard rules, team operating model, schema (0001 + 0002), GitHub config (CODEOWNERS, dependabot, CI workflow, PR/issue templates, SECURITY.md).

## What worked

- **The charter survived first contact.** Writing CHARTER.md before any code meant every subsequent design call had a one-paragraph answer ready ("trades P2P forever, scarcity honored, no on-chain"). Several times during Phase 1, an Architect agent's design surfaced a real temptation (a coin-leg on trade_ledger as an "escrow" mechanism, an admin "unretire" for limited editions) and the charter killed each one in a sentence.
- **The schema was treated as load-bearing from day zero.** Two-belt serial uniqueness (atomic counter + UNIQUE constraint), append-only ledgers, RLS denying client writes by default, no-unretire trigger, trade-status transition trigger — all in 0001 before any app code existed. When Phase 1 scaffolding landed, there was no temptation to "write the trade engine in app code first and add the DB invariants later."
- **The PR template made charter-pillar checks routine.** Every PR has to fill out the pillar checklist; the checkboxes act as a tripwire when a contributor (human or agent) is about to drift.
- **CI grep guards bound the rules to code.** `hard-rule-grep` job runs on every PR — on-chain libs, retired_at unset, trade-ledger coin-leg all fail the build, not the reviewer.

## What didn't

- **Phase 0 did not use the agent chain.** I (Chief) wrote the charter, the schema, the docs, and the GitHub config in one straight shot. The very rules I put in CLAUDE.md ("Architect designs before Implementer codes", "Reviewer-agent pass before merge") were not applied to writing those rules themselves. The first independent audit (a session-internal check after Phase 0 was "done") caught **7 real schema-level defects** — unique_token leaked via RLS, box_opens seed-reveal had no trigger guard, the architecture doc described a two-step commit flow that the box_opens schema couldn't actually support, no partial UNIQUE on pending trades, append-only enforcement gaps, no wallets/closets provisioning trigger, coin_ledger allowed amount = 0. Each one was a real defect that an Architect → Implementer → Reviewer chain would have caught.
- **The schema and the architecture doc weren't cross-checked.** CLAUDE.md and architecture.md described a commit-reveal flow and a seed-reveal trigger that the schema didn't implement. I wrote both in the same pass and never read them against each other. A Reviewer reading both docs catches this in 30 seconds.
- **No postmortem the first time.** team.md says "each phase ends with a written postmortem in docs/postmortems/phase-N.md before the next phase begins." We did not. This file exists because the deep-dive audit at the end of Phase 1.5 caught the omission. Process drift on a non-negotiable operating rule.
- **The Quality bar wasn't yet written.** The "no PASS-WITH-NOTES merges" rule and the "defense-in-depth is welcome on load-bearing surface" rule both came in *during* Phase 0 fix-up after the audit. They should have been Phase 0 day-zero rules. If they had been, the first round of Reviewer findings (which I downgraded as "Phase 1.6 cleanup") would have been fixed immediately.

## What we'd do differently

1. **Run the full agent chain even on the founding work.** The Chief doesn't write the schema; the Chief commissions an Architect to design it and a Reviewer to verify. The "I wrote the rules so I get to be exempt" instinct is exactly the failure mode the rules exist to prevent.
2. **Write the Quality bar before any code lands.** "No PASS-WITH-NOTES" and "defense-in-depth on load-bearing surface" are not Phase 1 lessons — they're day-zero principles. Put them in CLAUDE.md before the first migration.
3. **Cross-check every doc against every other doc and against the schema before any merge.** A 15-minute reading pass would have caught the box_opens commit-reveal mismatch before it became a finding.
4. **Set up the postmortem template at the same time as the team.md rule.** Empty docs/postmortems/phase-0.md.template living in the repo at Phase 0 day one would have made it impossible to forget.

## Carry-forward into Phase 1+

- The 7 audit findings became `0002_audit_fixes.sql` (229 lines, one HIGH-impact fix: the closet view leak; one CRITICAL surface: the box_opens immutability trigger).
- Three later Reviewer nits + three Codex (external) review findings on the same migration set produced `0003_codex_fixes.sql` (156 lines). The single-pending-trade-per-inventory invariant we documented in Phase 0 was not actually enforced by the schema until 0003.
- This iteration cost time. The fix is structural: agent chain on every PR, including Chief's own work.
