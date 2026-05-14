# Design System — SkateHubba Avatar Closet (MVP / Phase 1)

> **Scope:** MVP lock per `docs/architecture.md:178-187` — 30 preset cosmetics, 3 base meshes, earned commit-reveal boxes, local closet only, responsive web.
>
> Phase 2+ surfaces (paid coin top-up, age gate, spend caps, BE/NL region block, live-presence avatar bubbles, 3D walk-shop minimap, deterministic numbered shop drops, drop calendar, trade UI) are **explicitly out of scope** here and listed only as deferred stubs in Part III §D.

Three foundational rules apply to every screen and component in this document and are not repeated screen-by-screen:

1. **Server-authoritative mutations only.** Equip, open-box, claim-bonus, and rename all flow through Edge Functions; the UI shows optimistic state but cannot mutate `inventory`, `wallets`, `coin_ledger`, `item_editions`, or `box_opens` directly (`CLAUDE.md` rule 1; `0001_init.sql:388-406`).
2. **Owner-vs-visitor separation is enforced at the data layer.** UI must never request fields RLS would refuse. Visitor-facing reads of inventory go through `public_closet_inventory` (`0002_audit_fixes.sql:183-194`).
3. **`/odds` is generated, not authored.** Any rate quoted in copy must read from `loot_box_drop_tables` so the CI parity check (`CHARTER.md:65`) holds.

---

# Part I — Tokens

## 1. Color tokens

All colors live in the **Concrete Glass** palette. Roles are locked; the lime is the **app UI accent**, NOT the Hubba house clothing brand (see "Critical color resolution" below).

| Token | Hex | Role | Contrast vs. bg | WCAG |
|---|---|---|---|---|
| `bg.asphalt` | `#0B0B0D` | App background, hero canvas | — | — |
| `bg.griptape` | `#141416` | Cards, panels (raised one step) | 1.16:1 vs. asphalt | decorative |
| `bg.concrete` | `#2B2B2F` | Inputs, dividers, second-step raised | 2.45:1 vs. asphalt | decorative |
| `bg.faded-metal` | `#8C8C91` | Disabled fills, scrubber tracks | 5.84:1 vs. asphalt | text-AA only at ≥16px medium |
| `accent.primary` | `#B7FF2A` | App UI accent — CTAs, focus rings, "DROP LIVE" stamp | 16.7:1 vs. asphalt | AAA |
| `status.warning` | `#FF7A1A` | "Sold Out soon", pity timer warm, low coin | 7.4:1 vs. asphalt | AA |
| `status.drop` | `#FF2E2E` | Error, validation fail, "Retired" badge stripe | 5.2:1 vs. asphalt | AA |
| `status.verified` | `#36A3FF` | Verified-creator tick, provably-fair "verified" state | 6.1:1 vs. asphalt | AA |
| `currency.coin` | `#FFC83D` | Hubba Coin glyph and balance number only | 11.9:1 vs. asphalt | AAA |
| `text.primary` | `#F5F5F7` | Body, primary copy | 18.9:1 vs. asphalt | AAA |
| `text.secondary` | `#B6B6BC` | Sub-copy, metadata at 12–14px | 10.9:1 vs. asphalt | AAA |
| `text.tertiary` | `#8C8C91` | Hint, low-emphasis label, ≥16px medium only | 5.84:1 vs. asphalt | AA (size-gated) |
| `text.disabled` | `#5D5D63` | Disabled label only — not for live text | 2.74:1 vs. asphalt | fail (intentional) |

### Critical color resolution — `accent.primary` is not a brand color

`docs/brand-bible.md:14` defines the Hubba house clothing brand color as placeholder deep red `#a51c1c`. The `#B7FF2A` lime is the **app UI accent only**. It is named `accent.primary` (or, in plain-English brand-style writing, "SkateHubba Lime") and **never** "Hubba Green," because that would collide with the in-game clothing brand. The brand bible remains source of truth for the Hubba clothing brand color; this design system never overrides it. When a Hubba house item is rendered (T-shirt, hoodie, beanie, blank deck — see `brand-bible.md:13`), it uses the `#a51c1c` placeholder, **not** `accent.primary`.

### Accessibility resolution — Faded Metal `#8C8C91`

`#8C8C91` on `#0B0B0D` measures 5.84:1, which passes WCAG AA for normal text (4.5:1) but is uncomfortable at the 12–14px metadata sizes the closet uses heavily (serial numbers, edition counts, "minted at" stamps).

**Decision (locked):** `text.tertiary` (`#8C8C91`) is allowed for text **only when both** conditions hold:
- Size ≥ 16px, AND
- Weight ≥ 500 (medium)

At 12–14px metadata sizes, use `text.secondary` (`#B6B6BC`, ~10.9:1 contrast) instead. This is enforced in component tokens: `SerialBadge` and metadata captions in `SkateCard` resolve their text color to `text.secondary`, not `text.tertiary`.

All other text-on-bg pairs in the table pass AA at normal-text thresholds. The only intentional fail is `text.disabled` (`#5D5D63`, 2.74:1) — disabled text is supposed to look disabled and is paired with `aria-disabled` and a non-color affordance (reduced opacity envelope and ghosted icon).

## 2. Typography

### Body / UI font — **Inter**

Fallback: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
Licensing: SIL Open Font License (free). Self-hosted via `next/font/google` with `display: swap`.

### Display font — recommendation: **Druk Wide Bold**

Used **only** for: hero titles, screen titles, "CLAIMED" / "DROP LIVE" / "SOLD OUT" / "RETIRED" stamps, serial reveal numbers. **Never body.**

| Candidate | Why | Why not | License path |
|---|---|---|---|
| **Druk Wide Bold** *(recommend)* | Mag-cover heft; reads as skate-zine without copying any specific brand wordmark; condensed/wide weights cover stamps + headlines | Commercial license (~$200 per weight self-host, or via Adobe Fonts) | Commercial Production License from Commercial Type; or Adobe Fonts subscription |
| ITC Anton | Free via Google Fonts, ultra-condensed display look | Reads more "fashion editorial" than "skate culture"; over-used in 2020–2023 design | Google Fonts (free, OFL) |
| Industry Inc Wide | Strong industrial vibe, character set works for stamps | Costs more than Druk for less daily-driver versatility | Fort Foundry one-time license |

**Recommendation:** Druk Wide Bold (Commercial Type, self-host). Budget fallback: ITC Anton from Google Fonts — accept the visual cost and document it as a known PMF-time fix. "Slight grunge texture, tbd" is explicitly rejected as a non-spec.

