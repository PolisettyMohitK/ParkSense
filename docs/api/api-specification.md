# API Specification

Base URL: `http://localhost:8080/api` (dev). Auth: `Authorization: Bearer <JWT>`.
Errors return `ApiErrorResponse`: `{ timestamp, status, error, message, path, fieldErrors }`.
Interactive docs: `/swagger-ui.html`.

## Authorization (roles)

Roles are enforced centrally in the security filter chain, plus ownership rules in
services (a USER can only touch their own data).

| Area | ADMIN | MANAGER | USER |
|---|---|---|---|
| Organizations — read | yes | yes | no |
| Organizations — write | yes | no | no |
| Users — list | all users | all users | self only |
| Users — create/update/delete | yes | no | no |
| Parking Admin (`/api/parking/**`) — CRUD | yes | yes | no |
| Places Marketplace (`/api/places/**`) — read | yes | yes | yes |
| Devices (`/api/devices/**`) | yes | yes | no |
| Staff Sessions (`/api/sessions/**`) | yes | yes | no |
| Driver Personal Sessions (`/api/me/sessions`) | yes | yes | own only |
| Own profile (`/api/me`, `/api/auth/me`) | yes | yes | own only |
| Booking check-in / check-out (`/api/reservations/{id}/check-in|check-out`) | yes | yes | own only |
| Analytics (`/api/analytics/**`) | yes | yes | no |
| Occupancy events — `POST /events` | yes | yes | no |
| Reservations — list | all | all | own only |
| Reservations — create / cancel / complete | any | any | own only |
| Reservations — delete | yes | yes | no |
| Vehicles | all | all | own only |

Unauthenticated requests get `401`; authenticated requests without the required
role get `403`.

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | public | Register a USER, returns JWT + user |
| POST | `/login` | public | Authenticate, returns JWT + user |
| GET | `/me` | bearer | Current user profile |

## Current user — `/api/me`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | bearer | Profile (`fullName`, `phone`, email, role, organization) |
| PUT | `` | bearer | Update `fullName` / `phone` |
| POST | `/password` | bearer | Change password (`currentPassword`, `newPassword`) |

## Organizations — `/api/organizations`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | bearer | List |
| GET | `/{id}` | bearer | Get |
| POST | `` | bearer | Create |
| PUT | `/{id}` | bearer | Update |
| DELETE | `/{id}` | bearer | Delete |

## Users — `/api/users`

Same CRUD shape as organizations. Password required on create; optional on update.

## Vehicles — `/api/vehicles`

`GET ?ownerId=` filters by owner. CRUD otherwise.

## Parking sites — `/api/parking/sites`

`GET ?organizationId=`. CRUD otherwise.

## Parking zones — `/api/parking/zones`

| Method | Path | Description |
|---|---|---|
| GET | `?siteId=` | List zones (includes live total/occupied/available) |
| GET | `/{id}` | Get zone |
| GET | `/{id}/occupancy` | Zone occupancy summary |
| POST / PUT / DELETE | `` / `/{id}` | CRUD |

## Parking spaces — `/api/parking/spaces`

| Method | Path | Description |
|---|---|---|
| GET | `?zoneId=` | List spaces |
| GET | `/{id}` | Get space |
| POST / PUT / DELETE | `` / `/{id}` | CRUD |
| PATCH | `/{id}/verify?status=PROPOSED\|VERIFIED\|REJECTED` | Verify proposed space |
| PATCH | `/{id}/operational-state?state=IN_SERVICE\|OUT_OF_SERVICE\|MAINTENANCE` | Set operational state (staff only) |

Response `status` is derived from `occupancyState` + `operationalState` + `reserved`
(priority: operational → occupied → reserved → available). `occupancyState` is set only by
occupancy events and cannot be written directly.

## Occupancy — `/api/occupancy`

| Method | Path | Description |
|---|---|---|
| POST | `/events` | Record an occupancy event (append-only); updates space status, broadcasts WebSocket |
| GET | `/spaces/{spaceId}/latest` | Latest event (204 if none) |
| GET | `/spaces/{spaceId}/history` | Full history for a space |
| GET | `/zones/{zoneId}?from=&to=` | Events for a zone in an ISO-8601 window |

### `POST /events` body
```json
{
  "spaceId": 5,
  "state": "OCCUPIED",
  "source": "CAMERA",
  "confidence": 0.94,
  "externalId": "frame-0001",
  "note": "optional"
}
```

`externalId` is optional. When provided, it is unique per `source`; resending the same
`(source, externalId)` returns the original event instead of creating a duplicate
(idempotent ingestion for cameras/sensors).

