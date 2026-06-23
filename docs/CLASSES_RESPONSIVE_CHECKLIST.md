# Classes — Responsive QA Checklist

Run this checklist any time the Classes page, the live session room, or the class chat changes. Test at every breakpoint and in both orientations on mobile.

## Breakpoints to test

| Device              | Width × Height (CSS) | Orientation |
| ------------------- | -------------------- | ----------- |
| Smallest mobile     | 320 × 568            | portrait    |
| iPhone 12/13/14     | 390 × 844            | portrait    |
| iPhone landscape    | 844 × 390            | landscape   |
| Tablet (iPad mini)  | 768 × 1024           | portrait    |
| Tablet landscape    | 1024 × 768           | landscape   |
| Small laptop        | 1280 × 800           | landscape   |
| Desktop             | 1440 × 900           | landscape   |
| Ultra-wide          | 1920 × 1080          | landscape   |

In Chrome DevTools: Toggle Device Toolbar (Cmd/Ctrl+Shift+M) → pick each preset → rotate.

## Classes page (`/classes`)

- [ ] Hero card never overflows. Enrolled/Completed stat cards stay on one row at 320px.
- [ ] Tabs (Browse / Live / My Classes) all visible without horizontal scroll.
- [ ] Search input + level/category filters wrap cleanly; filter row scrolls horizontally instead of breaking.
- [ ] Course cards: 1 col <640px, 2 cols ≥640px. Card images keep 16:9 aspect, no crop bleed.
- [ ] Enroll / Continue / Chat buttons remain ≥40px tall (touch target).
- [ ] Skeleton appears immediately on load (no blank screen).
- [ ] Forcing offline (DevTools → Network → Offline) then opening Classes shows the **Retry** state, not a stuck loader. Retry recovers.

## Course details dialog

- [ ] Opens at 96vw on mobile, max-w-2xl on desktop. Scrolls inside dialog, never the page.
- [ ] Lesson video iframe keeps `aspect-video`, no overflow at 320px.
- [ ] Mark-as-complete button full-width, ≥40px tall.

## Class chat dialog (standalone)

- [ ] Full-screen on mobile (100vw × 100dvh), rounded card on ≥640px.
- [ ] Message bubbles cap at ~78% width, long words wrap.
- [ ] Composer row: emoji / stickers / file / mic / send all ≥32px hit area; GIF button hidden <640px.
- [ ] Rules dropdown expands without pushing input off-screen.

## Live session room (`LiveSessionRoom`)

### Layout
- [ ] Mobile **portrait**: video on top (~55% height), chat slides up as a bottom panel.
- [ ] Mobile **landscape**: video on the left, chat as a side panel (~320px).
- [ ] Tablet/desktop: side-by-side, video flexes, chat fixed 320–360px.
- [ ] Rotating the device live updates the layout without re-mounting the iframe (video keeps playing).
- [ ] Video iframe always uses `object`-area; **no cropping** at any size — black letterboxing is fine.

### Loading & errors
- [ ] Skeleton + spinner overlay appear before iframe `onLoad`.
- [ ] If the room doesn't load within 12s, an **error + Retry** appears. Retry reloads the iframe.
- [ ] Daily.co failure silently falls back to Jitsi (toast shown).

### Touch controls
- [ ] Mic toggle is ≥44×44px on mobile, with `aria-pressed`.
- [ ] Chat toggle is ≥44×44px on mobile, with `aria-pressed`.
- [ ] Header stays sticky; buttons never get hidden behind the iOS notch.
- [ ] Close (X) is reachable with one thumb on a 6.7" phone.

## Accessibility

- [ ] All icon-only buttons have `aria-label`.
- [ ] Toggle buttons expose `aria-pressed`.
- [ ] Focus visible on Tab navigation.
- [ ] Screen-reader announces "Live session: <title>" on dialog open.

## Automated checks

- `src/components/classes/LiveSessionRoom.test.tsx` — smoke renders portrait + landscape and asserts the layout class flips.
- Run: `bunx vitest run src/components/classes`
