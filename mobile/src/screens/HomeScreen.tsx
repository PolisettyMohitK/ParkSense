import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AppButton, Badge, Card, EmptyState, Loading, ListRow, ListSection, Muted, Row, Screen, Title } from '../components/ui'
import { analyticsApi, zonesApi } from '../api/endpoints'
import { useAuth } from '../store/AuthContext'
import { useOccupancyStream, useSocketStatus } from '../hooks/useOccupancyStream'
import { notify, occupancyNotificationsEnabled } from '../notifications'
import type { OccupancyChangedEvent } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { spacing } from '../theme/palette'
import { formatDistanceToNow } from 'date-fns'

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()
  const socketConnected = useSocketStatus()
  const [liveEvents, setLiveEvents] = useState<OccupancyChangedEvent[]>([])

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const summaryQuery = useQuery({ queryKey: ['analytics-summary'], queryFn: analyticsApi.summary })

  useOccupancyStream((event) => {
    setLiveEvents((previous) => [event, ...previous].slice(0, 6))
    if (occupancyNotificationsEnabled()) {
      notify(`${event.spaceCode ?? 'Space'} → ${event.state}`, `${event.zoneName} · ${event.source}`)
    }
  })

  if (zonesQuery.isLoading || summaryQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const summary = summaryQuery.data
  const zones = zonesQuery.data ?? []
  const utilization = summary ? Math.round(summary.utilizationRate * 100) : 0

  return (
    <Screen>
      <Row between>
        <View>
          <Text style={styles.kicker}>Operations</Text>
          <Title size={30}>{user?.fullName?.split(' ')[0] ?? 'Dashboard'}</Title>
        </View>
        <View style={styles.status}>
          <View
            style={[
              styles.dot,
              { backgroundColor: socketConnected ? colors.success : colors.textSecondary },
            ]}
          />
          <Muted>{socketConnected ? 'Live' : 'Offline'}</Muted>
        </View>
      </Row>

      {summary ? (
        <>
          <View style={styles.kpiRow}>
            <Kpi label="Occupied" value={summary.occupied} tone={colors.danger} />
            <Kpi label="Available" value={summary.available} tone={colors.success} />
          </View>
          <View style={styles.kpiRow}>
            <Kpi label="Zones" value={summary.zones} />
            <Kpi label="Spaces" value={summary.spaces} />
          </View>

          <Card>
            <Row between>
              <Muted>Utilization</Muted>
              <Text style={styles.big}>{utilization}%</Text>
            </Row>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${utilization}%`,
                    backgroundColor:
                      utilization > 80 ? colors.danger : utilization > 55 ? colors.warning : colors.success,
                  },
                ]}
              />
            </View>
            <Row between>
              <Muted>{summary.activeSessions} active sessions</Muted>
              <Muted>avg {Math.round(summary.averageSessionMinutes)} min</Muted>
            </Row>
          </Card>
        </>
      ) : null}

      <ListSection title="Quick actions">
        <ListRow
          label="Camera capture"
          hint="Propose slots or detect occupancy from a photo"
          onPress={() => navigation.navigate('Tabs', { screen: 'Camera' })}
        />
        <ListRow label="Zones" hint="Spaces, verification and occupancy" onPress={() => navigation.navigate('Zones')} />
        <ListRow label="Live map" hint="Spatial view of every zone" onPress={() => navigation.navigate('Map')} last />
      </ListSection>

      <ListSection title="Live activity">
        {liveEvents.length === 0 ? (
          <ListRow label="Waiting for occupancy events…" last />
        ) : (
          liveEvents.map((event, index) => (
            <ListRow
              key={`${event.spaceId}-${event.occurredAt}-${index}`}
              label={`${event.spaceCode ?? `#${event.spaceId}`} · ${event.zoneName}`}
              hint={`${event.source} · ${formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}`}
              right={<Badge kind="space" value={event.state === 'VACANT' ? 'AVAILABLE' : event.state} />}
              last={index === liveEvents.length - 1}
            />
          ))
        )}
      </ListSection>

      {zones.length === 0 ? (
        <EmptyState title="No zones yet" subtitle="Create a zone to start tracking occupancy." icon="layers-outline" />
      ) : null}
    </Screen>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  const styles = useStyles()
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, tone ? { color: tone } : null]}>{value}</Text>
      <Muted>{label}</Muted>
    </View>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    kicker: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dot: { width: 8, height: 8, borderRadius: 4 },
    kpiRow: { flexDirection: 'row', gap: spacing.md },
    kpi: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: 2,
    },
    kpiValue: { color: colors.text, fontSize: 26, fontWeight: '800' },
    big: { color: colors.text, fontSize: 22, fontWeight: '800' },
    track: { height: 8, borderRadius: 4, backgroundColor: colors.fill, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4 },
  }),
)
