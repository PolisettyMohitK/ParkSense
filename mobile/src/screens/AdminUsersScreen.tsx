import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Badge, Card, ChipRow, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { organizationsApi, usersApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import type { Role } from '../types'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function AdminUsersScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('USER')
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const createMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        fullName,
        email,
        password,
        role,
        organizationId: organizationId ?? orgsQuery.data?.[0]?.id ?? null,
        enabled: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setFullName('')
      setEmail('')
      setPassword('')
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (usersQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const users = usersQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={22}>Users</Title>
        <AppButton label={showForm ? 'Cancel' : '+ Add'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm((v) => !v)} />
      </Row>

      {showForm ? (
        <Card>
          <AppInput value={fullName} onChangeText={setFullName} placeholder="Full name" />
          <AppInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
          <AppInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoCapitalize="none" />
          <Muted>Role</Muted>
          <ChipRow
            options={[
              { value: 'ADMIN' as Role, label: 'Admin' },
              { value: 'MANAGER' as Role, label: 'Manager' },
              { value: 'USER' as Role, label: 'Driver' },
            ]}
            value={role}
            onChange={setRole}
          />
          <Muted>Organization</Muted>
          <ChipRow
            options={(orgsQuery.data ?? []).map((org) => ({ value: String(org.id), label: org.code }))}
            value={String(organizationId ?? orgsQuery.data?.[0]?.id ?? '')}
            onChange={(value) => setOrganizationId(Number(value))}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label="Create user"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!fullName || !email || !password}
          />
        </Card>
      ) : null}

      {users.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        users.map((user) => (
          <Card key={user.id}>
            <Row between>
              <Title size={16}>{user.fullName}</Title>
              <Badge kind="verification" value={user.role === 'ADMIN' ? 'VERIFIED' : 'PROPOSED'} />
            </Row>
            <Muted>{user.email}</Muted>
            <Muted>
              {user.role} · {user.organizationName ?? 'no organization'} · {user.enabled ? 'active' : 'disabled'}
            </Muted>
          </Card>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  error: { color: colors.danger, fontSize: 13 },
}))
