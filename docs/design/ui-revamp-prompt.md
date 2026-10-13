# Prompt — ParkSense "Stark" UI/UX revamp + holographic 3D lot view

> Paste everything below the line into the coding agent. It is written to be self-contained.

---

## Role

You are a senior product designer + front-end engineer. Redesign the **ParkSense** parking platform (web + mobile) into a
minimal, premium, futuristic experience inspired by the holographic workshop interfaces in *Iron Man* (Tony Stark's
lab HUDs) — **but restrained**: think Apple-level calm with one layer of holographic precision on top. No clutter, no
crowding, no gratuitous effects. Every pixel earns its place.

Then build a **holographic 3D parking view** ("HoloLot") that every venue and every parking area uses: a floating,
wireframe-lit terrain slab with glowing bays, live status, and cinematic-but-subtle camera motion.

Work in the existing codebase. Do not rewrite the app from scratch, do not change the backend or API contracts.

---

## The product (context you need)

ParkSense is a parking marketplace + operations platform for Hyderabad venues (cafés, malls, offices, hospitals,
hotels). Two audiences:

- **Drivers (role `USER`)**: Explore nearby places → open a place → pick a bay on the lot map (or auto-assign) → book
  with a live price quote → check in on arrival → check out → pay (simulated) → see receipts.
- **Staff (`ADMIN`, `MANAGER`)**: dashboard, analytics (utilization + day/hour heatmap), zones & spaces, live map
  (toggle occupancy), camera/vision slot detection, 2.5D site surveys, sites/devices/users/organizations admin.

Live occupancy arrives over STOMP/WebSocket (`/topic/occupancy`, `/topic/zones/{id}`); pages already subscribe via
`useOccupancyStream`.

### Repo layout

- `frontend/` — React 18 + TypeScript + Vite + **MUI 5** + TanStack Query + Redux Toolkit + framer-motion + Recharts +
  **three@0.186**. Routes in `src/App.tsx` (lazy-loaded), shell in `src/layouts/AppLayout.tsx`, theme in
  `src/theme.ts` + `src/theme/ColorModeProvider.tsx`, tokens generated into `src/theme/tokens.generated.ts`.
- `mobile/` — Expo SDK 57 / React Native 0.86 + TypeScript, React Navigation (tabs + native stack), TanStack Query.
  UI kit in `src/components/ui.tsx`, theme in `src/theme/ThemeProvider.tsx` + `src/theme/palette.ts`.
- `design-tokens/tokens.json` → `node design-tokens/build.js` generates tokens for **both** web and mobile. **All new
  colors, radii, spacing, motion and elevation values go here first**, then are regenerated — never hardcode hex in
  components.

### Files you will mostly touch

Web: `src/theme.ts`, `src/layouts/AppLayout.tsx`, `src/pages/{LoginPage,RegisterPage,ExplorePage,PlaceDetailPage,ReservationsPage,ProfilePage,DashboardPage,AnalyticsPage,ZoneDetailPage,ParkingMapPage}.tsx`,
`src/components/{ParkingLot3DViewer,BookingDialog,PaymentDialog,ActiveStayCard,StatCard,StatusChip,PlacePhotoSlideshow,Skeletons,EmptyState,ErrorState,PageHeader}.tsx`.

Mobile: `src/components/{ui,ParkingLot25DView,PaymentSheet,PlacePhotoSlideshow}.tsx`,
`src/screens/{Explore,PlaceDetail,Bookings,NewReservation,Login,Register,Profile,Home,ZoneDetail,Map}Screen.tsx`,
`src/navigation/RootNavigator.tsx`.

---

## Design language — "Stark Minimal"

### Principles (non-negotiable)

1. **One focal point per screen.** If two things compete, demote one. Max one primary button visible per view.
2. **Dark-first, light-capable.** The signature look is dark (deep graphite, not pure black). Light mode must still be
   beautiful — a "blueprint on paper" variant of the same system — and keep following the system setting with the
   existing manual override.
3. **Hologram is an accent, not a theme.** Holographic cyan appears only on: live/interactive states, the 3D view,
   focus rings, the active nav indicator, and data highlights. Never on large fills or body text.
4. **Hairlines over boxes.** Prefer 1px translucent strokes, spacing and type hierarchy to separate content. Few cards,
   no heavy shadows, no nested cards.
5. **Status colors are semantic and sacred**: free = green, occupied = red, reserved = amber, offline = grey,
   proposed = violet. Keep the existing `status*` tokens' meaning; you may retune values for contrast on the new
   surfaces. Status must never rely on color alone (pair with icon/label/shape).
