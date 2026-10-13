# ParkSense — Parking Management Platform

Configurable, real-time parking management and analytics platform. Java full-stack
(Spring Boot + React web + Expo mobile) with a Python computer-vision service.

```
Browser (React + TS) ─┐
                      ├── REST/WS ──> Spring Boot backend ──JPA──> MySQL 8.4
Mobile (Expo / RN) ───┘                      ▲
                    occupancy events from CAMERA / SENSOR / MANUAL / QR / PHOTO
```

- `backend/` — Java 21 + Spring Boot 3.2: domain, REST API, JWT security, WebSocket, analytics (source of truth)
- `frontend/` — React 18 + TypeScript + Vite + MUI, Redux Toolkit, TanStack Query, Recharts, STOMP
- `mobile/` — Expo (React Native) + TypeScript: role-aware app (driver + manager), secure token storage, biometric lock, camera capture
- `vision-service/` — Python + OpenCV: slot proposal and occupancy detection over HTTP
- `infrastructure/` — Docker & nginx
- `docs/` — architecture, camera algorithm, ER diagram, API spec, changelog
- `tests/` — cross-service integration tests (future)

## Features

- Organizations → Sites → Zones → Spaces hierarchy
- Structured **and** unstructured (image-mapped, proposed→verified) parking
- Append-only occupancy events from multiple sources; derived space status
- Parking **sessions** (real stays) auto-opened and closed from occupancy, with duration
- Real-time updates over WebSocket (dashboards and map refresh live)
- Reservations with optional/auto space assignment, overlap protection, a price quote,
  driver self check-in/check-out, automatic no-show expiry, and simulated payment
  (sessions settle by card/UPI/wallet/cash)
- **Camera pipeline**: slot proposal (painted-line detection or grid) and occupancy
  detection (reference difference or texture), with idempotent event ingestion
- **In-app camera page** (ADMIN/MANAGER): upload a lot photo, preview proposed slots
  overlaid, import them as PROPOSED spaces, or detect and push occupancy events
- Analytics: utilization over time, peak day/hour heat map, KPIs
- JWT auth with **enforced** ADMIN / MANAGER / USER roles and per-owner scoping
- **Mobile app** (Expo Go): booking, live map, sessions, vehicles, manager occupancy,
  camera capture, admin, biometric lock — see `mobile/README.md`
- **Driver marketplace**: places (cafés, malls, offices…) listed across all organizations,
  searchable and sorted by proximity with live availability — mobile **Explore** and web
  `/explore`
- **Apple-style light & dark themes** on mobile and web, following the system setting with
  a manual override
- Demo seed data in dev (fictional venues across Hyderabad: Jubilee Hills, Inorbit
  Mall Cyberabad, Sarath City Capital Mall, and more)

## Quick start (development)

Prerequisites: JDK 21, Maven, Node 18+, Docker.

1. **Secrets**: `cp .env.example .env` (used by Docker Compose; edit the values as needed).
2. **Database**
   ```bash
   docker compose up -d mysql
   ```
3. **Backend** (must run on JDK 21 — Lombok does not support newer JDKs)
   ```bash
   cd backend
   JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn spring-boot:run   # macOS
   # Homebrew JDK: export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home
   ```
   Runs on `http://localhost:8080` (profile `dev`), seeds demo data, Swagger at
   `/swagger-ui.html`.
4. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Runs on `http://localhost:5173` and proxies `/api` + `/ws` to the backend.

5. **Vision service (optional — camera algorithm)**
   ```bash
   cd vision-service
   python -m venv .venv && .venv/bin/pip install -r requirements.txt
   JWT_SECRET=change-me-dev-secret-please-rotate-in-production-0123456789 \
     PARKING_PASSWORD=manager123 \
     .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```
   `JWT_SECRET` must match the backend's (`app.jwt.secret` in the active profile).
   `--host 0.0.0.0` lets the mobile app reach it over your LAN. Then, with the
   backend running:
   ```bash
   .venv/bin/python scripts/demo_pipeline.py --occupied A06,A08 --push
   ```
   See `docs/architecture/camera-algorithm.md`.

6. **Mobile app (Expo Go)**
   ```bash
   cd mobile
   npm install
   npm start
   ```
   Scan the QR with Expo Go (phone on the same Wi-Fi). The API URL is auto-detected
   from the dev host. See `mobile/README.md`.

### Demo logins

| Role | Email | Password | Can do |
|---|---|---|---|
| Admin | `admin@parking.dev` | `admin123` | Everything |
| Manager | `manager@parking.dev` | `manager123` | Zones, spaces, devices, occupancy, analytics |
| User | `user@parking.dev` | `user123` | View zones/map, book own reservations, manage own vehicles |

## Troubleshooting

**`Unable to determine Dialect without JDBC metadata`**
This means the backend could not connect to MySQL — it is a connection problem, not a
config problem. Check the database is actually up:

```bash
docker compose up -d mysql          # start it
docker ps                            # parking-mysql should be (healthy)
```

Make sure **Docker Desktop is running** before starting the backend (the container will
not start if the daemon is off). Also confirm nothing else owns port 3306:

```bash
lsof -nP -iTCP:3306 -sTCP:LISTEN
```

> On macOS, if Homebrew MySQL is running it will occupy port 3306. Stop it with
> `brew services stop mysql` so the Docker container can use the port.

## Production (Docker)

```bash
cp .env.example .env   # once; secrets live here, not in the compose file
docker compose up --build
```
- Frontend: `http://localhost:8081` (nginx; proxies `/api`, `/ws` and `/vision`)
- Backend: `http://localhost:8080`, profile `prod` (env-driven config, Flyway migrations)
- Vision: `http://localhost:8001`

For the hosted setup (Aiven MySQL + Render + Cloudflare Pages), see
`docs/deployment.md`.

## Documentation

- `docs/deployment.md` — Aiven + Render + Cloudflare Pages deployment
- `docs/architecture/system-architecture.md`
- `docs/architecture/camera-algorithm.md` — slot proposal + occupancy detection
- `docs/database/er-diagram.md`
- `docs/api/api-specification.md` — endpoints + role matrix
- `docs/CHANGELOG.md` — running build log

## Scope note

This build is software-only. There is no camera/hardware integration; manual occupancy
updates use the exact same event interface a camera or sensor would, so detection services
can be plugged in later without changing the core platform.
