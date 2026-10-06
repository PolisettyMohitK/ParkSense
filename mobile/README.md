# ParkSense Mobile

React Native (Expo) app for ParkSense — role-aware, reusing the same backend API as
the web app. Drivers book and track parking; managers also drive occupancy and the
camera pipeline.

## Stack

Expo SDK 57 · React Native 0.86 · TypeScript · React Navigation (tabs + stack) ·
TanStack Query · Axios · STOMP over native WebSocket · expo-secure-store ·
expo-local-authentication · expo-notifications · expo-image-picker.

## Run it (Expo Go)

1. Install **Expo Go** on your phone (App Store / Play Store).
2. Phone and Mac on the **same Wi-Fi**.
3. Start the backend (and optionally the vision service) on the Mac — see the root
   README.
4. Start the app:
   ```bash
   cd mobile
   npm install
   npm start
   ```
5. Scan the QR code with the camera (iOS) or the Expo Go app (Android).

The API base URL is derived from the Expo dev host automatically
(`http://<your-mac-ip>:8080`), so no configuration is needed on a normal LAN.

## Features

| Area | Driver | Manager / Admin |
|---|---|---|
| Auth | JWT login, token in secure storage, optional biometric lock | same |
| Home | active reservation, current stay, live activity | KPIs, utilization, avg stay, live activity |
| Zones | availability list, zone detail (read-only) | create zones, add spaces, verify/reject, In/Out occupancy, out-of-service |
| Map | live coloured space grid | tap a space to toggle occupancy |
| Reservations | create (zone + vehicle + duration), cancel, complete | all reservations |
| Sessions | own stays with durations | all sessions |
| Vehicles | add/edit/delete own vehicles | any owner |
| Camera | — | capture/choose a photo, propose slots, import as PROPOSED spaces, detect occupancy, push events |
| Admin | — | users, organizations, sites, devices |
| Settings | biometric lock, occupancy notifications, API info | same |

## Configuration (optional)

Create `mobile/.env` to override the auto-detected URLs:

```
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080
EXPO_PUBLIC_VISION_URL=http://192.168.1.50:8001
```

## Notes and limitations

- **Notifications are local**, triggered by the WebSocket occupancy stream. True
  remote push needs an Expo development build with FCM/APNs credentials — that is a
  deliberate next step, not part of this build.
- **Biometric lock** requires Face ID / fingerprint to be enrolled on the device and
  is offered in Settings.
- **Camera** requires the vision service to listen on `0.0.0.0` (default in
  `uvicorn ... --host 0.0.0.0`) and be reachable from the phone.
- **HTTP on iOS**: Expo Go allows cleartext to your LAN during development. A
  production build would use HTTPS or an ATS exception.
- Imported camera proposals use the uploaded photo's pixel coordinates, so they line
  up when that photo is the zone's map image.

## Verify

```bash
npx tsc --noEmit          # types
npm start                 # then press i / a, or scan with Expo Go
```
