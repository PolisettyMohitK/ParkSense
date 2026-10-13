import { useMemo, useState } from 'react'
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, ChipRow, EmptyState, Loading, Muted, Row, Screen, Title } from '../components/ui'
import { occupancyApi, spacesApi, zonesApi } from '../api/endpoints'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../store/AuthContext'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import type { SpaceStatus } from '../types'
import { spacing, statusMaps } from '../theme/palette'
import { makeStyles, useTheme } from '../theme/ThemeProvider'

const TILE_W = 62
const TILE_H = 76

export default function MapScreen() {
  const styles = useStyles()
  const { colors } = useTheme()
  const statusColors = statusMaps(colors).space
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [zoneId, setZoneId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const zones = zonesQuery.data ?? []
  const activeZoneId = zoneId ?? zones[0]?.id ?? null

  const spacesQuery = useQuery({
    queryKey: ['spaces', activeZoneId],
    queryFn: () => spacesApi.list(activeZoneId as number),
    enabled: activeZoneId != null,
  })

  useOccupancyStream(() => {
    queryClient.invalidateQueries({ queryKey: ['spaces'] })
    queryClient.invalidateQueries({ queryKey: ['zones'] })
  })

  const toggleMutation = useMutation({
    mutationFn: ({ spaceId, state }: { spaceId: number; state: 'OCCUPIED' | 'VACANT' }) =>
      occupancyApi.record({ spaceId, state, source: 'MANUAL' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', activeZoneId] })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
    },
    onError: (err) => setError(apiErrorMessage(err)),
  })

  const spaces = spacesQuery.data ?? []
  const availableWidth = Dimensions.get('window').width - spacing.lg * 2

  const layout = useMemo(() => {
    if (spaces.length === 0) {
      return { scale: 1, width: availableWidth, height: 240 }
    }
    const maxX = Math.max(...spaces.map((space) => (space.positionX ?? 0) + TILE_W))
    const maxY = Math.max(...spaces.map((space) => (space.positionY ?? 0) + TILE_H))
    const scale = Math.min(1, availableWidth / (maxX + 40))
    return { scale, width: (maxX + 40) * scale, height: (maxY + 40) * scale }
  }, [spaces, availableWidth])

  if (zonesQuery.isLoading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    )
  }

  return (
    <Screen floatingTabs>
      <Title size={24}>Live map</Title>
      <Muted>Tap a space to toggle occupancy{canManage ? '' : ' (managers only)'}.</Muted>

      <ChipRow
        options={zones.map((zone) => ({ value: String(zone.id), label: zone.code }))}
        value={String(activeZoneId ?? '')}
        onChange={(value) => setZoneId(Number(value))}
      />

      {spacesQuery.isLoading ? (
        <Loading />
      ) : spaces.length === 0 ? (
        <EmptyState title="No positioned spaces" subtitle="This zone has no coordinates to draw." />
      ) : (
        <Card>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: layout.width, height: layout.height }}>
              {spaces.map((space) => {
                const palette = statusColors[space.status] ?? statusColors.AVAILABLE
                const left = (space.positionX ?? 0) * layout.scale
                const top = (space.positionY ?? 0) * layout.scale
                const canToggle = canManage && space.operationalState === 'IN_SERVICE'
                return (
                  <Pressable
                    key={space.id}
                    disabled={!canToggle}
                    onPress={() => {
                      setError(null)
                      toggleMutation.mutate({
                        spaceId: space.id,
                        state: space.occupancyState === 'OCCUPIED' ? 'VACANT' : 'OCCUPIED',
                      })
                    }}
                    style={[
                      styles.tile,
                      {
                        left,
                        top,
                        width: TILE_W * layout.scale,
                        height: TILE_H * layout.scale,
                        backgroundColor: palette.bg,
                        borderColor: palette.fg,
                      },
                    ]}
                  >
                    <Text style={[styles.tileCode, { fontSize: 13 * Math.max(0.7, layout.scale) }]}>
                      {space.code ?? '?'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </Card>
      )}

      <Row>
        {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE'] as SpaceStatus[]).map((status) => (
          <Row key={status}>
            <View
              style={[
                styles.legend,
                { backgroundColor: statusColors[status].bg, borderColor: statusColors[status].fg },
              ]}
            />
            <Muted>{statusColors[status].label}</Muted>
          </Row>
        ))}
      </Row>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  tile: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCode: { color: colors.text, fontWeight: '700' },
  legend: { width: 12, height: 12, borderRadius: 3, borderWidth: 2 },
  error: { color: colors.danger, fontSize: 13 },
}))
