import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppButton, AppInput, Card, ChipRow, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { sitesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { ZoneType } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { spacing } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function ZonesScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [showForm, setShowForm] = useState(false)
  const [siteId, setSiteId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [type, setType] = useState<ZoneType>('STRUCTURED')
  const [error, setError] = useState<string | null>(null)

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: () => sitesApi.list(), enabled: canManage })

  useOccupancyStream(() => {
    queryClient.invalidateQueries({ queryKey: ['zones'] })
  })

  const createMutation = useMutation({
    mutationFn: () =>
      zonesApi.create({
        siteId: siteId ?? sitesQuery.data?.[0]?.id,
        name,
        code,
        type,
        active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      setShowForm(false)
      setName('')
      setCode('')
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (zonesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const zones = zonesQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <Title size={24}>Parking zones</Title>
        {canManage ? (
          <AppButton
            label={showForm ? 'Cancel' : '+ New'}
            variant={showForm ? 'ghost' : 'primary'}
            onPress={() => setShowForm((value) => !value)}
          />
        ) : null}
      </Row>

      {showForm ? (
        <Card>
          <Muted>Site</Muted>
          <ChipRow
            options={(sitesQuery.data ?? []).map((site) => ({
              value: String(site.id),
              label: site.code,
            }))}
            value={String(siteId ?? sitesQuery.data?.[0]?.id ?? '')}
            onChange={(value) => setSiteId(Number(value))}
          />
          <AppInput value={name} onChangeText={setName} placeholder="Zone name (e.g. Level 2)" />
          <AppInput value={code} onChangeText={setCode} placeholder="Zone code (e.g. L2)" autoCapitalize="none" />
          <Muted>Type</Muted>
          <ChipRow
            options={[
              { value: 'STRUCTURED' as ZoneType, label: 'Structured' },
              { value: 'UNSTRUCTURED' as ZoneType, label: 'Unstructured' },
            ]}
            value={type}
            onChange={setType}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            label={createMutation.isPending ? 'Creating…' : 'Create zone'}
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!name || !code}
          />
        </Card>
      ) : null}

      {zones.length === 0 ? (
        <EmptyState title="No zones yet" subtitle="Zones hold the parking spaces and their occupancy." />
      ) : (
        zones.map((zone) => {
          const rate = zone.totalSpaces === 0 ? 0 : zone.occupiedSpaces / zone.totalSpaces
          return (
            <Pressable
              key={zone.id}
              onPress={() => navigation.navigate('ZoneDetail', { zoneId: zone.id, zoneName: zone.name })}
            >
              <Card>
                <Row between>
                  <View>
                    <Title size={17}>{zone.name}</Title>
                    <Muted>
                      {zone.siteName} · {zone.code} · {zone.type === 'STRUCTURED' ? 'Structured' : 'Unstructured'}
                    </Muted>
                  </View>
                  <Text style={styles.rate}>{Math.round(rate * 100)}%</Text>
                </Row>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(rate * 100)}%`,
                        backgroundColor: rate > 0.8 ? colors.danger : rate > 0.55 ? colors.warning : colors.success,
                      },
                    ]}
                  />
                </View>
                <Row>
                  <Text style={styles.stat}>{zone.totalSpaces} spaces</Text>
                  <Text style={[styles.stat, { color: colors.danger }]}>{zone.occupiedSpaces} occupied</Text>
                  <Text style={[styles.stat, { color: colors.success }]}>{zone.availableSpaces} free</Text>
                </Row>
              </Card>
            </Pressable>
          )
        })
      )}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  rate: { color: colors.text, fontSize: 20, fontWeight: '800' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fill,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  barFill: { height: 8, borderRadius: 4 },
  stat: { color: colors.textSecondary, fontSize: 12, marginRight: spacing.md },
  error: { color: colors.danger, fontSize: 13 },
}))
