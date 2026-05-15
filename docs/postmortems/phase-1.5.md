# Phase 1.5 postmortem — Supabase Auth + identity wiring

**Shipped as:** PR #5 (squash-merged to `main` as `85e4076`). 6 commits, 23 files (+905/−13 lines).

**Scope:** Email + password sign-up / sign-in / sign-out, server-side session refresh via `@supabase/ssr` middleware, `/closet/me` redirect, real `/closet/<username>` page (replacing the Phase 1 stub), auth-aware `<Header>` + `<UserMenu>`, lazy env validation via Proxy (forced by Next 15.5+ build-time static analysis), CI-gated Playwright e2e for the signup → sign-in golden path.

## What worked

- **The Architect's "no pre-flight username check" call was right.** Trusting `handle_new_user`'s collision-retry instead of adding a TOCTOU-prone availability lookup eliminated both an enumeration probe surface and a real race. The trigger arbitrates; the UI shows the assigned handle. Simple.
- **Server actions over route handlers for auth submits paid off.** The `(prev, formData) → {error} | redirect()` shape is consistent across signup / signin / signout / forgot-password / reset-password / change-username. Reviewers can grok one pattern and pattern-match every action.
- **The `@supabase/ssr` 0.5.x middleware landmine was caught in the design.** "No code between `createServerClient` and `getUser()`" was in the Architect's design doc verbatim. Every Reviewer that ran on Phase 1.5 grepped for compliance. Zero drift on that surface.
- **`getCurrentUser()` as the single composed helper.** One call site reads `auth.getUser()` + `users` select; Header and Closet pages and the `/closet/me` redirect all share it. No duplicated session-fetch logic.
- **The closet page's owner/visitor branching shipped right.** Owner reads `inventory` (RLS `inventory_self_read`); visitor reads `public_closet_inventory` view (which 0003 then hardened to JOIN against `closets.is_public`). No mixing. No leak.

## What didn't

- **Phase 1.5 didn't get a postmortem on time.** This file is being written retroactively at the end of Phase 1.6, exactly as Phase 1's postmortem warned might happen. The team.md operating rule #6 fires before the *next* phase starts; the Phase 1.6 sweep itself was the next phase. By the time the Phase 1.6 deep-dive audit caught this, we'd already opened PR #6. **Same process drift the Phase 1 postmortem explicitly identified.** The fix is to write the postmortem at PR-time, not phase-N+1-audit-time.
- **The Implementer's report said "pnpm install no-op, no lockfile churn" — and that was true at the time — but the broader Phase 1.6 sweep that immediately followed had to bump Next 15.0.3 → 15.5.16 to close 25 Dependabot advisories, which surfaced a real Next 15.5 build-time eager-env-validation regression on `lib/env.ts`.** The lesson isn't "lock the Next version" (we can't avoid security bumps). It's that any `pnpm install` that pulls a new major.minor of a load-bearing framework needs `pnpm build` in the gate, not just `lint + typecheck + test`. That gate was added in Phase 1.6.
- **`SUPABASE_TEST_URL` + `SUPABASE_TEST_SERVICE_ROLE_KEY` deferred to Phase 1.6 follow-up.** The e2e Playwright spec lands in this PR but is skipped without those staging secrets. We documented this as `STAGING-SUPABASE` in `docs/backlog.md` only at end of Phase 1.6 — should have been in a backlog file day zero. Phase 1.6 created `docs/backlog.md`; Phase 1.5 wrote follow-up items into the PR body, which is exactly the anti-pattern the new backlog discipline rule forbids.
- **The `username_changed_at` column didn't exist at Phase 1.5 ship time.** `handle_new_user` doesn't set it. The cooldown UX shipped in Phase 1.6 had to depend on a Phase 1.5 trigger that never imagined username changes. Forward-design would have been to add the column in 0002 (the audit-fix migration that already touched `users`); we didn't, because Phase 1.5 hadn't yet identified username-change as a Phase 1.6 deliverable. Hindsight: when adding a SECURITY DEFINER trigger that writes a row, think one step ahead about what columns that row might need.

## What we'd do differently

1. **Write postmortems at PR-time.** The phase doesn't "end" at merge — the postmortem is part of the merge. Same standard as the PR template's no-carry-forward assertion: if it isn't in the PR, it doesn't exist.
2. **`pnpm build` is part of "all gates green" for any PR that touches `package.json` deps.** Lint + typecheck + test catch most things; build catches Next.js-specific landmines (`'use server'` constraints, static-analysis-of-route-handlers, env eager-eval). The Phase 1.6 sweep retrofitted this realization; it should have been baseline by Phase 1.5.
3. **Audit columns up-front when adding identity surface.** `username_changed_at` was an obvious need once we admitted username changes were on the table. `email_changed_at` will be similarly obvious when the email-change UX lands. Plan for these in the migration that introduces the table, not the one that adds the UX.

## Carry-forward into Phase 1.6 (all closed by Phase 1.6 shipping)

- `0005_constraint_hardening.sql` added `username_changed_at` and the citext + lowercase-CHECK pair.
- `0006_handle_new_user_lowercase.sql` defensively lowercases username metadata inside the trigger.
- Password reset flow + `/account` page + 30-day cooldown shipped.
- 28 of 30 Dependabot advisories closed; remaining 2 documented in `docs/backlog.md` with named upstream gates.
- Open-redirect allowlists on sign-in and callback with unit-test coverage.
- `docs/backlog.md` created as single source of truth for tracked debt.
