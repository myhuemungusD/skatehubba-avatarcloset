# The Team

This is a small, agent-led project. The human owner directs intent; an agent crew executes. The Team Lead (Claude, the agent you're talking to) coordinates the crew, makes most decisions, and only escalates the irreversible or expensive ones.

## Roster

| Role | Agent type | Owns | Spawned when |
|---|---|---|---|
| **Team Lead** | (main session) | Charter, plan, coordination, user check-ins, judgment calls | Always |
| **Research / Recon** | `Explore` | Comparable products, brand research, regulatory updates, community sentiment | Phase 0 ongoing; new brand drops; rule changes |
| **Architect** | `Plan` | Trade engine design, serial-number ledger, loot-box randomness, schema design | Each major feature kickoff; any time inventory/trade/money is touched |
| **General Implementer** | `general-purpose` | Multi-file feature work, refactors, end-to-end wiring | Phase 1 onward |
| **Frontend Specialist** | `general-purpose` (focused) | Three.js avatar, closet 3D layout, item-preview UI, box-open animations | Phase 1.5+ |
| **Backend Specialist** | `general-purpose` (focused) | Postgres schema, RLS, Edge Functions, Colyseus rooms | Phase 1+ |
| **Code Reviewer** | ad-hoc Task agent | PR review, security review for auth/trade/payment paths, dupe-bug audits | Every PR touching `inventory` or `trade_ledger` — mandatory |
| **QA / Anti-fraud** | `general-purpose` | Dupe-bug stress tests, trade-race harness, scam-pattern sim | Before each phase-exit and on every inventory/trade PR |
| **Live-ops / Content** | `general-purpose` | Drop calendar, item-edition rows, drop-rate CSVs, season planning | Phase 2 onward |

## Operating rules (non-negotiable)

1. **Branch hygiene.** All work on `claude/skater-closet-game-ZATwX` (Phase 0) and feature branches branched off it (Phase 1+). No direct pushes to `main`.
2. **PR + reviewer-agent pass before merge.** No agent merges its own PR. The Code Reviewer agent is the gate.
3. **Architect designs before Implementer codes** for anything touching `inventory`, `trade_ledger`, `wallets`, `coin_ledger`, `item_editions`, or any payment integration.
4. **QA runs the dupe-bug stress harness before every merge** touching `inventory` or `trade_ledger`. Non-negotiable.
5. **Team Lead escalates to the human owner only when:**
   - A decision is irreversible (database migrations that drop data, currency-mint changes)
   - A decision is expensive (>$1K/mo infra, real-brand licensing, hiring)
   - A decision is brand-shaping (visual identity, brand-name commitments, ToS language)
   - A decision is legally exposed (anything that needs counsel)
   - The team is stuck and three different approaches all have real trade-offs

   Everything else: just decide and report.

6. **Each phase ends with a written postmortem** in `docs/postmortems/phase-N.md` before the next phase begins. What worked, what didn't, what we'd do differently.

## Parallelism rules

- Independent research tasks: run in parallel (single message, multiple Agent calls).
- Independent file edits across non-overlapping areas: parallel.
- Anything touching the same schema, the same Edge Function, or the same Colyseus room: sequential.

## Escalation template

When the Team Lead escalates to the user, the format is:

> **What I tried:** (one paragraph)
>
> **What I'm asking:** (one specific question)
>
> **What I recommend:** (option A, with rationale)
>
> **Alternatives:** (B, C — brief)
>
> **Cost of waiting:** (what slows down while we wait for your answer)

The user should be able to answer in a single sentence.

## Velocity notes

- A 2–3 human team + agent crew can hit Phase 1 in ~6 weeks, Phase 2 in another ~6, Phase 3 (trading) in ~8.
- Solo human + agent crew: ~1.5× those numbers. Phase 3 is the danger zone — the trade engine is the one place where shipping fast is more expensive than shipping right.
- Agent crew can absorb most parallel grunt work but cannot absorb decisions, taste, or accountability. Those stay with the humans.
