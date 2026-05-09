# Plan — Academy polish + XP/Prop Ladder reset

This is a multi-part request. I'll group it into 6 workstreams. The detailed T&C document will wait until you send your draft — I'll only scaffold a placeholder page now.

---

## 1. Single Lucide icon theme + regression test

- Confirm the global rules already in `src/index.css` (`svg.lucide` → primary purple, stroke 1.5) are the **only** source of icon styling.
- Add a small wrapper export `Icon` (re-exports from lucide-react with default `strokeWidth={1.5}` and `size={16}`) for new code, but keep raw `lucide-react` imports working via the CSS rules.
- **Regression test** (`src/test/icon-theme.test.tsx`): renders a sample of Lucide icons inside the app shell, then asserts:
  - computed `stroke-width` is `1.5`
  - computed `color` resolves to the brand purple HSL
  - no inline `style="color"` overrides on `.lucide` elements
- Also add a **lint-style unit test** that scans `src/**/*.tsx` source for forbidden patterns on Lucide icons:
  - `text-(red|blue|green|yellow|emerald|sky|amber|rose|orange)-` directly on a `<Lucide…>` JSX tag
  - inline `color=` / `stroke=` props on lucide imports
  - allow-list: anything inside a node tagged with `className="icon-keep-color"` (status indicators, P/L colors).

## 2. Translator widget — enable/disable + current language, mobile + desktop

- Extend `src/components/Translator.tsx`:
  - Persist `translator_enabled` (default true) and `translator_lang` (default `en`) in `localStorage`.
  - Show **current language code** as a small chip on the trigger button (e.g. `EN`, `FR`).
  - Add an **Enable / Disable** switch inside the popover. When disabled, unmount the Google widget and reset the `<html lang>` and any `goog-te-*` cookies so the page returns to English.
  - Detect language changes from the Google widget (`#google_translate_element select` change event) and update the chip + storage.
- Mount the Translator in **both navs**:
  - Desktop: `FloatingNav` (already uses it — verify placement/spacing).
  - Mobile: add into the mobile menu sheet at the same visual weight as desktop.
- A small render test ensures the chip text matches stored `translator_lang` and that toggling Disable removes the Google iframe.

## 3. UI color audit — automated scan + global purple tokens

- Add `scripts/color-audit.mjs` (run via `bun scripts/color-audit.mjs`) that walks `src/**/*.{tsx,ts,css}` and reports:
  - Hard-coded hex colors not in the design tokens.
  - Tailwind utility colors on icons/buttons/badges that aren't `primary|secondary|muted|accent|destructive|ink|emerald|rose|amber|sky` (the last four allowed only with `icon-keep-color` for status).
  - `text-white` / `bg-black` literals (should be tokens).
- Run the script, capture findings, and fix the offending files by swapping to tokens (`text-primary`, `bg-primary/10`, `border-primary/30`, etc.). Status colors stay where semantically correct (P/L, success/error toasts).
- Wire the script into a `vitest` test (`src/test/color-audit.test.ts`) so CI fails on new drift.

## 4. Naira dashboard — admin-approved only (E2E)

- Verify in code that `wallets.naira_balance` is only writable by admin RPCs (`fund_wallet`, `approve_wallet_topup`). RLS on `wallets` already blocks user updates of the column — add an explicit unit test against the RLS policy via a SQL fixture in `src/test/naira-admin-only.test.ts` (uses the public client; expects update to be rejected).
- E2E (`src/components/dashboard/BtaxWalletOverview.naira.e2e.test.tsx`):
  - Mocks the supabase client to return a wallet row.
  - Asserts the rendered Naira figure equals the DB value, the "Set by admin" label is present, and there is **no input/textarea/contenteditable** in the Naira block.
  - Asserts the conversion math (`naira / 100`) is read-only and changes only when the mocked DB row changes (simulating a realtime push).
- Add a second test that proves the Convert link points to `/blackcoin?action=convert` (the only path where BTAX changes hands, which goes through `spend_wallet` / future `convert` RPC — never a free-form input on the dashboard).

## 5. Academy wording sweep