6. **Motion explains, never decorates.** Every animation answers "what changed?" or "where did it go?".
7. **Generous whitespace, fewer elements.** When in doubt, remove. Collapse secondary info behind a tap/hover.

### Palette (add to `tokens.json`, both modes)

Dark ("Workshop"):
- `canvas` #07090C, `surface` #0E1116, `surfaceRaised` #141821, `surfaceGlass` rgba(20,24,33,0.62) + 20px backdrop blur
- `textPrimary` #E9EEF5, `textSecondary` #9AA4B2, `textTertiary` #5D6775
- `hairline` rgba(150,190,230,0.12), `hairlineStrong` rgba(150,190,230,0.22)
- `holo` #5CE1FF (primary accent), `holoSoft` rgba(92,225,255,0.14), `holoGlow` rgba(92,225,255,0.35)
- `arc` #FFB547 (rare secondary accent — warnings, "your car", payment due)
- Status (dark): free #3DDC84, occupied #FF5A5F, reserved #FFB547, offline #7C8796, proposed #B48CFF

Light ("Blueprint"):
- `canvas` #F4F7FA, `surface` #FFFFFF, `surfaceGlass` rgba(255,255,255,0.72) + blur
- `textPrimary` #0B1220, `textSecondary` #4A5568, `hairline` rgba(11,18,32,0.08)
- `holo` #0077B6 (deeper cyan for contrast), `holoSoft` rgba(0,119,182,0.10)
- Status (light): keep current light status tokens.

All text/background pairs must meet **WCAG AA** (4.5:1 body, 3:1 large text & UI). Verify and adjust.

### Typography

- Keep the system font stack for UI (SF Pro / Inter fallback). Add a **monospace** token (`"JetBrains Mono", "SF Mono",
  ui-monospace`) used *only* for codes, plate numbers, bay IDs, timestamps and numeric readouts in the HUD — this is the
  "instrument" feel. Load JetBrains Mono from Google Fonts on web; on mobile use `Menlo`/`monospace` fallbacks (no new
  font dependency unless via `expo-font` with a bundled file).
- Scale: Display 40/44 semibold, Title 28/32, Headline 20/26, Body 15/22, Caption 12/16, Overline 11/14 tracking +0.12em
  uppercase. Use tabular numbers for all counts/prices (`font-variant-numeric: tabular-nums`).

### Shape, depth, motion tokens

- Radius: 6 (chips), 10 (inputs/buttons), 16 (sheets/panels), 999 (pills). Cut-corner variant (8px 45° chamfer via
  `clip-path`) reserved for the HUD panels only.
- Elevation: no drop shadows in dark mode; use `hairline` + inner glow (`inset 0 1px 0 rgba(255,255,255,0.04)`).
  Light mode: one soft shadow level `0 8px 24px rgba(11,18,32,0.06)`.
- Motion: `fast 120ms`, `base 220ms`, `slow 420ms`; easing `cubic-bezier(0.2, 0.8, 0.2, 1)` (out) and
  `cubic-bezier(0.4, 0, 0.2, 1)` (standard). Respect `prefers-reduced-motion` / RN `AccessibilityInfo.isReduceMotionEnabled`
  — reduce to fades, disable camera drift, scan sweeps and parallax.

### Signature micro-details (use sparingly)

- **Focus ring**: 2px `holo` outline + 4px `holoSoft` halo. Keyboard-only (`:focus-visible`).
- **Live dot**: 6px `holo` dot with a slow 2.4s pulse next to anything real-time ("Live", connection chip).
- **Corner ticks**: four 8px L-shaped hairline ticks on the corners of the active HUD panel (instead of a full border).
- **Numeric tick-up**: counts/prices animate from old → new value in 300ms when they change.
- **Scanline sweep**: a single faint horizontal gradient pass across the 3D view when live data updates (once, 900ms).

---

## Screen-by-screen direction

Keep all existing routes, data flows, permissions, validation and copy semantics. Reorganize and restyle.

### Global shell (web `AppLayout`, mobile tabs)

- Web: slim 72px **icon rail** (expand to 240px on hover/pin) with a hologram active indicator (2px vertical bar + soft
  glow). Top bar becomes transparent glass that gains a hairline on scroll. Remove the role chip from the bar (move to
  the avatar menu). Connection status = live dot + "Live" in the rail footer.
