import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

// Fallback: Jubilee Hills, Hyderabad — used when permission is denied or location fails.
const FALLBACK = { latitude: 17.4325, longitude: 78.4072, label: 'Jubilee Hills, Hyderabad' }

export interface UserLocation {
  latitude: number
  longitude: number
  label: string
  granted: boolean
  loading: boolean
}

export function useUserLocation(): UserLocation {
  const [state, setState] = useState<UserLocation>({
    ...FALLBACK,
    granted: false,
    loading: true,
  })

  useEffect(() => {
    let active = true

    const resolve = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          if (active) setState({ ...FALLBACK, granted: false, loading: false })
          return
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        let label = 'Current location'
        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          if (places[0]) {
            const place = places[0]
            label = [place.district ?? place.street ?? place.name, place.city].filter(Boolean).join(', ')
          }
        } catch {
          /* reverse geocoding is best-effort */
        }
        if (active) {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: label || 'Current location',
            granted: true,
            loading: false,
          })
        }
      } catch {
        if (active) setState({ ...FALLBACK, granted: false, loading: false })
      }
    }

    resolve()
    return () => {
      active = false
    }
  }, [])

  return state
}
