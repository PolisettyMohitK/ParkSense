# Stark Minimal

ParkSense's design language: dark-first, holographic-on-top, one focal point per
screen. This document is the contract — tokens, components, the HoloLot API and
the engineering rules that keep it from drifting.

**Single source of truth:** `design-tokens/tokens.json`. Every colour, radius,
spacing step, motion duration, easing curve, elevation and 3D scene constant is
declared there and regenerated into both apps:

```bash
cd frontend && npm run tokens   # writes frontend/src/theme/tokens.generated.ts,
                                #        frontend/src/index.css,
                                #        mobile/src/theme/tokens.generated.ts
```

Nothing hardcodes a hex value. The generator **fails the build** if any
body-text / status pair drops below WCAG AA, so contrast cannot regress quietly.

---

## 1. Principles

| Rule | In practice |
| --- | --- |
| One focal point per screen | Explore's search field, Place detail's HoloLot, Bookings' timeline. Max one primary button visible. |
| Dark-first, light-capable | Dark is the signature ("Workshop"); light is the same system on paper ("Blueprint"). Follows the system setting with the existing manual override. |
| Hologram is an accent, not a theme | Cyan appears only on live/interactive states, the 3D view, focus rings, the active nav indicator and data highlights. Never a large fill, never body text. |
| Hairlines over boxes | 1 px translucent strokes, spacing and type hierarchy. Few cards, no heavy shadows, no nested cards. |
| Status is semantic and sacred | free = green, occupied = red, reserved = amber, offline = grey, proposed = violet. Never colour alone — always paired with a glyph and a label. |
| Motion explains | Every animation answers "what changed?" or "where did it go?". No decorative motion. |
| Generous whitespace | When in doubt, remove. Secondary detail collapses behind a tap or hover. |

---

## 2. Palette

### Dark — "Workshop"

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#07090C` | Page background |
| `surface` | `#0E1116` | Cards, panels |
| `surfaceRaised` | `#141821` | Menus, inputs, hover |
| `surfaceSunken` | `#090B0F` | Terminal, wells |
| `surfaceGlass` | `rgba(20,24,33,0.62)` + 20 px blur | Top bar, HUD sheet, capsules |
| `textPrimary` | `#E9EEF5` | Body |
| `textSecondary` | `#9AA4B2` | Supporting |
| `textTertiary` | `#78848F` | Captions, hints |
| `hairline` | `rgba(150,190,230,0.12)` | Default divider |
| `hairlineStrong` | `rgba(150,190,230,0.22)` | Control borders, active HUD |
| `controlBorder` | `#6E7B8C` | Interactive outline (≥3:1) |
| `holo` | `#5CE1FF` | The one accent |
| `holoSoft` | `rgba(92,225,255,0.14)` | Tinted fills, focus halo |
| `holoGlow` | `rgba(92,225,255,0.35)` | Active nav indicator glow |
| `arc` | `#FFB547` | Rare secondary — "your car", payment due |

### Light — "Blueprint"

Same structure, inverted: `canvas #F4F7FA`, `surface #FFFFFF`,
`textPrimary #0B1220`, `textSecondary #4A5568`, `hairline rgba(11,18,32,0.08)`,
`holo #0077B6` (deepened for contrast on paper).

### Status

Semantic colours are identical in both modes: `free #3DDC84/#1A7F37`,
`occupied #FF5A5F/#D70015`, `reserved #FFB547/#B25E00`, `offline #7C8796`,
`proposed #B48CFF`.

### Verified contrast

`design-tokens/build.js` validates every text/status token against
`canvas`, `surface` and `surfaceRaised` in both modes on every run:

```
--- WCAG contrast validation (Stark Minimal) ---
  light  worst pair: controlBorder on canvas → 3.34:1 (min 3:1)
  dark   worst pair: controlBorder on surfaceRaised → 4.12:1 (min 3:1)
✓ All contrast pairs meet WCAG AA
```

Body text and status ≥ 4.5:1; interactive borders and the primary-button label
≥ 3:1. Both verified in the transcript of any token regeneration.

---

## 3. Typography

* **UI:** system stack (`-apple-system` / SF Pro / Inter). No webfont cost.
* **Instrument:** `JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace` —
  every count, price, percentage, duration, bay ID, plate, receipt ref and
  timestamp. This is what makes numbers read as instruments. Loaded on web from
  Google Fonts; on mobile it falls back to Menlo/monospace with **no new font
  dependency**.
* **Tabular figures** are mandatory for anything numeric (`.num`,
  `[data-numeric="true"]`, `fontVariantNumeric: 'tabular-nums'`).

