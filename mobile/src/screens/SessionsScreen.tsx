import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { sessionsApi } from '../api/endpoints'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function SessionsScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const sessionsQuery = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => sessionsApi.list() })

  if (sessionsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const sessions = sessionsQuery.data ?? []

  return (
    <Screen>
      <Title size={24}>My sessions</Title>
      <Muted>A session opens automatically when you park and closes when you leave.</Muted>
      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet" subtitle="Your parking history will appear here." />
      ) : (
        sessions.map((session) => (
          <Card key={session.id}>
            <Row between>
              <Title size={16}>{session.spaceCode ?? session.code}</Title>
              <Badge kind="reservation" value={session.status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED'} />
            </Row>
            <Muted>{session.zoneName}</Muted>
            <Row>
              <Text style={styles.meta}>In {new Date(session.checkInAt).toLocaleString()}</Text>
            </Row>
            {session.checkOutAt ? (
              <Row>
                <Text style={styles.meta}>Out {new Date(session.checkOutAt).toLocaleString()}</Text>
              </Row>
            ) : null}
            {session.durationMinutes != null ? (
              <Text style={styles.duration}>{session.durationMinutes} minutes</Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  meta: { color: colors.textSecondary, fontSize: 12 },
  duration: { color: colors.text, fontWeight: '700' },
}))
