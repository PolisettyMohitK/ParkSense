import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AppButton,
  AppInput,
  Badge,
  Card,
  EmptyState,
  Loading,
  Muted,
  Row,
  Screen,
  Title,
} from '../components/ui'
import { occupancyApi, spacesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { ParkingSpace } from '../types'
import type { RootStackParamList } from '../navigation/types'
import { radius, spacing, statusMaps } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

export default function ZoneDetailScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const statusColors = statusMaps(colors).space
  const route = useRoute<RouteProp<RootStackParamList, 'ZoneDetail'>>()
  const { zoneId, zoneName } = route.params
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [selected, setSelected] = useState<ParkingSpace | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const occupancyQuery = useQuery({
    queryKey: ['zone-occupancy', zoneId],
    queryFn: () => zonesApi.occupancy(zoneId),
  })
  const spacesQuery = useQuery({ queryKey: ['spaces', zoneId], queryFn: () => spacesApi.list(zoneId) })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['spaces', zoneId] })
    queryClient.invalidateQueries({ queryKey: ['zone-occupancy', zoneId] })
    queryClient.invalidateQueries({ queryKey: ['zones'] })
  }

  useOccupancyStream((event) => {
    if (event.zoneId === zoneId) {
      invalidate()
    }
  })

  const occupancyMutation = useMutation({
    mutationFn: ({ spaceId, state }: { spaceId: number; state: 'OCCUPIED' | 'VACANT' }) =>
      occupancyApi.record({ spaceId, state, source: 'MANUAL' }),
    onSuccess: () => {
      invalidate()
      setSelected(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ spaceId, status }: { spaceId: number; status: string }) =>
      spacesApi.verify(spaceId, status),
    onSuccess: () => {
      invalidate()
      setSelected(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const stateMutation = useMutation({
    mutationFn: ({ spaceId, state }: { spaceId: number; state: string }) =>
      spacesApi.changeOperationalState(spaceId, state),
    onSuccess: () => {
      invalidate()
      setSelected(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      spacesApi.create({
        zoneId,
        code: newCode,
        label: newLabel || null,
        verificationStatus: 'VERIFIED',
        operationalState: 'IN_SERVICE',
      }),
    onSuccess: () => {
      invalidate()
      setShowAdd(false)
      setNewCode('')
      setNewLabel('')
      setError(null)
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  if (spacesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  const occupancy = occupancyQuery.data
  const spaces = spacesQuery.data ?? []

  return (
    <Screen>
      <Row between>
        <View>
          <Title size={22}>{zoneName}</Title>
          <Muted>{occupancy ? `${occupancy.occupied} occupied · ${occupancy.available} available` : ''}</Muted>
        </View>
        {canManage ? (
          <AppButton
            label={showAdd ? 'Cancel' : '+ Space'}
            variant={showAdd ? 'ghost' : 'primary'}
            onPress={() => setShowAdd((value) => !value)}
          />
        ) : null}
      </Row>

      {showAdd ? (
        <Card>
          <AppInput value={newCode} onChangeText={setNewCode} placeholder="Space code (e.g. A13)" autoCapitalize="none" />
          <AppInput value={newLabel} onChangeText={setNewLabel} placeholder="Label (optional)" />
          <AppButton
            label="Add space"
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!newCode}
          />
        </Card>
      ) : null}

      {spaces.length === 0 ? (
        <EmptyState title="No spaces yet" subtitle="Add spaces, or import proposals from the camera page." />
      ) : (
        <View style={styles.grid}>
          {spaces.map((space) => {
            const palette = statusColors[space.status] ?? statusColors.AVAILABLE
            return (
              <Pressable
                key={space.id}
                onPress={() => {
                  setError(null)
                  setSelected(space)
                }}
                style={[styles.tile, { backgroundColor: palette.bg, borderColor: palette.fg }]}
              >
                <Text style={styles.tileCode}>{space.code ?? '—'}</Text>
                <Text style={[styles.tileStatus, { color: palette.fg }]}>{palette.label}</Text>
                {space.verificationStatus !== 'VERIFIED' ? (
                  <Text style={styles.tileFlag}>
                    {space.verificationStatus === 'PROPOSED' ? 'proposed' : 'rejected'}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      )}

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Title size={18}>Space {selected?.code ?? `#${selected?.id}`}</Title>
            {selected ? (
              <Row>
                <Badge kind="space" value={selected.status} />
                <Badge kind="verification" value={selected.verificationStatus} />
              </Row>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {canManage && selected ? (
              <>
                <AppButton
                  label="Mark occupied"
                  variant="danger"
                  disabled={selected.occupancyState === 'OCCUPIED'}
                  onPress={() => occupancyMutation.mutate({ spaceId: selected.id, state: 'OCCUPIED' })}
                />
                <AppButton
                  label="Mark vacant"
                  variant="success"
                  disabled={selected.occupancyState === 'VACANT'}
                  onPress={() => occupancyMutation.mutate({ spaceId: selected.id, state: 'VACANT' })}
                />
                {selected.verificationStatus === 'PROPOSED' ? (
                  <Row>
                    <AppButton
                      label="Verify"
                      variant="outline"
                      style={styles.flex}
                      onPress={() => verifyMutation.mutate({ spaceId: selected.id, status: 'VERIFIED' })}
                    />
                    <AppButton
                      label="Reject"
                      variant="ghost"
                      style={styles.flex}
                      onPress={() => verifyMutation.mutate({ spaceId: selected.id, status: 'REJECTED' })}
                    />
                  </Row>
                ) : null}
                <AppButton
                  label={selected.operationalState === 'IN_SERVICE' ? 'Out of service' : 'Restore service'}
                  variant="outline"
                  onPress={() =>
                    stateMutation.mutate({
                      spaceId: selected.id,
                      state: selected.operationalState === 'IN_SERVICE' ? 'OUT_OF_SERVICE' : 'IN_SERVICE',
                    })
                  }
                />
              </>
            ) : (
              <Muted>Only managers can change occupancy.</Muted>
            )}

            <AppButton label="Close" variant="ghost" onPress={() => setSelected(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%',
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  tileCode: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tileStatus: { fontSize: 11, fontWeight: '700' },
  tileFlag: { color: colors.textSecondary, fontSize: 10 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  flex: { flex: 1 },
  error: { color: colors.danger, fontSize: 13 },
}))
