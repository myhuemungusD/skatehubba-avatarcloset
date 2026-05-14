# Backlog

Single source of truth for known debt. The only place tech debt is allowed to live. Per `CLAUDE.md` "no `we'll come back to it`" rule, every entry below is either blocked on an external resource we cannot satisfy from the repo, or it is waiting for upstream code that hasn't been written yet. If it's neither, it should be in a PR, not here.

When an item moves to "Active," it gets an owner and a target PR. When it lands, it gets removed from this file in the same commit.

---

## Blocked on external resource

Items that genuinely cannot be done without something the human owner has to provide.

### `OAUTH-GOOGLE` — Google Sign-In provider

- **What:** Wire `@supabase/ssr` Google OAuth provider to the auth flow.
- **Blocker:** Need a Google Cloud OAuth client ID + secret provisioned by the owner; needs to be added to Supabase project Auth settings.
- **Where it lands:** New `/auth/google` callback handler, header sign-in button, Supabase dashboard config.
- **Why it's not a free fix:** OAuth provider keys are owner-bound credentials — no agent can request them.

### `OAUTH-DISCORD` — Discord Sign-In provider

- **What:** Same shape as `OAUTH-GOOGLE`, for Discord.
- **Blocker:** Discord developer app + client ID + secret from the owner.

### `EMAIL-PROD-SMTP` — Production email delivery

- **What:** Replace Supabase's dev SMTP with a real provider (Resend, SES, or Postmark) for signup confirms, password resets, and future transactional mail.
- **Blocker:** Owner needs to sign up for a transactional-email service and provide the API key + verified sending domain.
- **Why it matters:** Supabase dev SMTP works for local development but is rate-limited and unbranded in production. Users won't see "no-reply@skatehubba.io" until this is wired.

### `STAGING-SUPABASE` — Staging Supabase project for e2e CI

- **What:** Provision a dedicated Supabase project for end-to-end test runs, add `SUPABASE_TEST_URL` and `SUPABASE_TEST_SERVICE_ROLE_KEY` as GitHub repository secrets, un-skip the Playwright auth golden-path spec in CI.
- **Blocker:** Owner needs to create the Supabase project and add the two secrets. The `auth.admin.createUser({ email_confirm: true })` path the spec uses requires the service-role key.
- **Where it lands:** `.github/workflows/ci.yml` gets a new `e2e` job; `apps/web/e2e/auth-golden-path.spec.ts` skip guard remains in place but secrets being set makes it actually run.

---

## Carry-forward (waiting for upstream code)

Items that depend on code that hasn't been written yet. Each one names the upstream gate.

### `DUPE-HARNESS` — QA dupe-bug stress harness

- **What:** Concurrent trade fuzzer that hammers the trade Edge Function under SERIALIZABLE isolation and asserts no row ever splits, no row ever appears in two trades, no row ever loses ownership, ledger sums always reconcile.
- **Upstream gate:** First Edge Function that mutates `inventory` or `trade_ledger` must exist before there's anything to harness. None exists yet.
- **Mandatory:** Per `CLAUDE.md` hard rule, this harness must pass for any PR touching those tables. Since no such PR exists yet, the harness has nothing to gate. It becomes mandatory the moment the first trade Edge Function lands.

### `ODDS-PARITY-CI` — `/odds` page parity check in CI

- **What:** CI job that reads `supabase/seed/loot_box_drop_tables.csv` (or equivalent), reads the rendered `/odds` page, and fails the build if published rates drift from DB seed rows.
- **Upstream gate:** Need a seeded `loot_box_drop_tables` and the `/odds` page rendered from it. Neither exists yet — Phase 2 work.
- **Where it lands:** `.github/workflows/ci.yml` gets a `drop-rate-parity` job (currently a commented stub at the bottom of the file).

---

## Active

(empty)

---

## How to use this file

- **Never write "Phase X follow-up" in a PR description.** That kind of debt evaporates. If it's real, it goes here. If it's not real, it doesn't exist.
- **An entry leaves "Blocked" only when the human owner provides the missing resource.** The chief doesn't move entries silently.
- **An entry leaves "Carry-forward" only when the upstream gate lands.** The PR that lands the gate also lands the unblocked work, OR the next PR after it.
- **No deferrals from a Reviewer finding ever land here.** Reviewer findings get fixed in the PR they were found on. This file is for work that wasn't on any PR's plate.