- Run `rg` for investment/finance phrasing across `src/**`:
  - `invest|investment|investor|portfolio value|ROI|returns|profit target|capital|deposit|withdraw|fund manager|trader (account|capital)`
- Replace with academy-friendly equivalents in **buttons, headings, empty states, tooltips, toasts**:
  - "Invest" → "Join program"
  - "Investment" → "Program"
  - "Portfolio" → "My progress"
  - "ROI / Returns" → "Progress"
  - "Deposit" → "Top-up" (Naira) / "Add BTAX" (BTAX)
  - "Withdraw" → "Cash out (admin approval)"
  - "Profit target" → "Goal"
  - "Capital" → "Practice account"
- Keep **trading-mechanics** terminology intact where it's literal (lot size, SL/TP, candlestick) — those are academy curriculum terms.
- Add a unit test (`src/test/academy-wording.test.ts`) that greps the source for the banned phrases and fails if reintroduced (with a small allow-list of legitimate uses, e.g. inside `TradingJournal` field labels).

## 6. XP reset + Prop account ladder

### 6a. Reset XP and progression for everyone
A migration that:
- Sets `profiles.xp_points = 0`, `rank_level = 1`, `achievement_streak = 0`, `best_achievement_streak = 0`, `last_achievement_date = NULL`.
- Empties `user_achievements` (all unlocks reset).
- Adjusts existing achievement XP thresholds **upward** (multiplier ×3 by default, capped) so XP is materially harder to earn. Exact multipliers:
  - common ×2, rare ×3, epic ×4, legendary ×5
- Resets prop accounts (`user_prop_accounts.account_balance/highest_balance/current_equity/starting_balance` already 0 from last migration — ensure no lingering rows are above 0 and clear `phase` to `pending`).

### 6b. Prop account ladder rules
New table `prop_account_tiers` seeded with the 5 levels you described:

| Tier | Starting balance | Profit goal to request payout | Payout to student | Activation top-up |
|------|------------------|-------------------------------|-------------------|-------------------|
| 1    | $200,000         | grow to $300,000 (+$100k)     | $200,000          | — (first account) |
| 2    | $500,000         | grow to $600,000 (+$100k)     | $100,000          | — |
| 3    | $1,000,000       | grow to $1,100,000 (+$100k)   | $100,000          | — |
| 4    | $2,000           | grow to $3,000 (+$1k)         | $1,000            | $1,000 top-up before tier |
| 5    | $5,000           | grow to $6,000 (+$1k)         | $1,000            | $1,000 top-up before tier |

(I noted that the order you wrote has tier 4 = $2k and tier 5 = $5k after the three large tiers — please confirm in chat if you'd actually like the ladder reordered as 4→5→1→2→3.)

- Wire the tiers into `MyAccounts` / `PropDashboard` to display **Goal**, **Progress %**, and **Request payout** (disabled until goal reached, and only if account is admin-approved).
- New RPC `request_prop_payout(p_account_id)` that:
  - Verifies the user owns the account and the goal is met.
  - Inserts a row into `prop_payout_requests` (status `pending`, `student_payout`, `company_share`).
  - Admin approves via existing `AdminPropManager` UI; on approval the company share is logged and the account is reset to its starting balance.
- All RLS: students can read their own tiers/requests, only admin can write balances.

### 6c. T&C placeholder
- Add `/terms` page with a "Coming soon — full Terms & Conditions are being drafted" notice and a link from the prop dashboard. When you send your T&C text, I'll drop it in here.

---

## Open questions before I start
1. Ladder order — is it really 1=$200k, 2=$500k, 3=$1M, 4=$2k, 5=$5k? The small-account tiers look like they should come first as a stepping stone. Confirm or reorder.
2. For the wording sweep, should I also rename existing routes like `/blackvault`, `/blackpass` etc.? (I'll leave route names alone unless you say otherwise — only visible copy changes.)
3. Should the XP reset wipe **leaderboard history** too, or keep history visible with everyone now at 0?

Tell me your answers (or just "go ahead with defaults") and I'll ship it.
