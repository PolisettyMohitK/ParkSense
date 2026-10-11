import { StyleSheet, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { AppButton, Badge, Card, EmptyState, ErrorState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { mySessionsApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useStayActions } from '../hooks/useStayActions'
import { makeStyles } from '../theme/ThemeProvider'
import { formatDuration, formatMoney, formatWhen } from '../utils/format'

/** The signed-in user's own parking stays and receipts. */
export default function SessionsScreen() {
  const styles = useStyles()
  const sessionsQuery = useQuery({ queryKey: queryKeys.mySessions.all, queryFn: () => mySessionsApi.list() })
  const { openPayment, paymentSheet } = useStayActions()

  if (sessionsQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const sessions = sessionsQuery.data ?? []

  return (
    <Screen onRefresh={() => sessionsQuery.refetch()} refreshing={sessionsQuery.isRefetching}>
      <Title size={24}>My parking history</Title>
      <Muted>A stay starts when you check in and ends when you check out.</Muted>
      {sessionsQuery.isError ? (
        <ErrorState message={apiErrorMessage(sessionsQuery.error)} onRetry={() => sessionsQuery.refetch()} />
      ) : sessions.length === 0 ? (
        <EmptyState title="No stays yet" subtitle="Your parking history and receipts will appear here." />
      ) : (
        sessions.map((session) => (
          <Card key={session.id}>
            <Row between>
              <Title size={16}>{session.siteName ?? session.zoneName ?? session.code}</Title>
              {session.status === 'ACTIVE' ? (
                <Badge kind="session" value="ACTIVE" />
              ) : session.paymentStatus ? (
                <Badge kind="payment" value={session.paymentStatus} />
              ) : null}
            </Row>
            <Muted>
              Bay {session.spaceCode ?? '—'} · {session.zoneName} · {formatWhen(session.checkInAt)}
            </Muted>
            <Row between>
              <Text style={styles.meta}>
                {session.status === 'ACTIVE' ? 'In progress' : formatDuration(session.durationMinutes)}
              </Text>
              <Text style={styles.amount}>{session.hourlyRate ? formatMoney(session.amount) : 'Free'}</Text>
            </Row>
            {session.paymentStatus === 'PENDING' ? (
              <AppButton label={`Pay ${formatMoney(session.amount)}`} onPress={() => openPayment(session)} />
            ) : null}
            {session.paymentRef ? <Muted>Receipt {session.paymentRef}</Muted> : null}
          </Card>
        ))
      )}
      {paymentSheet}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  meta: { color: colors.textSecondary, fontSize: 13 },
  amount: { color: colors.text, fontWeight: '700' },
}))
