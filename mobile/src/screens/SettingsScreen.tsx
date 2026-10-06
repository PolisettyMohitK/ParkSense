import { useEffect, useState } from 'react'
import { StyleSheet, Switch, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { AppButton, ListRow, ListSection, Screen, SegmentedControl, Title } from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { API_BASE, VISION_BASE } from '../api/client'
import { ensureNotificationPermission, setOccupancyNotifications } from '../notifications'
import { makeStyles, useTheme, type AppearancePreference } from '../theme/ThemeProvider'
import { spacing } from '../theme/palette'

const NOTIFY_KEY = 'parksense.notifyOccupancy'

export default function SettingsScreen() {
  const { biometricAvailable, biometricEnabled, setBiometric, logout } = useAuth()
  const { colors, preference, setPreference } = useTheme()
  const styles = useStyles()
  const [notifyEnabled, setNotifyEnabled] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync(NOTIFY_KEY).then((value) => {
      const enabled = value === 'true'
      setNotifyEnabled(enabled)
      setOccupancyNotifications(enabled)
    })
  }, [])

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await ensureNotificationPermission()
      if (!granted) {
        return
      }
    }
    setNotifyEnabled(value)
    setOccupancyNotifications(value)
    await SecureStore.setItemAsync(NOTIFY_KEY, value ? 'true' : 'false')
  }

  return (
    <Screen>
      <Title size={28}>Settings</Title>

      <ListSection title="Appearance" footer="Follows your device unless overridden.">
        <View style={styles.pad}>
          <SegmentedControl
            options={[
              { value: 'system' as AppearancePreference, label: 'System' },
              { value: 'light' as AppearancePreference, label: 'Light' },
              { value: 'dark' as AppearancePreference, label: 'Dark' },
            ]}
            value={preference}
            onChange={setPreference}
          />
        </View>
      </ListSection>

      <ListSection title="Security">
        <ListRow
          label="Biometric lock"
          hint={biometricAvailable ? 'Require Face ID / fingerprint on open' : 'Not available on this device'}
          right={
            <Switch
              value={biometricEnabled}
              onValueChange={(value) => {
                void setBiometric(value)
              }}
              disabled={!biometricAvailable}
              trackColor={{ true: colors.success, false: colors.fill }}
            />
          }
          last
        />
      </ListSection>

      <ListSection title="Notifications" footer="Alerts are local, driven by the live occupancy stream.">
        <ListRow
          label="Occupancy changes"
          hint="Notify me when spaces change state"
          right={
            <Switch
              value={notifyEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: colors.success, false: colors.fill }}
            />
          }
          last
        />
      </ListSection>

      <ListSection title="About">
        <ListRow label="Backend API" value={API_BASE.replace(/^https?:\/\//, '')} />
        <ListRow label="Vision service" value={VISION_BASE.replace(/^https?:\/\//, '')} last />
      </ListSection>

      <AppButton label="Sign out" variant="danger" onPress={() => logout()} />
    </Screen>
  )
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    pad: { padding: spacing.lg },
  }),
)
