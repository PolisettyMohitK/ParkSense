import { useEffect, useState } from 'react'

/** Central Hyderabad (Jubilee Hills) - used until the browser shares a real position. */
export const DEFAULT_LOCATION = { latitude: 17.4325, longitude: 78.4072 }

export interface UserLocation {
  latitude: number
  longitude: number
  /** True once the browser provided a real fix. */
  precise: boolean
}

let cached: UserLocation | null = null

/**
 * Best-effort browser location. Starts at the city-centre fallback and upgrades once the user
 * grants permission, so distances are meaningful without blocking the page.
 */
export function useUserLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>(cached ?? { ...DEFAULT_LOCATION, precise: false })

  useEffect(() => {
    if (cached || typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        cached = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
          precise: true,
        }
        setLocation(cached)
      },
      () => {
        /* permission denied or unavailable: keep the fallback */
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
    )
  }, [])

  return location
}
