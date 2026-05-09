## Trader Atlas v2 — Cinematic 3D Globe (free stack)

Goal: a Google Earth–style experience that still feels like BLACKPAL — realistic globe at distance, neon holographic overlays for traders, smooth pan / zoom / tilt, and live activity layers. All using **free, no-API-key** libraries.

### Stack (all free, combined)

| Layer | Library | Purpose |
|---|---|---|
| Base globe | **MapLibre GL JS** (globe projection) | Smooth Google-Maps-style pan / zoom / tilt, vector tiles |
| Tiles | **OpenFreeMap** (free vector tiles, no key) + **ESRI World Imagery** raster as satellite layer toggle | Realistic look without Mapbox token |
| 3D terrain | MapLibre `terrain` source via free **AWS Terrarium** tiles | Real elevation / hillshade |
| Cinematic overlay | **Three.js** via MapLibre `CustomLayerInterface` | Neon trader pins, glowing arcs, pulse rings rendered in same scene |
| Heatmap & clustering | MapLibre native `heatmap` + `cluster` layers | Live activity density |

This combo gives realistic earth + tilt + buildings-style depth, with our sci-fi neon layer painted on top in the same WebGL context.

### Features

1. **Globe view** — true sphere projection, drag to rotate, scroll to zoom, right-drag / two-finger to tilt & pitch (up to 85°).
2. **Style switcher** — Cinematic (dark BLACKPAL), Satellite (ESRI imagery), Hybrid (satellite + neon labels).
3. **3D trader pins** — avatar discs floating above ground with tier-colored glow, scale by zoom, billboard to camera.
4. **Connection arcs** — animated great-circle arcs between connected traders (Three.js shader, violet→gold gradient).
5. **Live pulse rings** — emit from active GPS dots; intensity = recent activity.
6. **Activity heatmap** — toggle layer, fed from `profiles.last_seen_at` + GPS.
7. **Country leaderboard overlay** — extruded country polygons whose height = trader count (MapLibre `fill-extrusion`).
8. **Smart camera** — fly-to on pin click (duration eased), auto-orbit when idle (toggle).
9. **Carry-overs from current Atlas** — GPS throttle slider, Live GPS toggle, incoming requests panel, Connect button, privacy (city/country only pre-accept), realtime verifier events.
10. **Mobile**: reduce particle/pulse density 50%, lower terrain exaggeration, disable auto-orbit by default.

### Technical plan

```text
src/pages/WorldMap.tsx          → thin page shell (header, side panels, requests)
src/components/atlas/
  ├─ AtlasGlobe.tsx             → MapLibre map init + style switcher + terrain
  ├─ layers/TraderPinsLayer.ts  → Three.js CustomLayer for avatars + arcs
  ├─ layers/HeatmapLayer.ts     → MapLibre heatmap config
  ├─ layers/CountryExtrudeLayer.ts → fill-extrusion from leaderboard data
  ├─ hooks/useThrottledGps.ts   → existing throttle logic, extracted
  ├─ hooks/useTraderPositions.ts → realtime profiles subscription
  └─ ConnectionsPanel.tsx       → incoming/outgoing requests (reuse current)
```

- Install: `maplibre-gl`, `three` (already present via R3F), `@types/three`.
- Tile sources: `https://tiles.openfreemap.org/styles/dark` + ESRI imagery URL — both free, no token.
- Terrain: `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png` (free).
- Three.js layer uses MapLibre's `CustomLayerInterface` so it shares the same WebGL context — no double canvas, no flicker.
- Pin data: existing `profiles` query (lat/lng, avatar_url, display_name, tier) + supabase realtime channel.
- GPS pipeline kept identical to current throttle/debounce so frequency slider keeps working.

### Performance

- Cluster pins above zoom 4 (MapLibre clustering).
- Cap rendered Three.js pins to nearest 200 to camera.
- `requestAnimationFrame`-driven shader uniforms; no React re-renders per frame.
- Mobile detection halves arc count and disables fill-extrusion.

### Migration / rollout

- Replace Leaflet entirely on `/map` (and on `/world-map` if aliased).
- Remove `leaflet` + `react-leaflet` deps.
- Keep all friend-connection, privacy, request, realtime-verifier logic — only the renderer changes.

### Out of scope (can come later)

- 3D photorealistic buildings (would need Google Tiles / Cesium ion key — paid).
- Street View.
- Indoor maps.

### Risks

- MapLibre globe projection is stable since v4; pinning version `^4.7`.
- ESRI imagery tile policy allows non-commercial display with attribution — we'll add the required attribution control. If you'd rather avoid ESRI, we can stick to OpenFreeMap satellite-style only.