- Mobile: floating glass tab bar (blurred, 16px radius, inset from edges), 4–5 tabs max, active tab icon in `holo`.
- Page headers: overline (section) + title only. Subtitles only where they add information.

### Login / Register

- Split layout on desktop: left = full-height HoloLot "idle" scene (slowly orbiting generic lot, no data needed),
  right = minimal form on glass. Mobile: scene as a dim backdrop behind the form.
- Demo-account chips stay (they matter for evaluators), styled as subtle mono pills.

### Explore (driver home)

- Hero: one line — "Parking near you" + live total "95 bays free" (tick-up numeric).
- Search field is the hero element (large, glass, ⌘K on web).
- Category filters as a single scrollable row of quiet chips.
- Place cards: 16:10 photo, gradient scrim, **one** status capsule (free count with colored dot), name, a single meta
  line (category · distance · price). Remove secondary lines from the card (address, totals) — show on hover/press.
- Optional toggle **List / Map**: map mode shows venues as glowing pins on a dark minimalist map (only if achievable
  without new paid APIs; otherwise skip).
- Active stay banner becomes a compact glass "HUD strip" pinned at the top: venue · bay · running charge · [Check out].

### Place detail

- Top: photo slideshow fades into the canvas (no hard edge). Title, price pill, open hours, distance, Directions.
- **The HoloLot 3D view is the centerpiece**, full-bleed width, ~60vh on desktop / 55% height on mobile.
- Area (zone) switcher as segmented control floating over the 3D view's top-left.
- Selecting a bay opens a **bottom HUD sheet** (not a dialog) with bay ID (mono), status, and "Reserve bay A06".
  "Reserve" continues into the existing `BookingDialog` / `NewReservationScreen` flow restyled as a stepper sheet.
- "How it works" collapses into a single dismissible tip.

### Booking flow (BookingDialog / NewReservationScreen)

- Becomes a 3-step sheet: **Where** (place · area · bay, with mini 3D thumbnail of the chosen bay) → **When** (arrival
  chips + duration slider) → **Confirm** (summary + big price readout in mono, tick-up on change).
- Price quote stays server-driven (`placesApi.quote`); show a shimmer, never a spinner, while it refreshes.

### My parking / Bookings

- Upcoming = vertical timeline with a "now" marker; each booking a thin row, expand on tap for actions.
- Active stay = large HUD card with an animated ring showing elapsed time vs booked window, running charge, Check out.
- Payment sheet: amount as a large mono readout, method selector as 4 minimal tiles, "Demo checkout — no money is
  charged" note stays visible.
- History: compact table/list with receipt refs in mono; payment status as small chips.

### Profile

- Two quiet sections (Details, Security) + Payments summary. No cards-in-cards.

### Staff dashboard & analytics