Display fallback stack: `"Druk Wide", "Anton", "Impact", "Haettenschweiler", sans-serif`.

### Type scale

| Step | Size | Weight | Font | Use |
|---|---|---|---|---|
| `display.hero` | 64px / 1.0 | 900 | Druk Wide | Closet hero title, box-open reveal headline |
| `display.screen` | 40px / 1.05 | 800 | Druk Wide | Screen titles (Closet, Boxes, /odds) |
| `display.stamp` | 28px / 1.0 | 800 | Druk Wide | "CLAIMED" / "DROP LIVE" / "SOLD OUT" / "RETIRED" overlay |
| `text.section` | 20px / 1.3 | 600 | Inter | Section titles inside a screen |
| `text.body` | 16px / 1.5 | 400 | Inter | Body copy, descriptions |
| `text.ui` | 14px / 1.45 | 500 | Inter | Button labels, tab labels, item names in dense grids |
| `text.meta` | 12px / 1.4 | 500 | Inter | Serial numbers, edition counts, "minted at" timestamps |
| `text.legal` | 11px / 1.4 | 400 | Inter | ESRB/PEGI line, /odds disclaimer, ToS link |

## 3. Spacing scale

Base-4 with a powers-of-two backbone.

| Token | Value | Use |
|---|---|---|
| `space.xs` | 4px | Icon-to-label gap, badge inner padding |
| `space.s` | 8px | Tight grouping (label + meta) |
| `space.m` | 12px | Card inner padding (compact), input vertical padding |
| `space.l` | 16px | Default card padding, list item gap |
| `space.xl` | 24px | Section gap inside a screen |
| `space.2xl` | 32px | Major section break |
| `space.3xl` | 48px | Hero block padding |
| `space.4xl` | 64px | Page top breathing room above fold |

## 4. Radius scale

| Token | Value | Use |
|---|---|---|
| `radius.xs` | 4px | Sticker corners (small), inline tag chips |
| `radius.s` | 8px | Inputs, `SerialBadge`, `RarityBadge` |
| `radius.m` | 12px | `SkateCard`, item tile, `OddsTableRow` row group |
| `radius.l` | 16px | Modals, bottom sheets, `ProvablyFairTranscript` panel |
| `radius.xl` | 24px | Box-open reveal card, hero panel |
| `radius.full` | 9999px | `CoinBalancePill`, `ReactionButton`, `DropStatusBadge` pills |

**Sticker corner rule:** the "sticker corner" pattern (a rotated decal placed at a card corner) uses `radius.xs` clipping on the sticker asset itself, and the card it sits on uses `radius.m`. Never `radius.full` for stickers — they should read as die-cut rectangles, not buttons.

## 5. Z-index scale

Locked numeric values. If something needs to break this scale, it needs a new named token, not a magic number.

| Layer | Value | Use |
|---|---|---|
| `z.base` | 0 | Default flow |
| `z.sticker` | 10 | Sticker / decal overlays on cards |
| `z.glass` | 100 | Concrete-glass panels above the closet 3D canvas |
| `z.hud` | 200 | `CountdownHUD` during box-open reveal |
| `z.sheet` | 1000 | Bottom sheets, side drawers |
| `z.modal` | 1100 | Modal dialogs (e.g., `SafetyNotice` confirm, /odds expand) |
| `z.toast` | 1200 | Transient toasts, "copied serial" |

## 6. Motion timing scale

Locked. Reduce Motion shortens durations and removes parallax, but it does **not** relax the box-open animation rule below.

| Token | ms | Use |
|---|---|---|
| `motion.xs` | 100 | Reaction tap stamp, button press |
| `motion.s` | 200 | Snap-to-grid, segmented control glide, `SerialBadge` count-up start |
| `motion.m` | 350 | Equip change on avatar, card flip, modal open |
| `motion.l` | 600 | Closet hero entry transition (MVP equivalent of the Phase 2 shop-entry beat) |
| `motion.xl` | 900 | Reserved for box-open arcade unlock sequence |

### Hard rule — box-open animation is arcade-unlock, never gambling-coded

Boxes ARE random (commit-reveal, `architecture.md:86-118`), and that is a **regulatory** surface. The animation must not look like gambling. Locked rule:

- **NOT permitted:** slot-machine reels, scratch-off reveal, spin-the-wheel, pull-to-reveal, three-card-monte flip, near-miss-then-snap-back, deceleration tension on the final result.
- **Permitted:** an arcade unlock — the box sits, a `CountdownHUD` ticks the commit/reveal beats (commit hash → seeds in → outcome stamp), the lid lifts in one motion at `motion.xl`, the item rises to center on `motion.l`, the rarity stamp lands on `motion.s`. The motion is celebratory, not suspenseful-then-released.
- **Reduce Motion path:** durations collapse to `motion.xs` and the lid-lift becomes a crossfade. The rule is unchanged. Reduce Motion exempts the player from the motion, not the regulatory rule from the product.

This is enforced as a rule, not a preference, because the boxes are random and the animation IS the regulatory signal.

## 7. Iconography

- **Family:** **Phosphor Icons** (recommended over Lucide and Tabler).
  - Phosphor ships line, fill, duotone, and bold weights in a single coherent grid — useful when a `ReactionButton` swaps line → fill on press.
  - Lucide is solid but line-only and reads quieter than the skate-arcade tone.
  - Tabler is dense but stroke weight reads thin against Asphalt and Grip Tape.
- **Grid:** 24×24 viewbox, optical alignment on 20px optical square.
- **Stroke weight:** 1.5px line variant for default, 2px for bold/emphasis (CTA icons).
- **Filled vs. line rule:** line by default; filled only for active/pressed states and for the three `ReactionButton` icons in their "stamped" state.
- **Naming:** `icon.<noun>.<variant>` — e.g., `icon.fire.line`, `icon.fire.fill`, `icon.respect.line`. No verbs in icon names; verbs live in component names.

## 8. Sticker / decal asset spec

