import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { AppButton, AppInput, Screen, SectionLabel, Title } from '../components/ui'
import HoloLotView, { type HoloLotBay } from '../components/HoloLotView'
import { useAuth } from '../store/AuthContext'
import { apiErrorMessage } from '../api/client'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { DemoPills } from '../components/DemoPills'

const CREDENTIALS: Record<string, { email: string; password: string }> = {
  admin: { email: 'admin@parking.dev', password: 'admin123' },
  manager: { email: 'manager@parking.dev', password: 'manager123' },
  user: { email: 'user@parking.dev', password: 'user123' },
}

/** Deterministic ambient lot — no data needed, so the scene is always calm. */
function idleBays(): HoloLotBay[] {
  const bays: HoloLotBay[] = []
  const cycle: HoloLotBay['status'][] = [
    'AVAILABLE',
    'OCCUPIED',
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED',
    'OCCUPIED',
    'AVAILABLE',
    'OCCUPIED',
  ]
  for (let i = 0; i < 40; i += 1) {
    const row = Math.floor(i / 8)
    const col = i % 8
    bays.push({
      id: i + 1,
      code: `${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, '0')}`,
      status: cycle[(i * 5 + row * 3) % cycle.length],
      positionX: col * 122,
      positionY: row === 0 ? 56 : 356,
    })
  }
  return bays
}

export default function LoginScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { login } = useAuth()
  const [email, setEmail] = useState(__DEV__ ? CREDENTIALS.user.email : '')
  const [password, setPassword] = useState(__DEV__ ? CREDENTIALS.user.password : '')
  const [demo, setDemo] = useState<'admin' | 'manager' | 'user'>('user')
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
      {/* The scene sits behind the form as a dimmed band — the product's
          signature should be visible even on a phone, just quiet. */}
      <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HoloLotView
          bays={idleBays()}
          seed="parksense-auth"
          colors={colors}
          selectedBayId={null}
          height={190}
          showLabels={false}
        />
        <View style={styles.sceneScrim} pointerEvents="none" />
      </View>

      <View style={styles.hero}>
        <View style={styles.mark} />
        <Title>ParkSense</Title>
      </View>

      <View style={{ gap: spacing.md }}>
        <Title size={22}>Sign in</Title>
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
        <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="link">
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <SectionLabel>Demo accounts</SectionLabel>
          <DemoPills value={demo} onChange={pickDemo} />
        </View>
      ) : null}

      <Text style={styles.footer}>Real-time parking management &amp; analytics</Text>
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    scene: {
      marginHorizontal: -spacing.lg,
      marginTop: -spacing.lg,
      marginBottom: spacing.lg,
      opacity: 0.55,
      overflow: 'hidden',
    },
    sceneScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 70,
      backgroundColor: colors.background,
      opacity: 0.9,
    },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
    mark: {
      width: 24,
      height: 24,
      backgroundColor: colors.holo,
    },
    error: { color: colors.danger, fontSize: 13 },
    link: { color: colors.text, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.sm },
    footer: {
      color: colors.textTertiary,
      fontSize: 11,
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
  }),
)
