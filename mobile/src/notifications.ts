import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

let occupancyNotifications = false

export function setOccupancyNotifications(enabled: boolean) {
  occupancyNotifications = enabled
}

export function occupancyNotificationsEnabled() {
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