- **Format:** SVG preferred for vector marks. Raster fallback (PNG) at 2x and 3x for textured stickers that need printed grain.
- **Max dimensions for sticker-corner usage:** 64×64 logical pixels (renders 128 / 192 at 2x / 3x). Larger decals (e.g., deck wall art) are not stickers — they are `texture` assets and live in the avatar/closet asset pipeline.
- **Rotation:** stickers may rotate ±15° max. Anything beyond is decorative, not a sticker per spec.
- **License posture (locked, per `docs/brand-bible.md:60-64` and `CLAUDE.md:12`):** **no real-brand sticker replicas.** Every sticker must originate from the five MVP fictional brands: Hubba, Thrashr, Polestar Decks, Suprmthing, and the fifth vulc-shoe brand (`brand-bible.md:44-49` notes "Vanz" is a working name flagged for rename to Trakz / Sole Co. / Vulkn — the actual sticker assets must wait on the rename before shipping). Stickers that **read** like real-brand stickers re-introduce the IP risk the charter blocks under pillar #2 ("Authenticity over breadth") and the risk register's IP/brand-replica item (`CHARTER.md:77`).
- **Counsel review (per `brand-bible.md:74-82`):** every sticker mark requires the brand asset checklist completed — original wordmark, original brand mark, palette, fictional history, and counsel sign-off — **before** the sticker can land in `item_templates`.

## 9. Avatar render spec — MVP only

Per `architecture.md:179`: 30 preset cosmetics across 3 base meshes.

| Property | Value | Rationale |
|---|---|---|
| Base mesh polygon budget | ≤ 12,000 tris / mesh | Three meshes × ~12K keeps an open-closet scene under 80K tris with 6 visible avatars in Phase 2 |
| Per-cosmetic polygon budget | ≤ 2,500 tris | 30 cosmetics × 2.5K = headroom under closet props |
| Texture resolution (base mesh) | 1024×1024 albedo + 512×512 normal | Mobile-survivable, still readable in editor preview |
| Texture resolution (cosmetic) | 512×512 albedo + 256×256 normal | Closet thumbnail still legible |
| Texture compression | KTX2 / BasisU | Web-friendly, smaller download than PNG |
| Renderer | Three.js + R3F (`architecture.md:9`), WebGPU primary | Per the stack-at-a-glance table |
| Mobile fallback | WebGL2 path with reduced shadows and 1× pixel ratio | If `navigator.gpu` is missing or fails feature detection |
| Lighting | One key (directional), one fill (ambient/hemisphere), one rim (directional) | "Three-point lite" — closet feels lit, not over-rendered |
| Shadows | Soft shadow (PCFSoftShadowMap) at 1024 shadow map on key only | Mobile keeps shadows on, but lower map size |

### Viewport aspect ratios

| Surface | Aspect | Resolution target | Notes |
|---|---|---|---|
| Closet hero (above the fold) | 16:9 | 1920×1080 max, responsive down to 9:16 | Three-quarter framing on avatar |
| Closet editor preview | 3:4 | 768×1024 | Tighter framing, full body visible |
| Item-card thumbnail | 1:1 | 512×512 | Item floats on `bg.griptape` with sticker-corner accent |
| Share preview OG image | 1.91:1 | 1200×630 (Open Graph standard) | Server-rendered snapshot from `GET /api/closets/:username/snapshot.json` per `architecture.md:155` |

---

# Part II — Components

Every component below is **in MVP scope**. Phase 2+ components — paid-coin top-up sheet, age gate, spend cap settings, region block notice, live-presence avatar bubbles, 3D walk-shop minimap, trade UI — are **not defined here**.

## `SkateCard`

- **Role:** generic card surface for items, boxes, drops, profile blocks.
- **States:** `default` / `pressed` / `owned` / `equipped` / `locked` / source-label `earned` vs `bought` (MVP is `earned` only — `bought` token exists but renders never until Phase 2).
- **Conceptual props:** `surface` (asphalt / griptape / concrete), `state`, `radius` (default `radius.m`), `sticker?`, `source` (`earned` | `bought`).
- **Motion:** `motion.xs` on press, `motion.s` on state transitions.
- **A11y:** card is `<button>` when interactive, `<article>` when read-only. Screen-reader label format: *"`{item name}`, `{rarity}`, `{state}`. `{serial if numbered}`. Earned. Activate to view details."*
- **Used in:** closet grid, item details modal, box detail, /odds row preview.

## `SerialBadge`

- **Role:** displays `#0042 / 250` formatted serial-of-supply for numbered items.
- **States:** `default` (minted / total) / `sold-out` (`next_serial > total_supply`) / `retired` (`retired_at IS NOT NULL`, per `0001_init.sql:170-181`).
- **Conceptual props:** `serial`, `totalSupply`, `editionState` (`active` | `sold-out` | `retired`).
- **Motion:** `motion.s` count-up on first reveal (after box-open transcript completes); no looping.
- **A11y:** *"Serial number `{serial}` of `{totalSupply}`. Edition `{active | sold out | retired}`."*
- **Used in:** `SkateCard` for numbered items, box-open reveal, item detail header, `OddsTableRow` when the row is for a numbered Mythic.

## `DropStatusBadge`

- **Role:** the lifecycle status of a numbered edition. Source of truth: `item_editions.next_serial` vs `total_supply` and `item_editions.retired_at` (`0001_init.sql:145-181`).
- **States — MVP:**

| State | Condition | Label | Visual |
|---|---|---|---|
| `unlimited` | `total_supply IS NULL` (Hubba house standards) | "ALWAYS IN STOCK" | no ring, neutral chip |
| `open` | `total_supply IS NOT NULL` AND `next_serial <= total_supply` AND `retired_at IS NULL` | "OPEN RUN — N OF TOTAL MINTED" | `accent.primary` ring |
| `closing` | `next_serial >= total_supply * 0.9` AND not retired | "CLOSING SOON — UNDER 10% REMAIN" | `status.warning` ring |
| `sold-out` | `next_serial > total_supply` AND `retired_at IS NULL` | "SOLD OUT — AWAITING RETIREMENT" | `status.drop` outline, ghosted icon, line-through glyph |
| `retired` | `retired_at IS NOT NULL` (permanent per trigger `0001_init.sql:170-181`; `CHARTER.md` pillar 5) | "RETIRED — NEVER REPRINTED" | `status.drop` solid with diagonal stripe overlay, lock glyph |
| `owned` | viewer owns ≥1 of this edition | "OWNED" | `status.verified` fill, check glyph |