- Dashboard: 4 KPI readouts in a single row (mono numbers, tiny sparkline under each), a **city overview HoloLot**
  (all venues as small floating slabs arranged by real lat/lng, each slab's glow = occupancy; click → that venue), and a
  live event feed styled as a terminal log (newest on top, fades older lines).
- Analytics: keep Recharts but restyle — no gridline clutter (only baseline + 3 faint horizontals), `holo` series,
  gradient area fill to transparent, crosshair tooltip in glass. Heatmap uses a single-hue `holo` ramp.
- Live map / zone detail: reuse HoloLot in **operator mode** (see below).

### Empty, loading, error states

- Skeletons with a subtle left-to-right shimmer in `holoSoft`; never spinners for content (spinners only inside buttons).
- Empty states: one line + one action, with a tiny wireframe illustration rendered from the same 3D style (static SVG
  is fine).

---

## HoloLot — the futuristic 3D parking view

Replace `frontend/src/components/ParkingLot3DViewer.tsx` (currently a CSS-perspective grid) and
`mobile/src/components/ParkingLot25DView.tsx` with a shared concept, implemented per platform.

### Visual concept

A single parking area floats as a **holographic slab** above an infinite dark floor:

- **Terrain slab**: a low-poly ground mesh with gentle elevation. Rendered as dark translucent material + **glowing
  contour lines** (topographic isolines every ~0.25 m of elevation) + a faint 1 m grid projected on top. Slab edges
  have a thin bright rim (fresnel glow). Underneath, a soft reflection/shadow on the floor sells the "floating" feel.
- **Bays**: drawn as **outlined rectangles** (1.5–2px emissive lines) slightly above the surface, filled with a very
  low-opacity status tint. Bay ID in mono floating flat on the ground.
  - Free: green outline, gentle 3s breathing glow.
  - Occupied: red outline + a **minimal low-poly car silhouette** (wireframe + dark glass body, ~200 tris, 4 color
    variants of graphite/silver), not cartoon cars.
  - Reserved: amber dashed outline, small clock glyph.
  - Out of service: grey hatched fill, no glow.
  - Selected: outline thickens, bay lifts 4–6 cm, a vertical light beam/column rises from it, camera eases to frame it.
  - "Your car" (driver's active stay): `arc` amber beacon pulse above the bay.
- **Drive aisle + entry**: subtle animated chevrons along the aisle toward the entry, very low opacity.
- **Atmosphere**: one directional key light + cool rim light; `holo` tinted fog at distance; optional bloom (thin, only
  on emissive lines, strength ≤ 0.6). No lens flares, no particles storms. At most a few slow floating dust motes.
- **HUD overlay (DOM, not WebGL)**: corner ticks, zone name (overline), live counters "12 free · 36 occupied" in mono,
  compass/north arrow, zoom +/-, reset view, 2D/3D toggle. Max 5 overlay elements.

### Geometry & data (must use real data)

Inputs already available:

- Bays: `PublicSpace { id, code, label, status, positionX, positionY, polygon }` from
  `GET /api/places/{siteId}/zones/{zoneId}/spaces` (drivers) — staff pages use `ParkingSpace` with the same fields
  plus `verificationStatus`/`operationalState`.
- `polygon` comes in **two formats** — handle both:
  - seeded: `"[x,y x,y x,y x,y]"` (space-separated pairs inside brackets)
  - surveys/camera: JSON `"[[x,y],[x,y],...]"`
  Write one tested `parsePolygon(raw): [number, number][] | null` helper per platform.
- If no polygon: build a 2.5 × 5 m rectangle centered on `positionX/positionY`. If no position either: lay bays out in
  a tidy double-row grid with a central aisle (deterministic by `code`).
- Coordinates are layout units (seeds use ~92 px per column / 112 px per row). Normalize: compute bounds, map to a
  metric-ish scene (1 bay ≈ 2.5 m wide), center at origin.
- Terrain: when a site survey exists (`SiteSurvey.reportJson` → `dimensions.lengthM/breadthM`,
  `terrain.global_slope_pct`, `terrain.slope_pct_mean/max`; `layoutJson` → `bays[{ centre:[x,y], angleDeg }]`), use it
  for slab size and slope. Otherwise generate **deterministic procedural terrain** seeded by `siteId + zoneId` (gentle
  simplex noise, amplitude ≤ 0.35 m, plus a slope ≤ 2%), so each venue looks unique but stable across reloads.
- Multi-level zones (zone `floor` like "Level 2"): render as **stacked slabs** in the overview, with the selected level
  expanded and others ghosted at 15% opacity.
- Live updates: on `useOccupancyStream` events for this zone, animate only the changed bay (car fades/drops in over
  420ms, outline recolors), then trigger the single scanline sweep. Never rebuild the whole scene on an update.

### Camera & interaction

- Default: 3/4 isometric-ish perspective (≈ 35° elevation), very slow idle drift (±3° yaw over 20s), paused on user
  input and when off-screen or tab hidden.
- Orbit (drag), zoom (wheel/pinch), pan (right-drag/two-finger) with damping and clamped limits (no going under the
  floor, no losing the lot). Double-click/tap a bay = select + frame. Esc / tap empty = deselect.
- **2D mode**: animate the camera to top-down orthographic-feel with labels upright — this is also the accessible,
  low-power mode.
- Hover (web): bay rim brightens + tooltip chip (bay ID · status). Only free bays are selectable for drivers.
- **Operator mode** (staff, Zone detail / Live map): same scene, plus per-bay context action (Mark occupied / Mark
  vacant / Out of service) via the existing mutations and `useConfirm` confirmations; proposed (unverified) bays shown
  in violet dashed outlines.
- **Keyboard & a11y**: the canvas is decorative-plus; provide a parallel visually-hidden list of bays (buttons with
  `aria-label="Bay A06, available"`) synced with selection, arrow-key navigation between bays, Enter to select.
  Announce live changes via an `aria-live="polite"` region (throttled).

### Implementation — web

- Use `three@0.186` (already installed) with **`@react-three/fiber` + `@react-three/drei`** (add pinned versions
  compatible with React 18, e.g. fiber 8.x / drei 9.x) and `@react-three/postprocessing` for bloom only if the budget
  allows. Lazy-load the whole viewer chunk (it must not enter the main bundle; keep `three` in its own chunk as today).
- Contour lines: generate from the height field (marching squares) once per terrain, as a single `LineSegments`
  geometry, or use a shader-based isoline on the slab material (`fract(height / interval)` with `fwidth` anti-aliasing).
- Bays: **one `InstancedMesh`** for fills and one merged `LineSegments`/`Line2` for outlines (per-instance color via
  instance attributes). Cars: one `InstancedMesh` per variant. Target ≤ 30 draw calls for a 60-bay zone.
- `frameloop="demand"`: render only on interaction, idle drift ticks, or data changes. Pause when
  `document.hidden` or the canvas is out of viewport (IntersectionObserver).
- Dispose geometries/materials/textures on unmount (see the cleanup pattern already in `SurveyReviewPage.tsx`).
- WebGL unavailable or `prefers-reduced-motion` + low-power → fall back to the 2D SVG renderer of the same layout
  (write it; it is also used for empty-state illustrations and thumbnails).

### Implementation — mobile (Expo SDK 57)

- Preferred: `expo-gl` + `three` + `@react-three/fiber/native` (install with `npx expo install` so versions match the
  SDK). Must run in **Expo Go** (no custom native modules).
- If the GL path can't hit performance targets on a mid-range Android, ship an **isometric SVG renderer**
  (`react-native-svg`, via `npx expo install`) of the same scene: projected slab, contour lines, bay outlines, car
  silhouettes, with `react-native-reanimated` for selection/pulse — it must look like the same product.
- Gestures with `react-native-gesture-handler` (pan/pinch/tap). Bottom HUD sheet for the selected bay.
- Keep the existing behavior: tapping a free bay then "Reserve bay X" navigates to `NewReservation` with
  `{ siteId, zoneId, spaceId }`.

### Performance budget (must measure and report)

- Web: first meaningful 3D frame < 800 ms after data arrives on a mid laptop; 60 fps while orbiting a 60-bay zone;
  idle CPU ~0 when not interacting; viewer chunk ≤ 250 kB gzip excluding `three`.
- Mobile: ≥ 50 fps on a mid-range Android in Expo Go for 60 bays, or the SVG fallback.
- No layout shift: reserve the viewer's height with a skeleton slab.

---

## Engineering rules

- **Do not change** backend code, API paths, request/response shapes, auth, permissions, or business rules.
- Keep all current functionality: booking, quotes, check-in/out, payment, role gating, live updates, staff CRUD,
  confirmations, validation, error/empty states, deep links (`/reservations?siteId&zoneId&spaceId`).
- Tokens first: extend `design-tokens/tokens.json`, run `node design-tokens/build.js`, consume via `theme.ts` (web) and
  `palette.ts` (mobile). No hardcoded hex values in components (the 3D scene may read tokens into shader uniforms).
- Reuse existing components; restyle rather than duplicate. Shared 3D math (polygon parsing, normalization,
  procedural terrain, contour generation) goes in a framework-free module with unit tests (Vitest on web; plain TS
  functions importable by mobile).
- Keep code split: new heavy deps only inside lazy routes/components.
- Pin every new dependency to an exact version.
- Responsive: web 360px → 1920px; mobile small phones (375 × 667) to tablets. No horizontal scrolling.
- Accessibility: AA contrast, visible focus, keyboard paths for every action, screen-reader labels, reduced motion.

## Verification before you finish

Run and paste results:

1. `cd frontend && npm run lint && npm run typecheck && npm test && npm run build` — all green; report bundle sizes.
2. `cd mobile && npx tsc --noEmit` — clean.
3. `cd backend && mvn -q test` — still green (you should not have touched it).
4. Manual walkthrough (screenshots, dark + light, desktop + 375px wide):
   driver: Explore → place → select bay in HoloLot → book → My parking → check in → check out → pay → history;
   staff: dashboard city overview → zone detail operator mode → toggle a bay (watch the live update + sweep) → analytics.
5. Lighthouse (web) accessibility ≥ 95 on Explore and Place detail.
6. A short `docs/design/stark-minimal.md` documenting tokens, components, the HoloLot API (props, events, fallbacks)
   and before/after screenshots.

## What "done" looks like

Calm, dark, precise screens with lots of space; one glowing accent; numbers that feel like instruments; and a 3D lot
that makes people say "that's Stark tech" — while a first-time driver can still book a bay in under 30 seconds.