| Step | Size / line | Weight | Tracking |
| --- | --- | --- | --- |
| Display | 40 / 44 | 600 | −0.02em |
| Title | 28 / 32 | 600 | −0.015em |
| Headline | 20 / 26 | 600 | −0.01em |
| Body | 15 / 22 | 400 | 0 |
| Caption | 12 / 16 | 500 | 0 |
| Overline | 11 / 14 | 600 | +0.12em, uppercase |

---

## 4. Shape, depth, motion

**Radius** — `chip 6`, `control 10`, `panel 16`, `pill 999`. The HUD chamfer is
`polygon(0 8px, 8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)`
and is reserved for HUD panels only.

**Elevation** — dark mode has **no drop shadows**. Depth comes from
`inset 0 1px 0 rgba(255,255,255,0.04)` plus a hairline. Light mode has exactly
one soft level: `0 8px 24px rgba(11,18,32,0.06)`.

**Motion** — `fast 120ms`, `base 220ms`, `slow 420ms`, plus `tick 300ms`,
`sweep 900ms`, `pulse 2400ms`. Easings: `out cubic-bezier(0.2, 0.8, 0.2, 1)` and
`standard cubic-bezier(0.4, 0, 0.2, 1)`.

**Reduced motion** is honoured everywhere and collapses to fades:
camera drift, the scanline sweep, aisle chevrons, dust motes and button spring
are all disabled when `prefers-reduced-motion` is set (web) or
`AccessibilityInfo.isReduceMotionEnabled()` is true (mobile).

### Signature micro-details

* **Focus ring** — 2 px holo outline + a 6 px holoSoft halo, keyboard-only via
  `:focus-visible`.
* **Live dot** — 6 px holo dot with a slow 2.4 s pulse, next to anything real-time.
* **Corner ticks** — four 8 px L-shaped hairline ticks on the active HUD panel
  instead of a full border (`CornerTicks` / `HudPanel`).
* **Numeric tick-up** — counts and prices animate old → new over 300 ms.
* **Scanline sweep** — one faint horizontal pass across the lot when live data
  lands, fired once.

---

## 5. Components

| Component | File | Role |
| --- | --- | --- |
| `Stark` | `components/Stark.tsx` | CornerTicks, LiveDot, LiveBadge, NumericReadout, GlassPanel, SectionLabel, WireframeMark, ScanSweep |
| `StarkHooks` | `components/StarkHooks.ts` | `useReducedMotion`, `useTickUp`, `useRovingGrid` |
| `Popover` | `components/Popover.tsx` | Anchored, focus-trapped, Escape/outside-click dismiss |
| `HoloLot` | `components/HoloLot.tsx` | The parking view shell (see §6) |
| `HoloLotHud` | `components/HoloLotHud.tsx` | Zone + counters, compass, controls, live dot (5 elements max) |
| `HoloLotBayReadout` | `components/HoloLotBayReadout.tsx` | Bottom HUD sheet on selection |
| `CityOverview` | `components/CityOverview.tsx` | Staff dashboard: venues as slabs by real lat/lng |
| `PlaceCard`, `CategoryRow`, `PlaceFacts`, `PlaceZones` | `components/` | Explore / place detail building blocks |
| `StatusChip` | `components/StatusChip.tsx` | Tinted fill + 1 px status border + glyph + label |
| `StatCard` | `components/StatCard.tsx` | Overline + mono number + 1 px sparkline |
| `Popover`-based menus | `layouts/TopBarMenus.tsx` | Appearance, account |

Mobile mirrors these in `mobile/src/components/ui.tsx` (`HudPanel`,
`CornerTicks`, `LiveDot`, `NumericReadout`, `Mono`, `TimelineRow`, `Skeleton`,
`WireframeMark`) plus `DemoPills.tsx`.

---

## 6. HoloLot

The holographic parking view. **Every venue and every parking area uses it.**

### Concept

A single parking area floats as a holographic slab above an infinite dark
floor: low-poly terrain with glowing topographic isolines every 0.25 m and a
faint 1 m projected grid, thin bright fresnel rim on the slab edge, soft
reflection pool underneath. Bays are outlined rectangles with a very low
opacity status tint; occupied bays carry a ~200-tri wireframe car. Selected bays
lift 5 cm and raise a vertical light column.

### API