- **States — deferred to Phase 2** (do not implement at MVP): `upcoming` (pre-drop event), `live` (active shop drop). These attach to Phase 2 numbered shop drops; MVP has no event-style drops, so neither state renders.
- **Color is never the only status carrier.** Every state pairs color + glyph + literal label.
- **Wire copy notes:**
  - "Retired" appears on owner-facing inventory cards on retired-edition items and is the highest-prestige label in the system. Never use "Retired" for a sold-out-but-not-yet-retired state — `retired_at` is the only signal.
  - "Sold out — awaiting retirement" is a brief, transient state. UI does not promise it will flip; live ops retires the edition row when the run is fully minted.
  - Empty/loading: render the chip skeleton, not "Unknown" copy.
- **Conceptual props:** `state`, `compact?` (pill vs. stamp).
- **Motion:** `motion.s` on state change.
- **A11y:** *"Drop status: `{label}`."* For `retired`: *"Drop status: retired. This edition is permanently retired and never reprinted."*

## `RarityBadge`

- **Role:** rarity tier per `economy.md:54-59`.
- **Locked colors per tier:**

| Tier | Token | Hex |
|---|---|---|
| Common | `rarity.common` | `#8C8C91` (Faded Metal — ≥16px medium required per §1) |
| Uncommon | `rarity.uncommon` | `#36A3FF` (status.verified — "above baseline") |
| Rare | `rarity.rare` | `#B7FF2A` (accent.primary — "the lime hit") |
| Epic | `rarity.epic` | `#FF7A1A` (status.warning — "heat") |
| Mythic | `rarity.mythic` | `#FFC83D` (currency.coin — "gold tier") |

- **Numbered Mythic rule:** when the item is numbered (every Mythic at MVP is numbered per `economy.md:59`), `RarityBadge` renders **inline** with `SerialBadge` on the right edge — a single row reading `MYTHIC · #0042 / 250`.
- **Conceptual props:** `tier`, `inlineSerial?`.
- **Motion:** `motion.xs` enter animation on first paint.
- **A11y:** *"Rarity: `{tier}`."* If `inlineSerial`: *"Rarity: Mythic. Serial number `{serial}` of `{totalSupply}`."*

## `ReactionButton`

- **Role:** the three closet reactions matching `closet_reactions.kind` enum at `0001_init.sql:360`: `fire`, `respect`, `want`.
- **States:** `default` / `pressed-stamped` / `count-updated` / `already-reacted` (server returned dup).
- **Conceptual props:** `kind` (`fire` | `respect` | `want`), `count`, `iReacted`.
- **Motion:** `motion.xs` arcade number pop on count update. **No confetti.** No particle bursts. The pop is a single number scale (1.0 → 1.18 → 1.0) over `motion.xs`.
- **A11y:** *"`{kind}` reaction, `{count}` total. `{You reacted. | Tap to react.}`"* `aria-pressed` reflects `iReacted`. Disabled state when daily reaction cap hit announces *"Daily reaction limit reached. Try again tomorrow."*
- **Used in:** closet visitor footer (MVP renders in local closet only since live presence is Phase 2 — `iReacted` and `count` come from the snapshot endpoint).

## `CoinBalancePill`

- **Role:** display Hubba Coin balance.
- **MVP behavior:** **display only.** Tapping at MVP opens a sheet showing balance detail and ledger history. **Never** opens Stripe checkout — top-up is Phase 2 (`architecture.md:182` "Paid boxes via Hubba Coins + compliance" gates this).
- **Conceptual props:** `balance`, `compact?` (header pill vs. expanded inline).
- **Motion:** `motion.s` count animation on balance change (e.g., daily login earn).
- **A11y:** *"`{balance}` Hubba Coins. Tap to view balance details."*
- **Used in:** persistent header, box detail screen.

## `SafetyNotice`

- **Role:** at MVP, used **only** for the ESRB/PEGI "Includes Random Items" label on box-purchase and box-open screens, per `CHARTER.md:66`.
- **Conceptual props:** `variant` (`includes-random-items` at MVP; other variants exist as tokens but render never until Phase 2).
- **Motion:** `motion.s` slide-in once on first box-screen view per session; persistent thereafter.
- **A11y:** rendered as `role="region"` with `aria-labelledby` pointing at the heading. Screen-reader text: *"Includes Random Items. This box contains randomly selected items. Drop rates are published on the odds page."*
- **Used in:** Daily Box detail, Standard / Premium / Seasonal box detail (only the Daily Box is reachable at MVP since paid boxes are Phase 2, but the component supports all four for screen continuity).
- **Out of scope at MVP:** age gate, spend cap notice, region block — those are Phase 2 surfaces.

## `TradeableCountdownChip`

- **Role:** surfaces the 7-day post-acquisition trade hold on a newly-acquired inventory row (`architecture.md:74`, `inventory.tradeable_after`, `0001_init.sql:206`).
- **MVP rationale:** even though trading is Phase 3, the chip ships at MVP — gives players context for the timer they will see on future trade screens, and lets them understand why a freshly-dropped Mythic isn't immediately tradeable when trading does ship.
- **Conceptual props:** `tradeableAfter` (timestamp).
- **States:** `pending` (timer in the future) / `available` (timer passed — chip renders nothing).
- **Motion:** none. The chip is informational, not animated.
- **A11y:** *"Tradeable in `{N days H hours}`; trading not yet available."* The "not yet available" suffix is explicit because the timer alone would imply a feature that doesn't ship at MVP.
- **Used in:** `OwnedGearGrid` cards, `Closet Editor` `InventoryCard`.

## `CountdownHUD`

- **Role:** at MVP, displayed during the **box-open reveal beats** — commit-shown → seeds-submitted → outcome-stamped. Per `architecture.md:86-118`, the reveal is a multi-step transcript and the HUD signals the player which beat they are on.
- **Conceptual props:** `beats` (ordered list with `state: 'pending' | 'active' | 'done'`), `currentMs?` (for the lid-lift `motion.xl`).
- **Motion:** beats advance on `motion.s`; the final lid-lift uses `motion.xl`. **Not** a slot-machine tension build per Part I §6 hard rule.
- **A11y:** `role="status"` with `aria-live="polite"`. Each beat announces: *"Beat `{n}` of `{total}`: `{beat label}`."*
- **Used in:** box-open reveal sequence only. **Not** the drop calendar — drop calendar is Phase 2 and renders never at MVP.

## `ProvablyFairTranscript`

