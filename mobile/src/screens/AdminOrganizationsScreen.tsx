import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Card, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { organizationsApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function AdminOrganizationsScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const createMutation = useMutation({
    mutationFn: () => organizationsApi.create({ name, code, contactEmail: contactEmail || null, active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setShowForm(false)
      setName('')
      setCode('')
      setContactEmail('')
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (orgsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const organizations = orgsQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={22}>Organizations</Title>
        <AppButton label={showForm ? 'Cancel' : '+ Add'} variant={showForm ? 'ghost' : 'primary'} onPress={() => setShowForm((v) => !v)} />
      </Row>

      {showForm ? (
        <Card>
          <AppInput value={name} onChangeText={setName} placeholder="Organization name" />
          <AppInput value={code} onChangeText={setCode} placeholder="Code (e.g. DEMO)" autoCapitalize="none" />
          <AppInput value={contactEmail} onChangeText={setContactEmail} placeholder="Contact email" keyboardType="email-address" autoCapitalize="none" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label="Create organization"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !code}
          />
        </Card>
      ) : null}

      {organizations.length === 0 ? (
        <EmptyState title="No organizations" />
      ) : (
        organizations.map((org) => (
          <Card key={org.id}>
            <Title size={16}>{org.name}</Title>
            <Muted>
              {org.code} · {org.contactEmail ?? 'no contact'} · {org.active ? 'active' : 'inactive'}
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
