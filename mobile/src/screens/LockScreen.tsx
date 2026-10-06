import { StyleSheet, Text, View } from 'react-native'
import { AppButton, Screen } from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function LockScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const { unlock, logout, user } = useAuth()

  return (
    <Screen scroll={false} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.lock}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
        <Text style={styles.title}>ParkSense is locked</Text>
        <Text style={styles.subtitle}>{user?.email}</Text>
      </View>

      <View style={styles.actions}>
        <AppButton label="Unlock" onPress={() => unlock()} />
        <AppButton label="Sign out" variant="ghost" onPress={() => logout()} />
      </View>
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  lock: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  lockIcon: { fontSize: 40 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 14 },
  actions: { gap: spacing.sm, marginBottom: spacing.xl },
}))