- **Role:** displays the commit-reveal transcript per `architecture.md:86-118` and `CLAUDE.md:47-53` — `server_seed_hash` (commit), `server_seed` (revealed after the open), `client_seed`, `nonce`, `outcome_index`, derived item.
- **Conceptual props:** `commitHash`, `serverSeed?`, `clientSeed`, `nonce`, `outcomeIndex`, `templateId`, `state` (`committed` | `revealed`).
- **Verification copy (locked):** "Verify this open: `SHA256(server_seed) === commit_hash` and `SHA256(server_seed ‖ client_seed ‖ nonce) % 10000 === outcome_index`." Includes a copy-to-clipboard for each field and a link to /odds.
- **Motion:** `motion.s` for field reveals.
- **A11y:** every hash is `role="textbox" aria-readonly="true"` so screen readers don't try to spell out 64 hex chars by default. Summary: *"Provably fair transcript. Outcome index `{n}`. Press to expand and copy each field."*
- **Used in:** box-open result detail, profile → "my opens" history.

## `OddsTableRow`

- **Role:** one row of the `/odds` page (`CHARTER.md:65` — "Drop rates public from day one"; `CLAUDE.md:11` — CI parity check).
- **Conceptual props:** `rarity` (uses `RarityBadge`), `percent`, `hcEquivalent?`, `numberedEdition?` (when row is a specific numbered edition, render `SerialBadge` for `nextSerial / totalSupply` and `DropStatusBadge` for `live | sold-out | retired`).
- **Motion:** `motion.xs` on hover/focus only.
- **A11y:** rendered as `<tr>` inside a `<table>` with semantic headers. Row label: *"`{rarity}`: `{percent}` percent. Approximate value `{hcEquivalent}` Hubba Coins. `{Numbered edition: serial {nextSerial} of {totalSupply}, status {status}. |}`"*
- **Used in:** `/odds` page only.

---

# Part III — Screens & Flows

Component names referenced in this part (e.g. `BoxOpenStage`, `SerialSlide`, `TranscriptCard`) are *screen-specific compositions* of the base components in Part II — they are not in the reusable component inventory.

## 1. Signup / First-Run Onboarding

**Route:** `/welcome` (post-OAuth, pre-closet).

**Purpose:** Provision identity, surface the 500 HC signup bonus (`economy.md:25`, `0002_audit_fixes.sql:231-233`), and let the player override the auto-assigned `skater_<id8>` handle (`0002_audit_fixes.sql:204-242`).

**Layout (mobile-first, 360 dp):**

1. `GlassCard` header — "Welcome to SkateHubba" (`text.primary`) over the player's auto-handle in `text.tertiary`.
2. `UsernameClaimField` — pre-filled with `skater_<id8>`; live-validates against the regex `^[a-zA-Z0-9_]{3,24}$` (`0001_init.sql:41`); shows availability state.
3. `CoinBonusReveal` — animated coin-stack counting `0 → 500 HC` once the username is committed. Pulls from `wallets.balance` post-trigger; does not fabricate the number.
4. `PrimaryButton` "Enter your closet" (`accent.primary`) — disabled until username passes the regex.

**Copy:**
- Header: "You're in. Pick a handle."
- Hint under field: "Letters, numbers, underscores. 3–24 characters. Change it once free."
- Bonus reveal: "Signup bonus: 500 Hubba Coins."
- Footer microcopy: "Hubba Coins are play-only. They have no cash value. See Terms." (Closed-loop pillar, `CHARTER.md:26`.)

**States:**
- *Loading:* skeleton on header + field, no bonus card visible.
- *Empty:* user dismisses field — fallback handle persists, never blank.
- *Error (regex):* `status.drop` line "Use 3–24 letters, numbers, or underscores."
- *Error (taken):* "Taken. Try `<handle>_<random3>`?" with one-click apply.

**Accessibility:** Field labeled `for` + `aria-describedby` linking hint and error. `CoinBonusReveal` respects `prefers-reduced-motion` — drops the count-up and shows the final value directly. Focus moves to the primary button after a successful claim.

**Tablet+ scaling:** Card centers in viewport at 480 dp max-width. Desktop adds a static side panel describing the loop ("Collect, Customize, Show off") with no interaction.

## 2. Public Closet — `/closet/:username`

**Purpose:** Render the player's identity surface. Same route serves owner and visitor; the *role* is what differs, not the URL.

**Layout:**

- `ClosetHero` — avatar render, display name, fire/respect/want counts derived from `closet_reactions` (`0001_init.sql:360-369`), `closets.visit_count` / `fire_count`.
- `EquippedAvatarPanel` — read-only 3D bust + equipped slot chips.
- `DisplayedShelf` — items where `displayed_in_closet = true`, read via `public_closet_inventory` (`0002_audit_fixes.sql:183-194`). Cards show template name, edition name, and serial — never `unique_token`, `acquired_at`, `tradeable_after`, `source`, `current_trade_id`, or `inventory.id`.
- `ReactionRail` — three `ReactionButton`s backed by the locked enum: `fire`, `respect`, `want`. Visitor-only; for owner the rail collapses to an aggregate count.
- `ClosetTopBar`:
  - Owner: "Edit Closet", "Open Boxes", "Inventory" actions.
  - Visitor: "React", "Share link" — no edit actions, no balance.

**Distinguishing owner vs visitor:** A persistent `RoleBadge` ("Your closet" vs "Visiting @handle") anchors the top of the viewport. Color: `surface.glass` with `accent.primary` ring on owner; neutral on visitor. Never rely on color alone — the text string is the source of truth (WCAG 1.4.1).

**Copy:**
- Visitor header: "@handle's closet."
- Visitor reaction prompt: "Drop a reaction." Button labels: "Fire", "Respect", "Want".
- Owner header: "Your closet." Subline: "X visits this week."
- Empty closet (visitor): "@handle hasn't displayed any gear yet."

**States:**
- *Loading:* skeleton shelves; avatar bust shows a neutral mesh, not a guess at items.
- *Empty (owner):* gentle nudge — "Display gear from your inventory."
- *Empty (visitor):* see above.
- *Error (404 username):* "No skater by that handle."
- *Error (closet `is_public=false` and viewer is not owner):* "This closet is private."

**Accessibility:** `ClosetHero` heading uses `h1`. Reaction buttons announce both the action and resulting count via `aria-live="polite"`. Avatar canvas has a text fallback summarizing equipped items.

**Tablet+ scaling:** Two-column at ≥768 dp (avatar left, shelf right). Desktop adds `OwnedGearShelves` preview rail in a third column for owner; visitor never gets a third column (not entitled to the full inventory).

## 3. Closet Editor

**Route:** `/closet/edit` (owner-only; redirects visitors to `/closet/:username`).