Recording `OCCUPIED` opens a `ParkingSession` (linking an active reservation when the space
was reserved); recording `VACANT` closes it and completes the reservation.

## Places Marketplace — `/api/places`
Public and driver-accessible discovery endpoints for sites, zones, and verified parking spaces.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `?lat=&lng=&q=&category=&limit=` | bearer | Proximity/text search for places (sites) |
| GET | `/{siteId}?lat=&lng=` | bearer | Detail for a place (summary, amenities, zones) |
| GET | `/{siteId}/quote?start=&end=` | bearer | Price quote for a stay window (ISO-8601 instants) |
| GET | `/{siteId}/zones` | bearer | Public zones for a place (capacities, available counts) |
| GET | `/{siteId}/zones/{zoneId}/spaces` | bearer | Public spaces for a zone (sanitized: code, status, coords, polygon) |

## Driver Sessions — `/api/me/sessions`
Driver-scoped personal session endpoints (USER, MANAGER, ADMIN).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `` | bearer | List personal sessions for current user (newest first) |
| GET | `/{id}` | bearer | Get one own session |
| POST | `/{id}/pay` | bearer | Settle an own completed session (`method`: CARD, UPI, WALLET, CASH) |
| GET | `/active` | bearer | Active session for current user (204 if none) |

## Staff Sessions — `/api/sessions`
Staff-only operations (ADMIN and MANAGER). USER role receives `403 Forbidden`.

| Method | Path | Description |
|---|---|---|
| GET | `?status=ACTIVE\|COMPLETED&spaceId=` | List sessions across all users/spaces |
| GET | `/{id}` | Get session by ID |
| POST | `/{id}/pay` | Settle a completed session (`method`: CARD, UPI, WALLET, CASH) |
| GET | `/spaces/{spaceId}/active` | Active session for a space (204 if none) |

## Reservations — `/api/reservations`

| Method | Path | Description |
|---|---|---|
| GET | `?userId=` | List reservations (own only for USER) |
| GET | `/{id}` | Get (own only for USER) |
| POST | `` | Create (validates window, blocks space overlap, auto-assigns space, returns price estimate) |
| PATCH | `/{id}/cancel` | Cancel (own booking for USER; 409 if already arrived) |
| POST | `/{id}/check-in` | Driver self check-in: starts the stay (within the arrival grace window) |
| POST | `/{id}/check-out` | Driver self check-out: closes the stay and returns the payable amount |
| PATCH | `/{id}/complete` | Complete (staff) |
| DELETE | `/{id}` | Delete (staff) |

Body for `POST`: `{ vehicleId, zoneId, assignedSpaceId?, startTime, endTime }`
(userId is ignored for USER; staff may book on behalf of others). Bad windows and
overlaps return `400` / `409`; a `priceEstimate` is included in the response.

## Monitoring devices — `/api/devices`

`GET ?zoneId=`. CRUD otherwise.

## Site surveys — `/api/parking/sites/{siteId}/surveys`

| Method | Path | Description |
|---|---|---|
| GET | `` | Surveys stored for a site (newest first) |
| POST | `` | Store a survey from the vision service (`surveyJobId`, `profile`, `layoutJson`, `reportJson`) |
| POST | `/{surveyId}/import` | Create PROPOSED spaces from the layout bays (idempotent-guarded) |

`layoutJson` must contain a `bays` array whose entries carry `code`, `polygon`
(`[[x,y],…]` metres) and `centre`. Import requires an existing zone on the site and
can only run once per survey.

## Analytics — `/api/analytics`

| Method | Path | Description |
|---|---|---|
| GET | `/summary` | Platform KPIs (zones, spaces, utilization, events, reservations, active sessions, avg session minutes, devices) |
| GET | `/utilization?zoneId=&from=&to=` | Occupied/vacant event counts bucketed by hour |
| GET | `/heatmap?zoneId=&from=&to=` | 7×24 day-of-week × hour event grid |

## WebSocket

- SockJS/STOMP endpoint: `/ws`
- Topics: `/topic/occupancy` (all events), `/topic/zones/{zoneId}` (per-zone)
- Payload: `OccupancyChangedEvent { spaceId, spaceCode, zoneId, zoneName, state, source, occurredAt }`

## Status codes

`200` OK · `201` Created · `204` No Content · `400` Validation/bad request ·
`401` Unauthenticated · `403` Forbidden · `404` Not found · `409` Conflict (duplicate/overlap).
