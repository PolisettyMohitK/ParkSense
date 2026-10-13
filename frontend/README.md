# Frontend — React + TypeScript (web)

Browser app for ParkSense: the driver marketplace (explore, book, check in/out,
pay, profile) and the staff/admin console (zones, spaces, live map, camera
pipeline, surveys, analytics, CRUD). Talks to the Spring Boot API and the vision
service.

## Stack

React 18 · TypeScript · Vite · MUI + Emotion · Redux Toolkit (auth slice) ·
TanStack Query · Axios · STOMP over SockJS · Recharts · three.js (lazy) ·
Vitest + Testing Library · ESLint.

## Run

The backend must be up on `http://localhost:8080` (see `backend/README.md`).

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api, /ws and /vision
```

`.env.example` documents the two optional overrides:

```
VITE_API_URL=https://parksense-api.onrender.com/api
VITE_VISION_URL=https://parksense-vision.onrender.com
```

Without them the dev server proxies to localhost.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with API/WS/vision proxy |
| `npm run build` | `tsc -b && vite build` → `dist/` |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm test` | Vitest (run once); `test:watch` to iterate |

## Structure

```
src/
  api/         axios client, endpoints, vision client (JWT on every call)
  components/  shared UI incl. booking, payment and active-stay components
  pages/       route pages (driver + staff + admin)
  store/       Redux auth slice, hooks
  theme/       MUI theme from design-tokens/
  hooks/       WebSocket, debounce, geolocation, ...
```

## Deploy (Cloudflare Pages)

- Root directory `frontend`, build `npm ci && npm run build`, output `dist`.
- Set `VITE_API_URL` and `VITE_VISION_URL` (Production and Preview).
- `public/_redirects` (SPA fallback) and `public/_headers` (caching + security
  headers) are copied into the build automatically.

Full walkthrough: `docs/deployment.md`.
