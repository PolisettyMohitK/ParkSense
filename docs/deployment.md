# Deploying ParkSense

Target topology (all free tiers):

```
Cloudflare Pages          Render (Singapore)                 Aiven
┌───────────────┐   HTTPS  ┌──────────────────┐  JDBC/TLS  ┌─────────────┐
│ React web app │ ───────> │ parksense-api    │ ─────────> │ MySQL       │
│ parksense     │   WSS    │ (Spring Boot)    │            │ (free plan) │
│ .pages.dev    │ ───────> └──────────────────┘            └─────────────┘
└───────────────┘              ▲
        │                      │ occupancy events
        │  HTTPS               │
        └────────────> ┌──────────────────┐
                       │ parksense-vision │
                       │ (FastAPI/OpenCV) │
                       └──────────────────┘
```

- **Database** — Aiven for MySQL (free plan).
- **Backend + vision service** — Render web services, defined in `render.yaml`.
- **Web app** — Cloudflare Pages, static build of `frontend/`.
- **Mobile** — Expo/EAS build pointing at the Render URL (optional for the demo).

Everything below assumes the repo is pushed to GitHub and `render.yaml` is at the
repository root.

## 1. Aiven MySQL

1. In the [Aiven console](https://console.aiven.io), create a **MySQL** service.
   The free plan (single node, ~1 GB) is enough for the demo.
2. Pick the region closest to your Render region (`ap-southeast-1` / Singapore).
3. Once running, open **Overview → Connection information** and note:
   - host, port, user (`avnadmin`), password, database (`defaultdb` by default)
4. Build the JDBC URL for Render (TLS is required by Aiven):

   ```
   jdbc:mysql://<host>:<port>/<database>?sslMode=REQUIRED&serverTimezone=UTC&allowPublicKeyRetrieval=true
   ```

   If you create a dedicated database, run e.g.
   `CREATE DATABASE parksense;` in the Aiven web console first.

5. Aiven allows connections from anywhere by default on the free plan; the
   combination of a long random password and TLS is the protection. Do not
   commit the credentials.

## 2. Backend + vision service on Render

1. Render Dashboard → **New → Blueprint** → select this repository.
2. Render reads `render.yaml` and shows two services:
   - `parksense-api` (Docker, `infrastructure/docker/backend/Dockerfile`)
   - `parksense-vision` (Docker, `infrastructure/docker/vision/Dockerfile`)
3. On first sync Render prompts for these values (`sync: false`):

   | Variable | Where it goes | Value |
   |---|---|---|
   | `DB_URL` | API | JDBC URL from step 1 |
   | `DB_USERNAME` | API | Aiven user |
   | `DB_PASSWORD` | API | Aiven password |
   | `ADMIN_EMAIL` | API | first admin's email, e.g. `admin@example.com` |
   | `ADMIN_PASSWORD` | API | strong password (≥ 8 chars) |
   | `PARKING_USER` | vision | optional; staff account for `push=true` |
   | `PARKING_PASSWORD` | vision | optional; password for that account |

   `JWT_SECRET` is generated once for the API and referenced by the vision
   service, so both verify the same tokens. `CORS_ALLOWED_ORIGINS` and
   `VISION_ALLOWED_ORIGINS` already allow `parksense.pages.dev` and all preview
   subdomains; adjust if you use a custom domain.

4. Apply the Blueprint. The API's first boot:
   - JPA validates the schema against `backend/src/main/resources/db/migration/V1__baseline.sql`
     and **Flyway applies it** to the empty Aiven database.
   - The bootstrap admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   - Health check: `GET https://<api>.onrender.com/api/health` returns
     `{"status":"UP",...}`.

5. Note the actual `onrender.com` hostnames. If Render renamed a service
   because the name was taken, update `PARKING_API_URL` on the vision service
   (and the frontend build variables in step 3).

## 3. Web app on Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Build settings:
   - Framework preset: **Vite**
   - Root directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Build output: `dist`
3. Environment variables (Production **and** Preview):

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://parksense-api.onrender.com/api` |
   | `VITE_VISION_URL` | `https://parksense-vision.onrender.com` |

4. Save and deploy. `frontend/public/_redirects` is copied into `dist`, so
   direct links like `/bookings/42` resolve to the SPA, and `_headers` adds
   cache and security headers.
5. Every pull request gets a `<hash>.parksense.pages.dev` preview URL, which is
   already covered by the `https://*.parksense.pages.dev` CORS pattern.

## 4. Mobile app (optional)

The Expo app reads its endpoints from `EXPO_PUBLIC_*` variables:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://parksense-api.onrender.com \
EXPO_PUBLIC_VISION_URL=https://parksense-vision.onrender.com \
npx expo start
```

For EAS builds, set the same variables as EAS environment variables
(`eas env:create`) or in `eas.json` under `build.<profile>.env`; the app appends
`/api` itself. Mobile traffic is not affected by CORS.

## 5. Keep-alive (free-tier cold starts)

Render free services sleep after ~15 minutes idle; the next request then takes
~50 seconds while the container boots. `.github/workflows/keepalive.yml` pings
the API health endpoint every 10 minutes. The vision service is intentionally left to sleep: two always-on free services would exceed Render's 750 free instance-hours per month. For a guaranteed warm API, set `plan: starter` on `parksense-api`.

- If Render assigned different hostnames, set repository variables
  `API_URL` and `VISION_URL` (Settings → Secrets and variables → Actions →
  Variables → New repository variable).
- GitHub cron can be delayed during peak hours; optionally also add an external
  monitor (e.g. UptimeRobot) against the same URLs.

## 6. Verify the deployment

```bash
API=https://parksense-api.onrender.com
VISION=https://parksense-vision.onrender.com
WEB=https://parksense.pages.dev

curl -fsS $API/api/health
curl -fsS $VISION/health

# Login as the bootstrap admin; then check an authenticated endpoint.
TOKEN=$(curl -fsS $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<ADMIN_PASSWORD>"}' | jq -r .token)
curl -fsS $API/api/analytics/summary -H "Authorization: Bearer $TOKEN" | head

# CORS preflight from the Pages origin must succeed.
curl -isS -X OPTIONS $API/api/analytics/summary \
  -H "Origin: $WEB" -H 'Access-Control-Request-Method: GET' | head -1
```

Then open `$WEB`, sign in and run through Explore → book → check in → check out
→ pay. Check `$VISION/health` shows the API URL it will push to.

## 7. Operations

- **Rotate the JWT secret**: update `JWT_SECRET` on `parksense-api`, then sync
  the Blueprint (or update the vision service manually to match) and redeploy
  both. All existing sessions become invalid.
- **Rotate DB credentials / admin password**: update the value in Render and
  redeploy the API. `ADMIN_PASSWORD` only applies on first boot when the admin
  does not exist yet; use the `/api/me/password` endpoint otherwise.
- **Backups**: Aiven's free plan does not include managed backups. Take manual
  dumps before demos:
  `mysqldump --ssl-mode=REQUIRED -h <host> -P <port> -u avnadmin -p <db> > backup.sql`
- **Logs**: Render dashboard → service → Logs; Aiven console → Logs. The vision
  service logs are the fastest way to debug occupancy pushes.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Web app shows "Cannot reach the server" | API is cold-starting (~50 s). Retry; confirm keep-alive is running. |
| Browser console shows a CORS error | The Pages domain is missing from `CORS_ALLOWED_ORIGINS` (use the `https://*.parksense.pages.dev` pattern for previews). Redeploy the API after changing it. |
| API crash-loops with `FlywayValidateException` | The Aiven schema drifted from `V1__baseline.sql` (e.g. it was previously created with `ddl-auto=update`). Reset the database or add a migration; never edit an applied migration. |
| `Access denied` when the API starts | Wrong `DB_USERNAME` / `DB_PASSWORD`, or the Aiven service is stopped. |
| Vision endpoints return 401 | `JWT_SECRET` on the vision service differs from the API's. Re-sync the Blueprint. |
| Vision returns 502 `backend login failed` | `PARKING_USER` / `PARKING_PASSWORD` are unset or not a staff account. |
| API killed with exit code 137 | Out of memory on the 512 MB plan; lower `DB_POOL_SIZE` (default 5) or reduce concurrent traffic. |
