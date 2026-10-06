import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, AppInput, Card, ChipRow, Muted, Screen, Title } from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { apiErrorMessage } from '../api/client'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

const DEMO = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'user', label: 'Driver' },
] as const

const CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: 'admin@parking.dev', password: 'admin123' },
  manager: { email: 'manager@parking.dev', password: 'manager123' },
  user: { email: 'user@parking.dev', password: 'user123' },
}

export default function LoginScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const { login } = useAuth()
  const [email, setEmail] = useState(CREDENTIALS.admin.email)
  const [password, setPassword] = useState(CREDENTIALS.admin.password)
  const [demo, setDemo] = useState<'admin' | 'manager' | 'user'>('admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const pickDemo = (value: 'admin' | 'manager' | 'user') => {
    setDemo(value)
    setEmail(CREDENTIALS[value].email)
    setPassword(CREDENTIALS[value].password)
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Title size={28}>ParkSense</Title>
        <Muted>Real-time parking, in your pocket.</Muted>
      </View>

      <Card>
        <Title size={18}>Sign in</Title>
        <AppInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label={loading ? 'Signing in…' : 'Sign in'} onPress={submit} loading={loading} />
      </Card>

      <Card>
        <Muted>Quick demo accounts</Muted>
        <ChipRow options={DEMO.map((item) => ({ value: item.value, label: item.label }))} value={demo} onChange={pickDemo} />
      </Card>

      <Text style={styles.footer}>Configurable Real-Time Parking Management & Analytics</Text>
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.lg },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13 },
  footer: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
}))