**Purpose:** Equip from the 30 preset cosmetics + earned/box-drop inventory rows. MVP scope is *equip* and *display* only — no shelf decoration tools (Phase 2 per `architecture.md:184`).

**Layout:**

- Left rail: `CategoryFilterChips` — Decks, Shoes, Tops, Bottoms, Headwear, Accessories, Stickers (`item_category` enum, `0001_init.sql:102-105`).
- Center: `EquipPreview` — live avatar render reacting to selection.
- Right rail: `InventoryGrid` of owned items in the active category. Each `InventoryCard` shows:
  - Template thumbnail + name
  - Edition + serial (e.g. "Founders #042/100") when serial is set
  - `DropStatusBadge`
  - `TradeableCountdownChip` (silent if `tradeable_after <= now()`)
  - Source label: "Earned" / "Drop" (see `CHARTER.md:67` "buying separate from earning"; "Bought" not in scope at MVP but the chip set is extensible).
- Bottom dock: `EquipActionBar` — "Equip", "Display in closet", "Save".

**Copy:**
- Empty category: "Nothing here yet. Open a box or earn a daily drop."
- Tradeable countdown chip: "Tradeable in 6d 14h" (context-only at MVP).
- Conflict toast (slot already filled): "Replaced your @ShoeName."

**States:**
- *Loading:* card skeletons; preview avatar stays equipped to the last server-confirmed state.
- *Error (Edge Function rejects equip):* toast in `status.drop` with retry. Local state reverts.
- *Optimistic:* selected card shows a subtle `accent.primary` ring; on confirmation, ring drops.

**Accessibility:** Filter chips are `role="tablist"`. Grid is a single-column list on screen readers with the category heading announced. Avatar canvas is `aria-hidden`; equipped-state changes announced via off-canvas live region.

**Tablet+ scaling:** Filter rail becomes a vertical sidebar at ≥768 dp. Desktop widens the inventory grid to 3 columns and pins the action bar to the bottom of the editor card, not the viewport.

## 4. Box Surface (Daily + Earned)

**Route:** `/boxes`.

**Purpose:** List the boxes the player can open. At MVP this means **Daily Box only** for free play (`economy.md:39-44`); Standard/Premium/Seasonal cost-bearing variants exist in `loot_boxes` but their open path is Phase 2 (`architecture.md:182`).

**Layout:**

- Header: "Boxes" with the **`SafetyNotice variant="includes-random-items"`** persistent in the page chrome (see Part III §C).
- `BoxCard` per available box:
  - Box artwork (`surface.glass` panel with rarity-tinted edge glow)
  - Name, kind chip (Daily / Standard / Premium / Seasonal — only Daily is openable at MVP; the rest show an `OpenLaterChip` "Available soon")
  - Cost: "Free — 1 per day" for Daily; "200 HC" / "800 HC" / "500 HC" for the others (display-only).
  - `PityStatusChip` — rolling pity-timer counter for Standard/Premium per `economy.md:45`. Reads from the player's `box_opens` history bucketed by `loot_box_id`. For Daily, the chip reads "Common floor on every open" (`CHARTER.md:71`).
  - "Open" CTA — enabled only for Daily and only if the player has not opened today (UTC bucket).
- `OddsLink` — "See full drop rates" → `/odds`.

**Copy:**
- Daily header subline: "Free box, once a day."
- Pity status (Standard/Premium): "Rare or better in 7 more opens."
- CTA disabled today: "Come back tomorrow — your daily resets at midnight UTC."
- ESRB/PEGI label (visible top-right of every `BoxCard`): "Includes Random Items."

**States:**
- *Loading:* `BoxCard` skeletons preserving slot count.
- *Empty:* "No boxes available right now." (Should not happen at MVP — Daily is always defined.)
- *Error:* fallback "Couldn't load boxes. Retry."
- *Daily already opened:* CTA replaced with countdown to reset.

**Accessibility:** Cards are `role="article"` with the box name as `aria-labelledby`. The "Includes Random Items" badge is a real text node with `aria-label`, not a decorative image. Pity status announces changes via polite live region.

**Tablet+ scaling:** Single-column at 360 dp, 2-column at 768 dp, 3-column at 1024 dp. Card aspect ratio fixed at 4:5.

## 5. Box-Open Flow (Commit → Reveal)

**Route:** `/boxes/:slug/open` (modal-style overlay over `/boxes`).

**Purpose:** Run the commit-reveal sequence (`CLAUDE.md` "How to think about loot boxes"; `architecture.md:85-118`; `0002_audit_fixes.sql:25-50`) end-to-end with an *arcade-unlock* visual idiom — **never** slot-machine, spin, scratch, or pull-to-reveal motion (Part I §6).

**Stages** (driven by `BoxOpenStage` composition):

1. **Commit (server pre-input).** UI shows "Locking in this open…" while the server inserts `box_open_commits` and returns `commit_id` + `server_seed_hash`. The hash is displayed in `text.tertiary` mono with a "Copied to clipboard" affordance — players who want to pre-record the hash for verification can.
2. **Client input.** Player taps "Unlock". Client supplies `client_seed` (CSPRNG in-browser) + `nonce`. UI shows a stamp-press animation: the box icon receives a glowing impression, no spinning reel.
3. **Reveal.** Server returns `outcome_index`, `resulting_rarity`, and (if numbered) the minted `serial_number` and `granted_inventory_id` (`architecture.md:100-112`). UI plays:
   - Stamp lands (single press, ~200ms, eased).
   - Glow ring in the rarity color (`rarity.common` → `rarity.mythic`).
   - For numbered outcomes: `SerialSlide` reveals "#042 / 100" with a single horizontal slide-in, no rolling digits.
4. **Result card.** Item portrait, rarity ring, edition + serial if any, `DropStatusBadge`, and "View transcript" link.

**Persistent UI elements:**
- `SafetyNotice variant="includes-random-items"` visible top-right through every stage.
- `EscButton` aborts the visual sequence but **cannot** cancel the open — the commit is already in `box_open_commits`. Copy: "Sequence skipped. Item is in your inventory."

**Copy:**
- Commit stage: "Sealing your open. Hash: `a3f…b91`. This proves the outcome was chosen before you provided input."
- Unlock stage: "Tap to unlock."
- Reveal stage (Common): "Common drop — @ItemName."
- Reveal stage (numbered): "Numbered drop — @ItemName #042 / 100."
- Footer line: "Drop chosen by SHA256(server_seed ‖ client_seed ‖ nonce) mod 10000."

