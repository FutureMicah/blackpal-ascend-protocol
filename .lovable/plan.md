# Trader Atlas v2 — Snapchat Map + Admin Command Center

Turns the existing Atlas into a live Snapchat-style map and gives admins a full real-time view of every user, where they are, and what they're doing.

## 1. Database (one migration)

Extend `user_locations` with privacy + trading status:
- `share_precision text default 'country'` — `'country' | 'precise' | 'ghost'`
- `is_trading boolean default false` — true when user has an open prop/paper position
- `last_trade_at timestamptz` — last time they opened or closed a trade
- `avatar_url text` — denormalised for fast map rendering
- `display_name text` — denormalised

Add Realtime publication for `user_locations` and `prop_trades` so the map and admin feed stream live.

RLS:
- Authenticated users can see other users' rows but **only country + country_code + region + avatar + display_name + is_online + is_trading** — exact lat/lng/city hidden unless `share_precision = 'precise'` AND not in ghost mode. Implemented via a `public.user_locations_public` view (security_invoker, base table SELECT denied except own row + admin).
- Admins (`has_role(uid,'admin')` or `'super_admin'`) bypass and see everything.

Trigger: when a row is inserted into `prop_trades` or `paper_trades` with `status='open'`, set `user_locations.is_trading=true, last_trade_at=now()`; on close, recompute `is_trading = exists(open positions)`.

## 2. RPCs / Edge function

- `atlas_stats()` — returns `{ total_users, online_5m, trading_today, in_trade_now, by_country: [...] }`. Cached 15s.
- `atlas_admin_users(filter, limit, offset)` — admin-only paginated user list with location + trading + KYC + wallet snapshot.
- Edge function `atlas-broadcast` — admin posts notification or force-logout to a specific user_id.

## 3. Public Atlas page (`/atlas` / WorldMap rewrite)

Snapchat-style map using **react-leaflet + leaflet.markercluster + leaflet.heat** (free, no API key) with a dark Carto basemap.

- Avatar pins (circular, glowing ring when `is_trading`, green ring when online).
- Cluster when zoomed out; pop into avatars when zoomed in.
- Heatmap toggle = trading-activity density (weight = recent trades count).
- Tap pin → mini profile drawer (avatar, name, country, online/trading status, last trade, "view profile" link).
- Top filter bar: **Online · Trading today · In a trade now** (three independent toggles) + live counts.
- Privacy: non-friends see only **country-level** pin (jittered to country centroid). Friends see precise if user opted-in. Ghost mode hides them entirely.
- Settings shortcut: "Ghost mode" + precision toggle.

## 4. Admin Atlas dashboard (`/admin/atlas`, gated by `has_role admin`)

Tab inside AdminDashboard:
- **KPIs**: Total users, Online now, Trading today, In a trade now, New today.
- **Per-country table**: country flag, total, online, trading, revenue (sum payments), sortable, CSV export.
- **Full map**: admin sees precise pins for everyone regardless of ghost mode, with filters mirroring the public map plus "show ghosted".
- **Live activity feed** (right rail): realtime stream of signups, logins, opened/closed trades, payments — with country + avatar.
- **User drill-down drawer**: click pin or row → profile, KYC status, payment history, last 20 trades, devices, IP/location history, wallet balance. Action buttons: **Send notification**, **Force logout**, **Open profile**.

## 5. Privacy + ghost mode UI

Small panel in Profile settings: precision selector (Country only / Precise / Ghost) — writes to `user_locations.share_precision`. Default = Country only (matches your answer).

## Technical notes
- New deps: `react-leaflet`, `leaflet`, `leaflet.markercluster`, `leaflet.heat`.
- `PresenceProvider` already heartbeats — extended to also push `is_trading` recompute every minute.
- Country centroids: ship a small static JSON (~200 countries) to jitter public pins.
- Force-logout: edge function deletes the user's `auth.refresh_tokens` row via service role and inserts an `in_app_notifications` row.

Approve and I'll build it end to end.