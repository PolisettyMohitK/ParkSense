import { useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { AppButton, AppInput, Card, Muted, Screen, Title } from '../components/ui'
import { authApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { makeStyles } from '../theme/ThemeProvider'

/** Edit name/phone and change password. */
export default function AccountScreen() {
  const styles = useStyles()
  const { user, refreshUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const saveProfile = useMutation({
    mutationFn: () => authApi.updateProfile({ fullName: fullName.trim(), phone: phone.trim() || null }),
    onSuccess: async () => {
      await refreshUser()
      Alert.alert('Saved', 'Your profile was updated.')
    },
    onError: (err) => Alert.alert('Could not save', apiErrorMessage(err)),
  })

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
      Alert.alert('Password changed', 'Use your new password next time you sign in.')
    },
    onError: (err) => setPasswordError(apiErrorMessage(err)),
  })

  return (
    <Screen>
      <Title size={24}>Account</Title>
      <Card>
        <Muted>{user?.email}</Muted>
        <AppInput value={fullName} onChangeText={setFullName} placeholder="Full name" />
        <AppInput value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
        <AppButton
          label={saveProfile.isPending ? 'Saving…' : 'Save details'}
          onPress={() => saveProfile.mutate()}
          loading={saveProfile.isPending}
          disabled={!fullName.trim()}
        />
      </Card>
      <Card>
        <Title size={18}>Change password</Title>
        <AppInput value={current} onChangeText={setCurrent} placeholder="Current password" secureTextEntry autoCapitalize="none" />
        <AppInput value={next} onChangeText={setNext} placeholder="New password (8+ characters)" secureTextEntry autoCapitalize="none" />
        <AppInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" secureTextEntry autoCapitalize="none" />
        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        <AppButton
          label={changePassword.isPending ? 'Updating…' : 'Update password'}
          loading={changePassword.isPending}
          disabled={!current || !next}
          onPress={() => {
            if (next.length < 8) return setPasswordError('Use at least 8 characters')
            if (next !== confirm) return setPasswordError('Passwords do not match')
            setPasswordError(null)
            changePassword.mutate()
          }}
        />
      </Card>
    </Screen>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    error: { color: colors.danger, fontSize: 13 },
  }),
)
