import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { AppButton, AppInput, Card, Muted, Screen, Title } from '../components/ui'
import { useAuth } from '../store/AuthContext'
import { apiErrorMessage } from '../api/client'
import { makeStyles } from '../theme/ThemeProvider'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Driver self sign-up. Staff accounts are created by an administrator. */
export default function RegisterScreen() {
  const styles = useStyles()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const problem = (() => {
    if (!fullName.trim()) return 'Enter your name'
    if (!EMAIL.test(email.trim())) return 'Enter a valid email address'
    if (password.length < 8) return 'Use a password of at least 8 characters'
    if (password !== confirm) return 'Passwords do not match'
    return null
  })()

  const submit = async () => {
    if (problem) {
      setError(problem)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <Title size={28}>Create account</Title>
      <Muted>Find and book parking across Hyderabad in seconds.</Muted>
      <Card>
        <AppInput value={fullName} onChangeText={setFullName} placeholder="Full name" autoCapitalize="words" />
        <AppInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppInput value={phone} onChangeText={setPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />
        <AppInput value={password} onChangeText={setPassword} placeholder="Password (8+ characters)" secureTextEntry autoCapitalize="none" />
        <AppInput value={confirm} onChangeText={setConfirm} placeholder="Confirm password" secureTextEntry autoCapitalize="none" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <AppButton label={loading ? 'Creating…' : 'Create account'} onPress={submit} loading={loading} />
      </Card>
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    error: { color: colors.danger, fontSize: 13 },
  }),
)
