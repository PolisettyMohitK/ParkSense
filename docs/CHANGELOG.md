# Changelog

All changes to the Parking Management Platform are logged here.
Format: date — phase — files added/changed — why — how to verify.

---

## 2026-09-23 — Phase 1: Backend bootstrap

### Added
- `backend/pom.xml` — Maven project, Spring Boot 3.2.5 parent, Java 21.
  Dependencies: web, data-jpa, security, validation, websocket, MySQL connector,
  Lombok, MapStruct 1.5.5, jjwt 0.12.5, springdoc-openapi 2.3.0, test + security-test.
  Compiler configured with Lombok + MapStruct annotation processors.
- `backend/src/main/resources/application.properties` — app name, default profile `dev`.
- `backend/src/main/resources/application-dev.properties` — local MySQL
  (`localhost:3306/parking_platform`, user/pass `parking`), `ddl-auto=update`, SQL logging,
  JWT dev secret, CORS origins `localhost:5173/3000`.
- `backend/src/main/resources/application-prod.properties` — env-var driven datasource,
  `ddl-auto=validate`, JWT secret from env.
- `backend/src/main/java/com/parking/platform/ParkingPlatformApplication.java` — Spring Boot entrypoint.
- `config/CorsConfig.java` — CORS for `/api/**` from configured origins.
- `config/OpenApiConfig.java` — OpenAPI/Swagger metadata + JWT bearer scheme.
- `security/SecurityConfig.java` — temporary permit-all filter chain
  (stateless, CSRF off). **To be hardened with JWT in Phase 7.**
- `controller/HealthController.java` — `GET /api/health` liveness endpoint.

### Why
Establish a runnable, dependency-complete backend before writing domain code, so every
later phase compiles and runs in IntelliJ with no further project setup.

### How to verify
1. IntelliJ: right-click `backend/pom.xml` → **Add as Maven Project** (or Load Maven Project).
2. Start MySQL: from repo root `docker compose up -d mysql`.
3. Run `ParkingPlatformApplication` (profile `dev`) or `cd backend && mvn spring-boot:run`.
4. Open `http://localhost:8080/api/health` → `{"status":"UP",...}`.
5. Swagger UI: `http://localhost:8080/swagger-ui.html`.

