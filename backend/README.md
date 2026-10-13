# Backend — Spring Boot

Java 21 + Spring Boot 3.2 service that owns all parking state: organizations,
sites, zones, spaces, occupancy events, sessions, reservations, payments,
analytics and the WebSocket stream. The vision service reports observations to
it; it never stores parking state itself.

## Stack

Spring Web · Spring Data JPA (MySQL 8) · Spring Security (JWT) · WebSocket
(STOMP/SockJS) · Flyway migrations · MapStruct · Lombok · springdoc OpenAPI.

## Layout

```
src/main/java/com/parking/platform/
  config/      security-independent wiring (OpenAPI, WebSocket, seeders, bootstrap admin)
  security/    JwtService, JwtAuthenticationFilter, SecurityConfig, UserPrincipal
  controller/  REST endpoints (see docs/api/api-specification.md)
  service/     business rules: reservations, pricing, sessions, analytics, surveys
  repository/  Spring Data repositories
  entity/      JPA entities + enums (the schema's source of truth)
  dto/         request/response records
  exception/   ApiException handlers and error payloads
  event/       domain events broadcast over WebSocket
src/main/resources/
  application*.properties     dev / prod / test profiles
  db/migration/V1__baseline.sql   Flyway baseline (prod; validated against entities)
```

## Run

Requires **JDK 21** (Lombok's annotation processor fails on newer JDKs) and a
MySQL 8 reachable at `127.0.0.1:3306` with database `parking_platform`
(user/pass `parking` — `docker compose up -d mysql` from the repo root).

```bash
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn spring-boot:run          # macOS
# or: export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home
```

- Dev profile (default): `ddl-auto=update`, demo seed on (`APP_SEED_DEMO=false` to disable).
- Prod profile: Flyway applies `V1__baseline.sql`, `ddl-auto=validate`, all config
  from environment variables (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`,
  `CORS_ALLOWED_ORIGINS`, ...). See `docs/deployment.md`.

### First admin / demo accounts

`ADMIN_EMAIL` + `ADMIN_PASSWORD` create the first ADMIN on startup (register only
creates USER accounts). `APP_SEED_DEMO=true` (default in dev) seeds the demo data
listed in the root README.

## Test

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)   # or Homebrew path above
mvn -B test
```

- Unit/integration tests run against in-memory H2 (`application-test.properties`).
- `MigrationTest` additionally runs the Flyway baseline against a real MySQL and
  lets Hibernate validate the result. It is skipped unless `MIGRATION_TEST_DB_URL`
  (plus `MIGRATION_TEST_DB_USERNAME` / `MIGRATION_TEST_DB_PASSWORD`) is set; CI
  wires it to a MySQL service container.

## API

`GET /api/health` is public; everything else needs `Authorization: Bearer <JWT>`.
Swagger UI at `/swagger-ui.html` in dev. Endpoint and role matrix:
`docs/api/api-specification.md`.