**States:**
- *Loading (commit pending):* skeleton box icon; hash placeholder.
- *Error (server failure pre-commit):* "Couldn't start the open. No coins spent." Player retries.
- *Error (post-commit, reveal failed):* "Open recorded. Transcript will appear in your history." Outcome is durable in `box_opens`; UI cannot silently lose it.
- *Reduced-motion:* Stamp animation reduces to a single fade; serial appears statically; glow ring static rather than pulsing.

**Accessibility:** Each stage announces via `aria-live="polite"`. Stamp animation is decorative; the result card has the real text. Modal traps focus; Esc returns to `/boxes`.

**Tablet+ scaling:** Modal max-width 560 dp; on desktop, centered with a dimmed backdrop. The stage indicator stays in the modal — does not move into chrome.

## 6. Box-Open Transcript View (Provably-Fair)

**Route:** `/boxes/opens/:box_open_id`.

**Purpose:** Make the audit trail human-readable. Anyone (owner, regulator, third-party verifier) can re-derive the outcome from this page (`architecture.md:115-118`).

**Layout:**

- `TranscriptCard` (uses `ProvablyFairTranscript`):
  - `server_seed_hash` (always present, mono, copyable)
  - `server_seed` (mono, copyable; hidden behind "Reveal seed" toggle if `revealed_at IS NULL`)
  - `client_seed`
  - `nonce`
  - `outcome_index`
  - `resulting_rarity`
  - Outcome item — name + edition + serial if numbered
- `VerifyInline` — runs SHA-256 in-browser as a one-tap demonstration: "Hash matches. Outcome index matches."
- `PublicLinkButton` — copies a shareable URL.

**Copy:**
- Header: "How this drop was chosen."
- Explanation: "Before you tapped Unlock, the server committed to a secret seed by publishing its SHA-256 hash. After you provided a client seed and nonce, the server revealed the original seed. Anyone can recompute the outcome from these four values. This transcript is permanent and cannot be edited."
- Verify success: "Verified. The published hash matches the revealed seed, and the outcome index matches the combined SHA-256."

**States:**
- *Loading:* skeleton rows.
- *Pre-reveal (server_seed null):* "Reveal pending." Hash, client seed, nonce visible; seed shown as "—". Should be ephemeral; defending against it is cheap.
- *Error:* "Couldn't load this open."

**Visitor entitlements:** Publicly readable — third-party verifiability is the point. UI reads through a service-role view, not direct `box_opens` SELECT, to avoid leaking pre-reveal hashes for someone else's opens.

**Accessibility:** Mono fields have `aria-label` describing what each value is. Verify button announces result via live region.

**Tablet+ scaling:** Single-column stack at mobile; two-column (transcript left, verification panel right) at ≥1024 dp.

## 7. `/odds` Page

**Route:** `/odds`. Required day 1 per `CHARTER.md:65`.

**Purpose:** Publish all drop tables, derived from `loot_box_drop_tables.weight / 10000` (`0001_init.sql:304-316`). Also discloses the pity timer (`economy.md:45`) and the Common-floor guarantee (`CHARTER.md:71`).

**Layout:**

- `OddsHeader` — "Drop rates" + last-updated timestamp (implicit per deploy via CI parity check, `CLAUDE.md` rule 5).
- `OddsTable` per `loot_box_id` (composed of `OddsTableRow`s):
  - Columns: Rarity, % chance, Approx HC equivalent (only where `economy.md:51-61` quotes one — never publish a real secondary-market price; `CHARTER.md:70`).
  - Footer per table: "Weights sum to 10000."
- `DisclosureBlock`:
  - "Every box contains at least one Common item." (`CHARTER.md:71`)
  - "After 10 Standard or Premium opens without a Rare-or-better drop, your next open is guaranteed Rare or better." (`economy.md:45`)
  - "Numbered items are minted in order. Once an edition's run is complete, it is retired and never reprinted." (`CHARTER.md` pillar 5, `0001_init.sql:170-181`)

**Copy:**
- Page heading: "Drop rates"
- Subheading: "Published from our database, verified on every deploy."

**States:**
- *Loading:* table skeleton.
- *Empty:* "Drop tables are being updated." (Should not happen at MVP.)
- *Error:* "Couldn't load drop rates. Reload."

**Accessibility:** `OddsTable` uses real `<table>` semantics with `<caption>` per box. Percentages have both numeric and "1 in N" hint readable to screen readers.

**Tablet+ scaling:** Tables remain horizontal; on mobile, the "Approx HC" column is collapsible behind a disclosure but never hidden by default. No infinite scroll; one table per box stacked vertically.

## 8. Owned Gear Shelves

**Route:** `/inventory` (owner-only).

**Purpose:** Owner-facing browse of every owned `inventory` row, regardless of `displayed_in_closet`. This is where players see the timer they'll eventually use when trading ships in Phase 3 (`architecture.md:74`).

**Layout:**

- `CategoryFilterChips` (same set as the editor).
- `SourceFilterChips` — "All", "Earned", "Drop". (`CHARTER.md:67`: buying separate from earning. "Bought" is not in scope at MVP but the chip set is extensible. Maps to `inventory.source` ∈ {`signup_grant`, `box_drop`, `event_reward`}.)
- `OwnedGearGrid`:
  - Card shows template thumbnail, name, edition + serial, `DropStatusBadge`, source label, **and** `TradeableCountdownChip` (visible if timer is in the future, even though trading is Phase 3 — context for the lock players will see).
  - No price chip. No coin equivalent. (`CHARTER.md:70`.)
- Sort: newest first by `acquired_at` (owner-only field; safe to expose here).

**Copy:**
- Empty (no items at all): "Open your daily box to start collecting."
- Empty (filter): "Nothing matches this filter."
- Countdown chip: "Tradeable in 4d 12h" (context-only at MVP).

**States:**
- *Loading:* card skeletons.
- *Empty:* see above.
- *Error:* "Couldn't load your inventory. Retry."

**Accessibility:** Grid order matches DOM order. Source filter and category filter are independent `tablist` regions. Countdown chip has `aria-label` "Tradeable in 4 days 12 hours; trading not yet available."

**Tablet+ scaling:** 2 cols at 360, 3 at 768, 4 at 1024+. Filter chips collapse into a single sticky chip rail above the grid on mobile.

---

## A. Owner-vs-Visitor Visibility Matrix