```tsx
interface HoloLotProps {
  siteId: number
  zoneId: number
  zoneName?: string
  bays: HoloLotBay[]            // { id, code, status, proposed?, positionX?, positionY?, polygon? }
  activeBayId?: number | null   // driver's current stay → amber beacon
  selectedBayId?: number | null
  onSelectBay?: (bay: HoloLotBay | null) => void
  selectableStatuses?: HoloLotStatus[]   // drivers: ['AVAILABLE']
  sweepTrigger?: number         // bump → one scanline sweep
  changedBayId?: number | null  // the bay that just changed
  seed?: string                 // deterministic terrain seed
  survey?: SurveyTerrain | null // real survey beats procedural terrain
  loading?: boolean
  height?: number | string
  idle?: boolean                // ambient hero scene, no HUD, no interaction
  overlay?: ReactNode           // e.g. the area switcher
  hud?: boolean
  paletteOverride?: HoloLotPalette
}
```

**Events** — `onSelectBay(bay | null)` on click/tap and Enter; `null` on Esc,
background click or deselection. `sweepTrigger` is the single scanline pass;
`changedBayId` targets the 420 ms car drop-in.

**Fallbacks**, in the order they are evaluated:

1. `prefers-reduced-motion` → the 2D isometric renderer, permanently.
2. No WebGL context → the 2D renderer.
3. 2D mode toggled by the user → the 2D renderer.
4. Canvas scrolled out of view, or `document.hidden` → rendering stops
   (`frameloop="never"`).
5. `IntersectionObserver` gates the dynamic import entirely, so **three.js is
   never fetched on first paint**.

The 2D renderer (`HoloLot2D.tsx` / mobile `HoloLotView.tsx`) is the *same*
scene drawn with the same maths module — projected slab, isolines, bay outlines,
car silhouettes, clock glyphs for reserved bays, selection beam. It is also the
empty-state illustration source and the login hero.

### Geometry & data

* `parsePolygon(raw)` handles both wire formats — seeded
  `"[x,y x,y …]"` and survey/camera `"[[x,y],[x,y],…]"` — by collecting numeric
  literals in order. Returns `null` for anything that cannot yield ≥ 3 finite
  points.
* `buildSceneLayout(bays)` resolves an outline per bay (polygon → position →
  deterministic double-row grid with a central aisle), scales so a typical bay
  is 2.5 m wide, centres the lot on the origin and maps layout `y` onto world
  `z` so the bottom of the plan map is nearest the camera.
* `createTerrainForScene(seed, w, d, survey)` uses a surveyed slope when one
  exists, otherwise deterministic value-noise fBm: amplitude ≤ 0.35 m, slope
  ≤ 2 %, seeded by `siteId + zoneId` so each venue is unique but stable across
  reloads.
* `buildContours(grid, 0.25)` runs marching squares over a 64×64 sample into a
  single `LineSegments`.

### Performance

| Budget | Result |
| --- | --- |
| Viewer chunk ≤ 250 kB gzip **excluding three** | `HoloLotScene` **6.19 kB** gzip |
| three + react-three in its own lazy chunk | `three` 899 kB raw / **240 kB** gzip, never on first paint |
| Draw calls for a 60-bay zone | ~11 (terrain, grid, contours, bay fills, bay outlines, cars, selection beam, chevrons, floor, dust) |
| Idle CPU | Rendering stops completely off-screen or when the tab is hidden; idle drift re-renders only when the yaw actually moves 0.05°, i.e. ~1 fps for a static lot |
| Mobile | SVG isometric renderer — Expo Go compatible, no custom native modules, 60 bays well inside frame budget |

### Accessibility

* A visually-hidden `<ul role="listbox">` mirrors the scene: one button per bay,
  `aria-label="Bay A06, available"`, roving tabindex, arrow-key/Home/End
  navigation, Enter to select.
* Live changes are announced through a throttled `aria-live="polite"` region.
* 2D mode is the accessible, low-power view with upright labels.
* The canvas is `presentation`; the DOM mirror is the source of truth.

---

## 7. Shared 3D maths

`frontend/src/three/hololit.ts` is framework-free and dependency-free (it
imports only `tokens.generated`), so the identical file is imported by the web
renderer and — mirrored at `mobile/src/three/hololit.ts` — by the mobile one.

The two files are byte-identical apart from their docblock because Vite and
Metro are both configured with single-project roots and neither is set up to
reach outside its own directory. Rather than introduce a monorepo/workspace
change, the module is mirrored and the **web copy carries the Vitest suite**
(36 tests) that pins the behaviour for both.

Exports: `parsePolygon`, `buildSceneLayout`, `fallbackLayout`,
`rectangleFootprint`, `polygonCentroid`, `boundsOf`, `createHeightField`,
`createTerrainForScene`, `sampleGrid`, `buildContours`, `buildGridLines`,
`projectPoint`, `fitProjection`, `CAR_SILHOUETTE`, `carWireSegments`,
`pointInPolygon`, `nearestBay`.

---

## 8. Engineering rules

