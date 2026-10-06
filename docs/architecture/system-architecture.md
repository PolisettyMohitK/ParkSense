# System Architecture

## Components

```mermaid
flowchart TD
    U[Browser - React SPA] -->|REST /api| B[Java Spring Boot Backend]
    U <-->|STOMP /ws| B
    B -->|JPA / Hibernate| DB[(MySQL 8.4)]
    V[Vision Service - Python] -.->|POST occupancy events| B
    S[Sensors / Manual / QR] -.->|POST occupancy events| B
```

- **Backend** is the single source of truth for parking state. It owns the domain model,
  authentication, business rules and the occupancy engine.
- **Frontend** (React + TypeScript) consumes REST for data and STOMP for real-time updates.
- **Mobile app** (Expo / React Native) talks to the same REST + STOMP endpoints,
  deriving the API host from the Expo dev host; tokens live in the device secure store.
- **Vision service** and other detection sources are *external producers*: they only POST
  occupancy events and never own state. In the current software-only build this role is
  filled by manual updates from the UI, which use the identical event interface.
- **MySQL** stores all state plus append-only occupancy history for analytics.

## Occupancy data flow (real-time)

```mermaid
sequenceDiagram
    participant Src as Source (manual/CV/sensor)
    participant API as OccupancyController
    participant Svc as OccupancyService
    participant DB as MySQL
    participant WS as OccupancyBroadcaster
    participant Web as Dashboard / Map

    Src->>API: POST /api/occupancy/events
    API->>Svc: recordEvent(...)
    Svc->>DB: insert occupancy_event (append-only)
    Svc->>DB: update parking_space.status (derived)
    Svc->>WS: publish OccupancyChangedEvent
    WS-->>Web: /topic/occupancy & /topic/zones/{id}
    Web->>Web: refresh without page reload
```

## Layering (backend)

`controller → service → repository → entity`, with `dto`/`mapper` at the boundary and
`security` (JWT filter) + `websocket` as cross-cutting concerns. Services own transactions
and business rules; controllers only translate HTTP.

## Configuration

- Profiles: `dev` (local MySQL, `ddl-auto=update`, SQL logging, demo seed) and `prod`
  (env-var datasource, `ddl-auto=validate` by default, no seed).
- All secrets/URLs in prod come from environment variables (`DB_URL`, `DB_USERNAME`,
  `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`).