Ground truth: RLS in `0001_init.sql` lines ~415–470, plus the `public_closet_inventory` view in `0002_audit_fixes.sql:183-194`. Anything not in the visitor column does not render for visitors and must not be requested from the client.

| Table | Column | Owner sees | Visitor sees |
|---|---|---|---|
| `inventory` | `id` | Yes | **No** (only for displayed items, via opaque view ref) |
| `inventory` | `owner_id` | Yes | Yes (it's the closet owner) |
| `inventory` | `item_template_id` | Yes | Yes, only if `displayed_in_closet = true` (via view) |
| `inventory` | `item_edition_id` | Yes | Yes, only if displayed (via view) |
| `inventory` | `serial_number` | Yes | Yes, only if displayed (via view) |
| `inventory` | `unique_token` | Yes | **Never** |
| `inventory` | `source` | Yes | **Never** |
| `inventory` | `acquired_at` | Yes | **Never** |
| `inventory` | `tradeable_after` | Yes | **Never** |
| `inventory` | `current_trade_id` | Yes | **Never** |
| `inventory` | `equipped` | Yes | **Never** (visitor sees rendered avatar, not the flag) |
| `inventory` | `displayed_in_closet` | Yes | Yes (filter on the view) |
| `wallets` | `balance` | Yes | **Never** |
| `wallets` | any other | Yes | **Never** |
| `coin_ledger` | all columns | Yes | **Never** |
| `box_opens` | `server_seed_hash` | Yes | Yes (per-row public transcript, after open is logged) |
| `box_opens` | `server_seed` | Yes (post-reveal) | Yes (post-reveal); pre-reveal NULL in the row |
| `box_opens` | `client_seed`, `nonce`, `outcome_index`, `resulting_rarity` | Yes | Yes (transcript is public by design) |
| `box_opens` | `granted_inventory_id` | Yes | **Never** (links to a specific `inventory.id`) |
| `closets` | `theme`, `layout`, `visit_count`, `fire_count` | Yes | Yes if `is_public = true` |
| `closets` | `is_public` | Yes | Effectively yes (controls visibility) |
| `closet_reactions` | aggregate counts | Yes | Yes |
| `closet_reactions` | `visitor_id` per row | Yes | **Never** (no leaderboard of who reacted) |

**UI lint rule:** every component that renders `inventory` data must declare whether it's an owner surface or a visitor surface, and the query layer must select from `inventory` (owner) or `public_closet_inventory` (visitor) accordingly. Mixing is forbidden.

## B. ESRB/PEGI "Includes Random Items" Label Placement

Applies at MVP because **earned boxes contain random outcomes** (`CHARTER.md:67`), not only paid ones. Required by ESRB/PEGI compliance (`CHARTER.md:66`).

Exact wording: **"Includes Random Items"** — no localization variants in MVP copy beyond the future i18n key `compliance.includes_random_items`.

Required placement:

1. **Box Surface (`/boxes`)** — persistent in page chrome header AND on each `BoxCard`.
2. **Box-Open Flow** — persistent in modal chrome through commit, unlock, and reveal stages.
3. **Box-Open Transcript View** — header subline alongside "How this drop was chosen."
4. **`/odds` page** — page-level disclosure, repeated next to each box's table.
5. **Closet Editor inventory cards** for items where `inventory.source = 'box_drop'` — small inline tag.
6. **Owned Gear Shelves cards** for items where `inventory.source = 'box_drop'` — same inline tag.
7. **Marketing/landing routes** that surface a "Try a daily box" CTA — even at MVP, before that CTA renders, the badge must be visible in the same viewport.

Explicitly **not required**:

- Public closet (`/closet/:username`) — visitors see displayed items, not the act of opening. The badge would be confusing context.
- Onboarding signup — the 500 HC bonus is deterministic, not random.

Accessibility: the label is a real text node, never an icon-only badge. `aria-label` must equal the visible string verbatim.

## C. ESRB/PEGI Compliance Note

The "Includes Random Items" label is the **only** compliance surface that ships at MVP. Age gate, spend caps, BE/NL region block, and parental consent UI are Phase 2 because they attach to paid Hubba Coin purchases, which Phase 2 enables (`architecture.md:182`).

## D. Phase 2+ Defer Stubs

These screens are deliberately *not* designed at MVP. One-line stub per the corresponding row in `architecture.md:178-187`.

- **Paid Coin Top-Up Screen** — Phase 2 (`architecture.md:182`, "Paid boxes via Hubba Coins + compliance").
- **Age-Gate Modal for Coin Purchases** — Phase 2 compliance (`CHARTER.md:67`).
- **Spend-Cap Configuration Screen** — Phase 2 compliance (`CHARTER.md:68`).
- **BE/NL Region-Block Notice** — Phase 2 compliance (`CHARTER.md:67`).
- **Standard / Premium / Seasonal Box-Open Flow** — Phase 2 (`architecture.md:182`); MVP only opens Daily.
- **3D Walk-In Hubba Shop** — Phase 2 numbered shop drops (`architecture.md:183`; `CHARTER.md:55-57`).
- **Deterministic Numbered Shop Drop Page** — Phase 2 (`architecture.md:183`).
- **Drop Calendar / Upcoming Drops View** — Phase 2 (`architecture.md:183`).
- **Live Closet Presence (visitor avatars in-room)** — Phase 2 (`architecture.md:184`).
- **Trade Proposal Screen** — Phase 3 (`architecture.md:181`, "Trading — Phase 3 (own phase, scariest feature)").
- **Trade Confirmation + Value-Mismatch Warning Modal** — Phase 3 (`architecture.md:79-83`).
- **Trade History Browser** — Phase 3 (`architecture.md:181`).
- **Friends List / Hub Room** — Phase 3+ (`architecture.md:184`).
- **PWA Install Prompt** — Phase 2 (`architecture.md:186`).

No layouts, no components, no copy committed for any of the above. When a stub graduates, it gets its own Architect pass.

---

## Critical files for implementation

- `/home/user/skatehubba-avatarcloset/CLAUDE.md`
- `/home/user/skatehubba-avatarcloset/docs/CHARTER.md`
- `/home/user/skatehubba-avatarcloset/docs/architecture.md`
- `/home/user/skatehubba-avatarcloset/docs/economy.md`
- `/home/user/skatehubba-avatarcloset/docs/brand-bible.md`
- `/home/user/skatehubba-avatarcloset/supabase/migrations/0001_init.sql`
- `/home/user/skatehubba-avatarcloset/supabase/migrations/0002_audit_fixes.sql`
