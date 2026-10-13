import * as SecureStore from 'expo-secure-store'
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const NOTIFY_KEY = 'parksense.notifyOccupancy'

let occupancyNotifications = false

export function occupancyNotificationsEnabled() {
  return occupancyNotifications
}

export async function setOccupancyNotifications(enabled: boolean): Promise<void> {
  occupancyNotifications = enabled
  try {
    await SecureStore.setItemAsync(NOTIFY_KEY, enabled ? 'true' : 'false')
  } catch {
    /* preference persistence is best-effort */
  }
}

/** Restore the persisted preference; call once on app start before the UI reads it. */
export async function loadOccupancyNotifications(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(NOTIFY_KEY)
    occupancyNotifications = value === 'true'
  } catch {
    occupancyNotifications = false
  }
  return occupancyNotifications
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) {
    return true
  }
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    })
  } catch {
    /* notifications are best-effort */
  }
}