### Manual steps required (not automatable)
- IntelliJ Project SDK set to JDK 21.
- `docker compose up -d mysql` (Docker CLI not on this agent's PATH).

### Verified end-to-end
- `mvn compile` → BUILD SUCCESS (must run on JDK 21; see note below).
- Docker MySQL 8.4 started via `docker compose up -d mysql`, became healthy.
- App booted: `HikariPool-1 - Start completed`, `Initialized JPA EntityManagerFactory`.
- `GET /api/health` → `{"status":"UP",...}`; `GET /v3/api-docs` → 200.

### Post-bootstrap fix — database port conflict
- Symptom: `Access denied for user 'parking'@'localhost'`; JPA could not connect.
- Cause: a Homebrew MySQL 9.7.1 service was already listening on `127.0.0.1:3306`
  (root/root, no `parking` user), while Docker MySQL held the IPv6 side of `3306`.
- Resolution: `brew services stop mysql` (stops and unloads the launch agent so it does
  not restart at login). Docker now owns `3306`. Verified `parking/parking` reaches
  `parking_platform`.
- Hardened `application-dev.properties`: JDBC URL changed `localhost` → `127.0.0.1`
  to avoid IPv4/IPv6 ambiguity. Removed explicit `hibernate.dialect` (auto-detected;
  removes Hibernate deprecation warning).

### Important note for running Maven
- Lombok's annotation processor does **not** work on JDK 26 (installed on this machine).
  Always build/run with JDK 21. In IntelliJ, `File > Project Structure > Project SDK`
  and `Settings > Build Tools > Maven > Importing/Runner JRE` must both be JDK 21.
  Command line: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` (or the Homebrew
  openjdk@21 path).

---

## 2026-09-23 — Phase 2: Domain model (entities + enums)

### Added — enums (`entity/enums/`)
`Role` (ADMIN, MANAGER, USER), `ZoneType` (STRUCTURED, UNSTRUCTURED),
`SpaceStatus` (AVAILABLE, OCCUPIED, RESERVED, OUT_OF_SERVICE),
`VerificationStatus` (PROPOSED, VERIFIED, REJECTED),
`ReservationStatus` (PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED, EXPIRED),
`EventSource` (CAMERA, SENSOR, MANUAL, QR, PHOTO),
`OccupancyState` (OCCUPIED, VACANT, UNKNOWN),
`DeviceType` (CAMERA, SENSOR, MANUAL),
`DeviceStatus` (ONLINE, OFFLINE, MAINTENANCE),
`VehicleType` (CAR, BIKE, SUV, TRUCK, EV, OTHER).

### Added — entities (`entity/`)
`BaseEntity` — `@MappedSuperclass` with identity `id`, audited `createdAt`/`updatedAt`
(Spring Data auditing), Lombok `@SuperBuilder`.
`Organization`, `User`, `Vehicle`, `ParkingSite`, `ParkingZone`, `ParkingSpace`,
`Reservation`, `OccupancyEvent`, `MonitoringDevice`.

Key modeling decisions (aligned to the abstract):
- `Organization → Site → Zone → Space` hierarchy from day 1.
- `ParkingZone.type` supports STRUCTURED vs UNSTRUCTURED; `mapImageUrl` for
  image-assisted mapping; `description` as text.
- `ParkingSpace` carries `verificationStatus` (PROPOSED/VERIFIED/REJECTED) and a
  `polygon` (TEXT/JSON) + `positionX/Y` for irregular/assisted mappings; `code` is
  nullable until a proposed space is verified.
- `OccupancyEvent` is append-only: `state`, `source`, `confidence`, optional
  `actorUser`, optional `device`, `occurredAt`; indexed by `space_id, occurred_at`.
- `MonitoringDevice` attaches to a `ParkingZone` (zone-level coverage), not per-space.
- All `@ManyToOne` are LAZY; enums persist as STRING; explicit table/unique/index names.

### Added — config
`config/JpaConfig.java` — `@EnableJpaAuditing` so `createdAt`/`updatedAt` populate.

### Verified
- `mvn compile` → BUILD SUCCESS (26 source files).
- App boot with `spring.jpa.hibernate.ddl-auto=update`; no mapping/schema errors.
- `SHOW TABLES` in `parking_platform` → all 9 tables present:
  organizations, users, vehicles, parking_sites, parking_zones, parking_spaces,
  reservations, occupancy_events, monitoring_devices.

---

## 2026-09-23 — Phase 3: Repositories

### Added (`repository/`)
Spring Data JPA interfaces for every aggregate:
- `OrganizationRepository` — `findByCode`, `existsByCode`, `findAllByActiveTrue`.
- `UserRepository` — `findByEmail`, `existsByEmail`, `findAllByOrganizationId`, `findAllByRole`.
- `VehicleRepository` — `findAllByOwnerId`, `findByPlateNumber`, `existsByPlateNumber`.
- `ParkingSiteRepository` — by organization and org+code.
- `ParkingZoneRepository` — by site, site+type, site+code.
- `ParkingSpaceRepository` — by zone/status/verification, `findFirstByZoneIdAndStatusAndActiveTrue`
  (auto space assignment), counts by zone and zone+status.
- `ReservationRepository` — by user/zone/status plus `findOverlapping(...)` JPQL overlap query.
- `OccupancyEventRepository` — history by space, `findFirstBySpaceIdOrderByOccurredAtDescIdDesc`
  (latest state), by period, by zone+period (analytics), count by space+state.
- `MonitoringDeviceRepository` — by zone, zone+code.

### Verified
- `mvn compile` → BUILD SUCCESS (35 source files).
- App boot → Spring Data created all repository proxies with no
  `QueryCreationException`/`PropertyReferenceException`; all derived queries valid.

---

## 2026-09-23 — Phase 4: DTOs + MapStruct mappers

### Added — request DTOs (`dto/request/`)
`LoginRequest`, `RegisterRequest`, `OrganizationRequest`, `UserRequest`,
`VehicleRequest`, `ParkingSiteRequest`, `ParkingZoneRequest`, `ParkingSpaceRequest`,
`OccupancyEventRequest`, `ReservationRequest`, `MonitoringDeviceRequest`.
Java records with Bean Validation annotations.

### Added — response DTOs (`dto/response/`)
`AuthResponse`, `OrganizationResponse`, `UserResponse`, `VehicleResponse`,
`ParkingSiteResponse`, `ParkingZoneResponse` (includes live total/occupied/available),
`ParkingSpaceResponse`, `OccupancyEventResponse`, `ReservationResponse`,
`MonitoringDeviceResponse`, `ZoneOccupancyResponse`.

### Added — mappers (`mapper/`)
MapStruct `@Mapper(componentModel="spring")` interfaces for all 9 entities:
`OrganizationMapper, UserMapper, VehicleMapper, ParkingSiteMapper, ParkingZoneMapper,
ParkingSpaceMapper, OccupancyEventMapper, ReservationMapper, MonitoringDeviceMapper`.
Response mappers flatten nested associations to ids/names (e.g. `zone.id → zoneId`).
Entity-target unmapped fields are ignored; services set associations explicitly.

### Verified
- `mvn compile` → BUILD SUCCESS (66 source files); MapStruct implementations generated.

---

## 2026-09-23 — Phase 5: Exception handling, services, occupancy engine

### Added — errors (`exception/`, `dto/response/`)
`ResourceNotFoundException`, `BadRequestException`, `ConflictException`,
`ApiErrorResponse` (record), `GlobalExceptionHandler` (`@RestControllerAdvice`)
covering 404/400/409, Bean Validation field errors, and generic 500.

### Added — services (`service/`)
- `OrganizationService`, `UserService`, `VehicleService`, `ParkingSiteService`,
  `ParkingZoneService`, `ParkingSpaceService`, `MonitoringDeviceService` — CRUD with
  uniqueness/ownership validation and DTO mapping. `UserService` hashes passwords
  with `PasswordEncoder` (BCrypt bean added in `SecurityConfig`).
- `OccupancyService` — the occupancy engine. `recordEvent(...)` appends an immutable
  `OccupancyEvent` and derives `ParkingSpace.status` from the latest event
  (OCCUPIED→OCCUPIED, VACANT→AVAILABLE; keeps RESERVED/OUT_OF_SERVICE otherwise).
  Publishes an `OccupancyChangedEvent` via `ApplicationEventPublisher` (wired to
  WebSocket in Phase 8). Provides latest-state, per-space history, and per-zone queries.
- `ReservationService` — validates times, prevents overlapping active reservations in a
  zone, generates a reservation code, and auto-assigns the first available space when
  none is provided. Supports cancel/complete/list.
- `CodeGenerator` (util) — human-readable reservation codes.

### Verified
- `mvn compile` → BUILD SUCCESS.
- App boot: no errors; `PasswordEncoder` bean resolved.

---

## 2026-09-23 — Phase 6: REST controllers

### Added (`controller/`)
- `OrganizationController` `/api/organizations`
- `UserController` `/api/users`
- `VehicleController` `/api/vehicles` (filter `?ownerId=`)
- `ParkingSiteController` `/api/parking/sites` (filter `?organizationId=`)
- `ParkingZoneController` `/api/parking/zones` (filter `?siteId=`, `GET /{id}/occupancy`)
- `ParkingSpaceController` `/api/parking/spaces` (filter `?zoneId=`, `PATCH /{id}/verify`,
  `PATCH /{id}/status`)
- `OccupancyController` `/api/occupancy` (`POST /events`, `GET /spaces/{id}/latest`,
  `GET /spaces/{id}/history`, `GET /zones/{id}?from=&to=`)
- `ReservationController` `/api/reservations` (`PATCH /{id}/cancel`, `PATCH /{id}/complete`)
- `MonitoringDeviceController` `/api/devices` (filter `?zoneId=`)
All request bodies `@Valid`; create returns 201; delete returns 204.

---

## 2026-09-23 — Phase 7: JWT security + roles

### Added (`security/`)
- `UserPrincipal` (UserDetails), `CustomUserDetailsService`, `JwtService` (HS256, jjwt),
  `JwtAuthenticationFilter` (Bearer token → SecurityContext).
- `AuthService` + `AuthController`: `POST /api/auth/register` (always USER),
  `POST /api/auth/login`, `GET /api/auth/me`.
- `SecurityConfig`: stateless, BCrypt `PasswordEncoder`, `DaoAuthenticationProvider`,
  `AuthenticationManager`, `@EnableMethodSecurity`; public: auth, health, `/ws/**`,
  swagger; everything else authenticated. JSON 401 entry point + 403 access-denied handler.

---

## 2026-09-23 — Phase 8: WebSocket real-time occupancy

### Added
- `config/WebSocketConfig` — STOMP + SockJS endpoint `/ws`, simple broker `/topic`.
- `websocket/OccupancyBroadcaster` — listens for `OccupancyChangedEvent` and publishes to
  `/topic/occupancy` and `/topic/zones/{zoneId}`. Fired on every occupancy event, so
  connected dashboards update without refresh.

---

## 2026-09-23 — Phase 9: Demo seed data

### Added
- `config/DemoDataSeeder` (`@Profile("dev")`, runs only when no organization exists):
  1 organization, 3 users, 1 site, 2 zones (structured L1, unstructured YARD),
  16 spaces (12 verified coded + 4 proposed uncoded with polygons), 1 camera device,
  1 vehicle, 1 confirmation reservation, and occupancy events.
- Demo logins: `admin@parking.dev/admin123`, `manager@parking.dev/manager123`,
  `user@parking.dev/user123`.

### Verified end-to-end (live API)
- `GET /api/health` (no auth) → 200.
- `GET /api/organizations` (no auth) → **401** JSON `{"status":401,...}`.
- Bad login → 401; admin login → JWT (~198 chars).
- `GET /api/organizations` (auth) → seeded org.
- `GET /api/parking/zones` → `L1 STRUCTURED total 12`, `YARD UNSTRUCTURED total 4`.
- `GET /api/parking/spaces` → 16.
- `POST /api/occupancy/events` (A05, OCCUPIED, MANUAL) → 201; zone occupancy recomputed
  (`occupied 2, reserved 1, available 9`).
- `GET /api/reservations` → `RES-DEMO0001 CONFIRMED Level 1 A01`.

### Backend status: phases 1–9 complete. Next: Phase 10 frontend (Vite + React + TS).

---

## 2026-09-23 — Phase 10–11: React frontend

### Scaffold (`frontend/`)
Vite 5 + React 18 + TypeScript, React Router 6, Redux Toolkit (auth),
TanStack Query (server state), Axios, MUI 5 + Emotion, Framer Motion, GSAP, Recharts,
Notistack, STOMP (`@stomp/stompjs`) + SockJS.
`vite.config.ts` proxies `/api` and `/ws` (ws: true) to `localhost:8080`, so no CORS in dev.

### Structure
- `types/` — TS models mirroring every backend DTO + enums.
- `api/` — `client.ts` (Axios + token interceptor + 401 auto-logout), `auth`, `parking`
  (org/site/zone/space), `occupancy`, `reservations`, `resources` (vehicles/users/devices).
- `store/` — `authSlice` (token + user persisted to localStorage), typed hooks.
- `theme.ts` — dark indigo/cyan theme, Space Grotesk headings, glass surfaces.
- `layouts/AppLayout.tsx` — responsive drawer nav (role-filtered), sticky topbar with
  user menu, page transitions.
- `components/` — PageHeader, StatCard, StatusChip, ConfirmDialog, EmptyState, LoadingState.
- `websocket/socket.ts` + `hooks/useOccupancyStream.ts` — single STOMP connection, fan-out
  to subscribers; live updates without refresh.

### Pages
Login, Register, Dashboard (stats + occupancy bar chart + status pie + capacity bars +
live activity feed), Zones (cards + CRUD), Zone detail (spaces grid, manual In/Out
occupancy, verify/reject proposed spaces, out-of-service, space CRUD), Live Map
(spatial grid, click-to-toggle occupancy, legend, zone selector), Reservations (CRUD +
cancel/complete, optional/auto space), Vehicles, Users, Organizations, Sites, Devices.

### Verified
- `npx tsc --noEmit` → no errors.
- `npm run build` → success (2652 modules; single 1.27 MB bundle — code-splitting is a
  follow-up optimisation).
- Integration through Vite proxy: `/` → ParkSense title; `/api/health` → UP;
  login → 200; authorized `/api/parking/zones` → 200; `/ws/info` → 200.
- 226 npm packages installed.

### Note
- Vite dev server uses port 5173. If that port is occupied it auto-increments; run with
  `npm run dev -- --port 5173 --strictPort` to force it.
- Current phases complete: 1–11. Remaining: 12 (analytics backend) and 13 (docs/Docker).

---

## 2026-09-23 — Phase 12: Analytics

### Added
- `dto/response/`: `AnalyticsSummary`, `UtilizationPoint`, `HeatmapCell`.
- `service/AnalyticsService` — summary KPIs, hourly utilization buckets, 7×24 heat map grid.
- `controller/AnalyticsController` — `/api/analytics/summary|utilization|heatmap`
  (optional `zoneId`, `from`, `to`).
- `ParkingSpaceRepository.countByStatus`.
- Frontend: `api/analytics.ts`, `pages/AnalyticsPage.tsx` (KPI cards, area chart of
  occupied/vacant events, day×hour heat map), route `/analytics` + sidebar entry.

### Verified
- `/api/analytics/summary` → zones 2, spaces 16, occupied 2, utilization 0.125.
- `/api/analytics/heatmap` → 168 cells (7×24) with real event counts.
- `/api/analytics/utilization` → hourly buckets.
- `tsc --noEmit` + `npm run build` pass.

---

## 2026-09-23 — Phase 13: Docs + Docker + polish

### Added
- `docs/database/er-diagram.md` — full Mermaid ER diagram, enums, design notes.
- `docs/api/api-specification.md` — every endpoint, payloads, status codes, WebSocket topics.
- `docs/architecture/system-architecture.md` — component diagram + occupancy sequence diagram.
- Docker: `infrastructure/docker/backend/Dockerfile` (Maven build → JRE 21),
  `infrastructure/docker/frontend/Dockerfile` + `nginx.conf` (build → nginx, proxies
  `/api` + `/ws`), `infrastructure/docker/vision/Dockerfile` (placeholder).
- `.dockerignore`; `vision-service/requirements.txt` + placeholder FastAPI `app/main.py`.
- `docker-compose.yml`: mysql (healthcheck) + backend (prod profile, env-driven) +
  frontend (8081); vision left commented.
- Frontend: `vite.config.ts` manualChunks code-splitting; root `README.md` rewritten.

### Verified
- `docker compose config` → valid.
- `npm run build` → code-split into react/mui/charts/motion/realtime/index chunks,
  no size warning.
- `tsc --noEmit` → clean.

### All phases 1–13 complete.

---

## 2026-09-24 — Troubleshooting: dialect error on startup

### Symptom
`org.hibernate.HibernateException: Unable to determine Dialect without JDBC metadata`
and `BUILD FAILURE` when running `mvn spring-boot:run`.

### Cause
Docker Desktop was not running, so no MySQL container was listening on `3306`. Hibernate
could not obtain a JDBC connection, so it could not read metadata to resolve a dialect.
The error is misleading: it is a database-connectivity problem, not a configuration one.

### Resolution
- Started Docker Desktop, then `docker compose up -d mysql`; container reached `healthy`.
- Re-ran backend → `Started ParkingPlatformApplication`, `GET /api/health` → `UP`.
- Added a Troubleshooting section to `README.md`.

### Prevention
Always have Docker Desktop running and the `parking-mysql` container healthy before
starting the backend. `docker ps` should show `parking-mysql ... (healthy)`.

---

## 2026-09-25 — Phase 14: Domain model upgrades

Three targeted upgrades to strengthen the domain model.

### Upgrade 1 — Occupancy vs operational state split
- `ParkingSpace.status` removed as a stored column. Replaced by:
  - `occupancyState` (`OccupancyState`) — derived, written only by occupancy events.
  - `operationalState` (`OperationalState`: IN_SERVICE / OUT_OF_SERVICE / MAINTENANCE) — manual.
  - `reserved` (boolean) — managed by reservations.
  - `@Transient getStatus()` derives the API `status` (operational → occupied → reserved → available).
- New enum `OperationalState`.
- `PATCH /api/parking/spaces/{id}/operational-state?state=` replaces `PATCH /status`.
- Zone/analytics counts recomputed from the new fields.

### Upgrade 2 — Event idempotency
- `OccupancyEvent.externalId` + unique `(source, external_id)`.
- `OccupancyEventRequest.externalId`; a repeated `(source, externalId)` returns the original
  event (no duplicate row, no state change, no broadcast).

### Upgrade 3 — ParkingSession (promise → reality)
- New `ParkingSession` entity + `SessionStatus` enum + `ParkingSessionRepository`.
- `ParkingSessionService.checkIn/checkOut`: OCCUPIED opens a session (linking an active
  reservation, driver, vehicle), VACANT closes it, computes `durationMinutes`, and completes
  the linked reservation.
- `OccupancyService` now drives session lifecycle on every event.
- New `GET /api/sessions` (+ `?status=`, `?spaceId=`, `/spaces/{id}/active`).
- `AnalyticsSummary` gains `activeSessions` and `averageSessionMinutes`.

### Frontend
- Types: `OperationalState`, `SessionStatus`, `ParkingSession`; `ParkingSpace` gains
  `occupancyState`/`operationalState`/`reserved`.
- `spacesApi.changeOperationalState`; Zone detail uses occupancy state for In/Out and
  operational state for out-of-service/maintenance.
- Reservations page now has **Reservations / Sessions** tabs; Analytics shows active sessions
  and average duration.

### Verified
- Dev schema reset (old `status` column was NOT NULL); app recreated 10 tables and reseeded.
- Seed produced 5 events, 3 sessions (2 active, 1 completed at 120 min), 1 reservation.
- `(source, externalId)` replay returned the **same event id** twice.
- OCCUPIED on A09 opened `SES-...`; VACANT completed it; active-session list correct.
- `operational-state=MAINTENANCE` derived `status=OUT_OF_SERVICE`.
- Analytics: `activeSessions: 2`, `averageSessionMinutes: 60.0`.
- `tsc --noEmit` + `npm run build` pass; proxy checks (`/api/sessions`) return 200.

---

## 2026-10-01 — Phase 15: Role enforcement

### Added
- `security/SecurityUtils` — current principal, role checks, current user id.
- Central authorization rules in `SecurityConfig.securityFilterChain`:
  ADMIN-only: organizations/users writes, site delete; ADMIN+MANAGER: sites,
  zones, spaces, devices, sessions, analytics, occupancy events; any authenticated:
  reads of zones/sites/spaces, reservations, vehicles, and `GET /api/users` (self-scoped).
- Ownership rules in services:
  - `ReservationService` — a USER can only create/list/cancel/complete their own
    reservations and can only reserve their own vehicle.
  - `VehicleService` — a USER can only create/update/delete their own vehicles.
  - `UserController` — a USER listing users sees only themselves.
- `GlobalExceptionHandler` maps `AccessDeniedException` to **403** (previously fell
  through to the generic 500 handler).

### Verified (live role matrix)
| Endpoint | ADMIN | MANAGER | USER |
|---|---|---|---|
| `GET /api/organizations` | 200 | 200 | 403 |
| `GET /api/devices` / `/api/sessions` | 200 | 200 | 403 |
| `GET /api/analytics/summary` | 200 | 200 | 403 |
| `GET /api/parking/zones` | 200 | 200 | 200 |
| `POST /api/organizations` | 201 | 403 | 403 |
| `POST /api/occupancy/events` | 201 | 201 | 403 |
| `GET /api/users` | 3 users | 3 users | 1 user (self) |
| `GET /api/reservations` | all | all | own only |
| `GET /api/vehicles` | all | all | own only |

---

## 2026-10-01 — Phase 16: Camera algorithm (vision service)

### Added (`vision-service/`)
- `app/detection/slots.py` — slot proposal: painted-line detection (Canny + Hough,
  rail/divider pairing) with grid fallback, ROI support, reading-order labels,
  annotated overlay rendering.
- `app/detection/occupancy.py` — occupancy scoring: reference-difference mode and
  texture mode (Laplacian variance + edge density + intensity spread); adaptive
  threshold (largest-gap split with per-mode floor); confidence scoring.
- `app/services/bridge.py` — pushes events to the backend with `externalId`
  idempotency and a last-known-state cache.
- `app/main.py` — FastAPI: `/health`, `/slots/propose`, `/occupancy/detect`,
  `/pipeline/run`, `/bridge/reset`.
- `app/config.py`, `app/utils/geometry.py`, `app/utils/imageio.py`.
- `tests/` — 11 tests over synthetic lot images (grid, line detection, occupancy in
  both modes, API). `scripts/demo_pipeline.py` — end-to-end demo.
- `docs/architecture/camera-algorithm.md` — full algorithm write-up.

### Verified
- `pytest` → 11 passed (OpenCV 5 output-shape issue fixed; Otsu replaced by
  largest-gap thresholding after a skewed-score failure).
- End-to-end: synthetic frame with cars in A06/A08 → 12 occupancy events pushed
  (HTTP 201). Re-running the same frame returned the **same event ids** — idempotency.
- Backend created sessions for the newly occupied bays automatically.

---

## 2026-10-01 — Phase 17: UI calm-down

### Changed (`frontend/`)
- Navigation is now role-aware and sections with no visible items are hidden:
  Dashboard; Analytics (ADMIN/MANAGER); Zones + Live Map; Reservations + Vehicles;
  Administration (Users/Organizations ADMIN, Sites/Devices ADMIN/MANAGER).
- Devices moved out of the Parking section into Administration.
- `RoleRoute` guards `/analytics` and all `/admin/*` routes; unauthorized roles are
  redirected instead of hitting 403s.
- Write controls are hidden from USER: zone create/edit/delete, space add/edit/
  verify/delete, In/Out occupancy, operational-state menu.
- Sidebar realtime chip now reflects the actual WebSocket state (connected/offline)
  instead of always showing green.

### Verified
- `tsc --noEmit` clean.

### Note
- Removed stray duplicate class files from `backend/target/` (`ParkingPlatformApplication 2.class`
  etc.) that broke `spring-boot:run`; `mvn clean` resolved it.

---

## 2026-10-01 — Phase 18: In-app camera capture

### Added (`frontend/`)
- `api/vision.ts` — vision client (propose, detect, health) with a configurable base
  (`VITE_VISION_URL`; direct `:8001` in dev, nginx `/vision/` in production).
- `pages/CameraPage.tsx` — full workflow, ADMIN/MANAGER only:
  - pick zone + upload lot photo (+ optional empty-lot reference);
  - **Propose slots** (mode auto/lines/grid, rows/cols) → overlay + summary, and
    **Import as proposed spaces** (creates PROPOSED spaces with polygon + centroid);
  - **Detect occupancy** → overlay + per-slot score/confidence, and **Push occupancy
    events** to the backend as CAMERA events with `externalId`.
  - live "vision service online/offline" indicator with the start command when down.
- Route `/camera` guarded by `RoleRoute`; nav item under Parking for ADMIN/MANAGER.
- nginx `/vision/` proxy added for the Docker deployment.

### Verified
- Vision health reachable at `:8001`; frontend, backend and vision all respond 200.
- Full page contract executed against live services:
  `propose` → 8 slots (lines, overlay present); `import` → HTTP 201 PROPOSED space
  (then cleaned up); `detect` → detections with scores; `push` → HTTP 201 event.
- `tsc --noEmit` clean; production build clean.

### Note
- The Vite dev proxy for `/vision` proved unreliable, so dev calls the vision
  service directly (CORS is open on the service); production uses nginx.

---

## 2026-10-01 — Phase 19: Mobile app (Expo / React Native)

### Added (`mobile/`)
Expo SDK 57 / React Native 0.86 / TypeScript. React Navigation (tabs + stack),
TanStack Query, Axios, STOMP over native WebSocket, expo-secure-store,
expo-local-authentication, expo-notifications, expo-image-picker.

- `src/api/client.ts` — base URL derived from the Expo dev host
  (`http://<lan-ip>:8080`), token in SecureStore, 401 auto-logout; overridable with
  `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_VISION_URL`.
- `src/api/endpoints.ts`, `src/api/vision.ts` — full API surface incl. multipart
  uploads to the vision service.
- `src/store/AuthContext.tsx` — login/logout, persisted session, optional biometric
  lock, user refresh.
- `src/hooks/useOccupancyStream.ts` — shared STOMP connection + connection status.
- `src/components/ui.tsx` — themed UI kit; `src/theme.ts` — dark palette.
- Screens: Login, Lock, Home (role-aware KPIs / active reservation + stay / live
  feed), Zones (+ create), Zone detail (grid, In/Out, verify/reject, out-of-service,
  add space), Live map (scale-to-fit, tap to toggle), Camera (capture/library →
  propose → import PROPOSED spaces; detect → push events), Reservations (+ create,
  cancel/complete), Sessions, Vehicles (+ form), Profile, Settings, and Admin
  (users, organizations, sites, devices).
- Tab bar is role-aware (Camera only for ADMIN/MANAGER); admin screens sit behind
  Profile → Administration.

### Backend
- Sessions are now self-scoped: `GET /api/sessions` is available to any authenticated
  user and returns only their own sessions for non-managers (`findByUser`).

### Verified
- `npx tsc --noEmit` clean.
- Metro production of both bundles: iOS **1544 modules**, Android **1544 modules**,
  HTTP 200 (≈7.6 MB dev bundles).
- Vision service now listens on `0.0.0.0` so phones can reach it; backend and vision
  confirmed reachable on the LAN IP.

### Notes
- Notifications are local, driven by the WebSocket stream; remote push requires an
  Expo dev build with FCM/APNs credentials.
- See `mobile/README.md` for run steps and limitations.

---

## 2026-10-04 — Phase 20: Camera upload fix

### Problem
Mobile camera uploads failed with `Unsupported FormDataPart implementation`. Expo SDK 57
installs its WinterCG `fetch` globally; its multipart encoder
(`expo/src/winter/fetch/convertFormData.ts`) accepts only `string`, `Blob`, or objects
exposing `bytes()` — not React Native's legacy `{ uri, name, type }` parts.

### Fix
- Added `expo-file-system`; `mobile/src/api/vision.ts` now appends `new File(uri)` parts
  (File implements `name`, `type`, `bytes()`).
- Non-2xx responses now surface FastAPI's `detail` message instead of a generic error.

---

## 2026-10-04 — Phase 21: Apple-style light & dark themes

### Mobile
- Replaced the static dark palette with `src/theme/palette.ts` (light/dark token sets:
  white/black backgrounds, iOS system colours, hairlines, 12–16 px radii, system font) and
  `src/theme/ThemeProvider.tsx` (`useTheme`, `makeStyles`, `system|light|dark` preference
  persisted in SecureStore).
- `app.json`: `userInterfaceStyle: automatic`, neutral splash.
- All 21 screens converted to themed styles; `Settings → Appearance` segmented control added.
- UI kit reworked: inset grouped lists (`ListSection`/`ListRow`), `SearchBar`,
  `SegmentedControl`, `CategoryChips`, `Pill`; status badges derive from the palette.
- Navigation theme follows the scheme; tab bar and headers use iOS styling.

### Web
- `createAppTheme(mode)` + `ColorModeProvider` (system/light/dark, localStorage),
  replacing the single dark theme; glass/gradients removed for a flat Apple look.
- Appearance menu (System/Light/Dark) in the app bar; hard-coded dark values in the
  layout, map canvas and dashboard replaced with adaptive tokens.

---

## 2026-10-04 — Phase 22: Driver marketplace

### Backend
- `PlaceCategory` enum; `ParkingSite` gains `category`, `description`, `coverImageUrl`,
  `hourlyRate`, `openingHours`, `amenities` (auto-migrated by `ddl-auto=update`).
- `PlaceService` (Haversine distance, free-text + category filtering, distance or name
  sorting) and `GET /api/places`, `GET /api/places/{siteId}` (any authenticated user).
- `MarketplaceSeeder` (`@Profile("dev")`, ordered after the demo seeder, idempotent):
  8 fictional venues around MG Road with zones/spaces/randomised occupancy, plus
  back-fill of the existing Central Campus site.
- 9 stylised cover images generated into `src/main/resources/static/places/` (public).
- Verified: 9 places distance-sorted; `q=cafe` → 3 cafés; `category=MALL` → 1;
  detail returns zones/amenities; cover image returns 200 without auth.

### Mobile
- `placesApi`, `PlaceSummary`/`PlaceDetail` types, `useUserLocation` (expo-location with
  MG Road fallback), `expo-image` covers.
- New **Explore** (search, category chips, live booking strip, proximity-sorted cards with
  availability + progress), **Place detail** (cover, availability, amenities, areas →
  reserve or directions) and **Bookings** (Upcoming/Active/Past) screens.
- Role-based tabs: **USER → Explore · Bookings · Profile**; staff keep
  **Home · Zones · Map · Camera · Profile**. Reservation flow accepts a `siteId` and shows
  that place's areas.

### Web
- `placesApi`, **Explore** (responsive card grid, search, categories, live updates) and
  **Place detail** (hero, availability, amenities, areas, Reserve/Directions) pages;
  `/explore` + `/places/:siteId` routes; index/fallback redirect by role; driver sidebar
  shows Explore/Bookings/Vehicles. Reserve deep-links into the reservation dialog.

### Verified
- Mobile `tsc --noEmit` clean; iOS bundle rebuilt (1586 modules).
- Web `tsc --noEmit` + `npm run build` clean (2693 modules).
- Backend compiles and serves the places API against the live database.

### Remaining polish (known)
- Some web pages still contain subtle dark-tuned rgba overlays (analytics/camera/zone
  detail) that degrade gracefully but could use a token sweep.
- Mobile `AdminSites` form does not yet expose the new place fields (category/rate/hours).
- Places sorting/aggregation is in-memory; move to a bounding-box query at scale.

---

## 2026-10-04 — Phase 23: Polish pass (the three remaining items)

### 1. Web light-mode token sweep
- `AnalyticsPage`, `DashboardPage`: chart grid/tooltips now use `theme.palette.divider`,
  `background.paper` and `text.primary`; heat-map empty cells use a neutral grey.
- `CameraPage`, `ZoneDetailPage`: dark rgba borders replaced with the `divider` token.
- `LoginPage`: hero panel is theme-aware — subtle indigo tint on white in light mode,
  the dark gradient in dark mode, with a divider edge.
- No dark-only rgba/hex values remain in `pages`, `components` or `layouts`.

### 2. Mobile AdminSites — full place fields
- Create form now captures category (chips), description, cover image URL, ₹/hour,
  opening hours and amenities, and posts them to `POST /api/parking/sites`.
- Site list shows category, rate and hours.
- `ParkingSite` type extended on mobile and web.

### 3. Places query at scale
- `ParkingSiteRepository` gains a bounding-box pre-filter
  (`findActiveWithinBounds`, `findActiveByCategoryWithinBounds`) so the marketplace no
  longer loads every site; exact Haversine sorting then applies to the small candidate set.
- `PlaceService.search` takes a `limit` (default 50, capped at 100); the controller
  exposes `?limit=`. Null-location owners use `findAllByActiveTrue[AndCategory]`.
- Added `(latitude, longitude)` and `category` indexes on `parking_sites`.

### Verified
- Backend compiles; places API still returns 9 venues distance-sorted, with `q`/`category`
  filters and public cover images.
- Mobile `tsc --noEmit` clean; web `tsc --noEmit` + `npm run build` clean.

---

## 2026-10-04 — Phase 24: Vision v2, phase 1 — site survey pipeline

Turns a guided walk (posed depth frames) into a metric ground model, terrain
assessment and an automatic parking layout. CPU-only, no GPU or ML models required.

### Added (`vision-service/app/survey/`)
- `bundle.py` — bundle schema/loader (keyframes, depth, poses, intrinsics, GPS),
  averaged GPS, local-metres → lat/lng.
- `reconstruct.py` — **depth fusion** (default): back-project each depth map through
  intrinsics + pose into a metric point cloud, plus a loop-closure drift proxy.
  COLMAP/Open3D refinement is stubbed behind an optional import.
- `terrain.py` — RANSAC ground plane (3×3 covariance refinement instead of a slow
  SVD), 10 cm grid with vectorised per-cell statistics, gap filling, roughness,
  obstacle detection (points > 0.20 m above ground), true slope = plane tilt +
  smoothed residual relief.
- `boundary.py` — usable area = concave hull of drivable cells minus obstacle
  buffers, exclusions and a 0.30 m inset, with a minimum-coverage rule.
- `profiles.py` — CAR / BIKE / MIXED / BUS bay geometry, aisle widths, allowable
  angles and slope/roughness limits.
- `layout.py` — bay–aisle–bay tiling swept over the profile's angles, clipped to the
  usable polygon, connectivity-checked against entry candidates, scored with
  penalties, best + alternatives returned, reading-order bay codes.
- `context.py` — OSM/Overpass roads, buildings and access points (cached, offline-safe).
- `export.py` — `layout.geojson` (lat/lng), `report.json`, `ortho.png` (slope + bays).
- `pipeline.py` — orchestration, confidence grading (drift %, grid coverage, plot size),
  manual-measure fallback and profile re-layout without re-reconstruction.
- HTTP: `POST /surveys`, `GET /surveys/{id}`, `GET /surveys/{id}/artifacts/{name}`,
  `POST /surveys/{id}/layout`, `GET /survey/profiles`.

### Verified (`pytest`, 22 tests total, all passing)
- Synthetic plot **20 × 12 m, 2% slope**: recovered **20.01 × 12.00 m** and **2.0%**;
  obstacles detected; loop closure < 0.5 m; confidence **high**.
- Layouts: CAR 8 bays → BIKE 36 → BUS 3 on the same plot; L-shape and holed polygons
  laid out correctly; bays never overlap obstacles; labels in reading order.
- HTTP round trip: zip upload → `completed`, artefacts generated, `relayout` to BIKE.

### Not in this phase
- Native AR capture module (ARKit/ARCore) — needs an Expo dev build and a device.
- Optional ML/COLMAP stack (no wheels for Python 3.14 here; heavy deps are declared
  as optional).
- 2D/3D admin review UI.

---

## 2026-10-06 — Phase 25: Backend test suite + survey import

### Added — Java test suite (29 tests, all passing)
- H2 in-memory test profile (`src/test/resources/application-test.properties`), no
  MySQL required to run tests.
- `support/Fixtures` + `support/BaseServiceTest` (authenticated service calls, rollback).
- `OccupancyFlowTest` (5) — append-only events, derived state, idempotent `externalId`,
  session open/close with duration, out-of-service precedence.
- `ReservationRulesTest` (6) — time validation, auto-assignment, overlap protection,
  cancel releases the space, ownership rules.
- `PlaceSearchTest` (5) — distance ordering, free-text and category filters, no-location
  fallback, limit cap.
- `RoleAccessTest` (8) — 401/403/200/404 gates per role via MockMvc.
- `SiteSurveyImportTest` (5) — import creates PROPOSED spaces, one-shot guard, zone
  requirement, malformed layout rejection.

### Added — survey import (Java)
- `SiteSurvey` entity + repository; `SiteSurveyRequest/Response`, `SurveyImportResponse`.
- `SiteSurveyService` — stores surveys from the vision service and turns `layoutJson`
  bays into PROPOSED spaces (polygon + centroid, per-zone code uniqueness, double-import
  guard, zone required).
- `SiteSurveyController` under `/api/parking/sites/{siteId}/surveys` (ADMIN/MANAGER for
  writes via the existing `/api/parking/**` rule).

### Verified
- `mvn test` → **29 passed**; `pytest` → **22 passed** (51 total).
- Backend boots and Hibernate creates the `site_surveys` table.
