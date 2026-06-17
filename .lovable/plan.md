Portfolio enhancements (firm filter, health badge, configurable consistency threshold, extra risk metrics) are already live. This plan covers the next two pillars you picked:

## 1. BTAX — company token mechanics

### A. BTAX Marketplace & Spend Hubs
New page `/marketplace` with category tabs:
- **Boosts** — XP multipliers (2x for 24h), Account theme unlocks, Streak insurance
- **Cosmetics** — Sticker packs, profile themes, NFT frame upgrades, animated avatars
- **Services** — Mentor sessions, sponsor allocations, account fee credits
- **Cards** — Lottery spins, mystery boxes

Tech:
- New table `marketplace_items` (slug, name, description, category, btax_price, image_url, payload jsonb, stock, is_active)
- Reuse `spend_wallet()` RPC for purchases, add `marketplace_purchase(item_id)` RPC that validates stock, calls spend_wallet, inserts into `purchases`, applies the item payload (grant sticker pack / boost row / etc.)
- "Spend hubs" entry tile from Dashboard + BlackCoin pages

### B. P2P Transfers & Tipping
- New RPC `transfer_btax(recipient_user_id, amount, note)` — atomic debit/credit using wallet_transactions
- Sender pays small platform fee (configurable in academy_settings, default 1%)
- New UI: `BtaxSendDialog` (user search by display_name/username, amount, note) — accessible from wallet header
- Inline **Tip** button in chat messages and profile pages → opens dialog prefilled with recipient
- Realtime toast on recipient + in_app_notification ("You received X BTAX from Y")
- Daily transfer cap per user (configurable) to prevent abuse

## 2. XP — full progression system

### A. XP from trading activity
- New RPC `award_trading_xp(prop_account_id, trade_id)` triggered on `prop_trades` close via trigger
- Awards:
  - +10 XP per closed trade
  - +25 XP per winning trade
  - +50 XP win streak (3+)
  - +100 XP first profitable day
  - +500 XP phase passed
- Each award writes to new `xp_ledger` table (user_id, amount, source, source_id, created_at) for auditable history

### B. Daily / weekly XP quests
- New table `xp_quests` (key, title, description, type day/week, target int, xp_reward, btax_reward, icon)
- New table `xp_quest_progress` (user_id, quest_id, period_start, progress, completed_at)
- Seed quests: "Take 1 trade today", "Journal 1 entry", "Visit Atlas", "Win 3 trades this week", "Maintain 50%+ win rate weekly"
- `QuestsPanel` component on Dashboard showing today + this-week with progress bars and Claim button
- Reset rules: day = UTC midnight, week = Monday

### C. Level-up rewards & unlocks
- Extend `xp_tier_config` with `btax_reward`, `unlock_feature` (text), `cosmetic_reward` (jsonb)
- Trigger on `profiles.xp_points` update → recompute rank_level; on increment, call `apply_level_rewards()` to:
  - Credit BTAX
  - Insert into user_collectibles for cosmetic
  - Fire in_app_notification + AccessGrantedSeal event
- New `LevelUpCelebration` modal with animation

### D. Public XP profile & history
- `XpTimeline` component on PublicProfile showing recent XP gains from `xp_ledger` (grouped by day, with source badges)
- Stats: total XP, daily avg XP, current level, % to next level, longest XP streak
- Friend comparison: `/compare/:userId` extends existing comparison with XP delta + per-source breakdown

## Migrations needed
1. `marketplace_items` table + RLS (public read active items, admin write)
2. `xp_ledger` table + RLS (own read, system insert via SECURITY DEFINER)
3. `xp_quests` + `xp_quest_progress` tables + RLS
4. Extend `xp_tier_config` (btax_reward, unlock_feature, cosmetic_reward)
5. Extend `academy_settings` (btax_transfer_fee_percent, btax_daily_transfer_cap)
6. RPCs: `transfer_btax`, `marketplace_purchase`, `award_trading_xp`, `claim_quest`, `apply_level_rewards`
7. Trigger on `prop_trades` (AFTER UPDATE → closed) calling award_trading_xp
8. Trigger on `profiles.xp_points` (AFTER UPDATE) calling apply_level_rewards

## Build order (proposed)
1. Migrations + RPCs (all in one approval batch)
2. P2P transfers UI (BtaxSendDialog, wallet integration, chat/profile tip buttons)
3. Marketplace page + buy flow
4. XP ledger + trading triggers + QuestsPanel on dashboard
5. Level-up celebration modal + reward delivery
6. XpTimeline on PublicProfile

Confirm and I'll start with step 1 (database) immediately.