1. **Tokens first.** New colour, radius, spacing, motion or elevation goes in
   `design-tokens/tokens.json`, then `npm run tokens`. Never hardcode hex in a
   component. (The 3D scene reads tokens into shader uniforms — that is the one
   sanctioned exception.)
2. **No API changes.** Backend code, API paths, request/response shapes, auth,
   permissions and business rules are untouched. HoloLot adapts `PublicSpace`
   and `ParkingSpace` in `utils/holoLotAdapter.ts`.
3. **Code splitting.** Heavy deps live behind dynamic `import()` inside lazy
   routes. `three` + `@react-three/*` are in a manual chunk; nothing on first
   paint touches it.
4. **Pin every dependency to an exact version** (`--save-exact`).
5. **Reduced motion is not optional.**
6. **TypeScript budget.** MUI v5 + TS 5.9 will blow past its union-instantiation
   limit on large JSX trees, especially with `<Menu>`, `component={SomeComponent}`
   and `sx` objects interpolated with many theme values. In this codebase:
   * never put `component={...}` on `Box` — use a plain element with `style`;
   * never put `aria-hidden` on a MUI `Box`/`Stack`;
   * prefer plain DOM elements + `style` for rich visual surfaces, keeping MUI
     for layout;
   * split dense trees into sibling components.

   This is why `Popover` replaces MUI's `Menu` and the shell chrome is built
   from plain elements. Both are deliberate, documented workarounds — not
   accidents.
7. **Responsive** 360 px → 1920 px on web, 375×667 → tablet on mobile. No
   horizontal scrolling; the floating tab bar insets content via `floatingTabs`.
8. **One primary action per view.** If two compete, one is demoted.

---

## 9. Screens

| Screen | Change |
| --- | --- |
| **Login / Register** | Split layout: idle HoloLot scene left, minimal form on glass right. On mobile the scene is a dimmed band above the form. Demo accounts stay as quiet mono pills. |
| **Explore** | Hero = one line + live "N bays free" tick-up. Search field is the hero element. One scrollable row of quiet category chips. Cards: 16:10 photo, scrim, one status capsule (dot + free count), name, one meta line. Address and totals removed. |
| **Place detail** | Photo fades into the canvas. HoloLot full-bleed, ~60vh. Area switcher floats over the lot's top-left. Selecting a bay opens the bottom HUD sheet; "Reserve bay A06" continues into the existing booking flow. "How it works" collapses to a dismissible tip. |
| **Booking** | Unchanged server-driven quote, now shown with a shimmer and a mono price readout. |
| **My parking** | Upcoming is a vertical timeline with a "now" marker, each booking a thin row. Active stay is a HUD card with an elapsed-vs-window ring, running charge and check-out. History is thin rows with mono receipt refs. |
| **Payment** | Large mono amount, four minimal method tiles, "Demo checkout — no money is charged" always visible. |
| **Profile** | Two quiet sections (Details, Account) + Administration. No cards in cards. |
| **Dashboard** | Four KPI readouts in a row with sparklines, a city-overview HoloLot (venues as slabs by real lat/lng, glow = occupancy, click → that area), and a live event feed styled as a terminal log with newest on top. |
| **Analytics** | Recharts restyled: baseline + three faint horizontals, holo series, gradient fill to transparent, glass tooltip. Heatmap on a single-hue holo ramp. |
| **Live map / Zone detail** | HoloLot in operator mode: same scene plus per-bay Mark occupied / Mark vacant / Out of service through the existing mutations and `useConfirm`. Proposed (unverified) bays render violet and dashed. |

---

## 10. Before / after

Screenshots are captured per screen at 1440×900 and 375×812, dark and light,
into `docs/design/shots/`. Regenerate with the walkthrough script referenced in
`docs/design/README.md`.

| | Before | After |
| --- | --- | --- |
| Shell | 264 px permanent drawer with grouped labels, opaque bar, role chip in the bar | 72 px icon rail expanding to 240 px on hover/pin, 2 px holo active bar with glow, transparent glass bar that gains a hairline on scroll, role chip moved into the account menu, connection status as a live dot in the rail footer |
| Parking view | CSS-perspective grid / 2.5D SVG with flat coloured boxes | Floating holo slab: isolines, contour grid, fresnel rim, wireframe cars, selection beam, amber "your car" beacon, single scanline sweep on live updates |
| Colour | Monochrome black/white with status colour | Ink surfaces, one holographic accent, sacred semantic status colours |
| Density | Cards on cards, footers on every card | Hairlines and whitespace; secondary detail behind hover |
| Numbers | Proportional | Monospace with tabular figures and 300 ms tick-up |
| Mobile tabs | Full-width bar with labels | Floating glass bar, 16 px radius, inset from the edges, active tab in holo |
