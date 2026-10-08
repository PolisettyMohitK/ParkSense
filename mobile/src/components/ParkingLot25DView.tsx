import { useMemo, useState } from 'react'
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { PublicSpace } from '../types'
import { makeStyles, useTheme } from '../theme/ThemeProvider'
import { radius, spacing } from '../theme/palette'

interface ParkingLot25DViewProps {
  spaces: PublicSpace[]
  selectedSpaceId: number | null
  onSelectSpace: (space: PublicSpace) => void
  isLoading?: boolean
}

type ViewMode = '2.5D' | '2D'

const BAY_WIDTH = 68
const BAY_HEIGHT = 90
const ISO_SLANT = 0.4

export default function ParkingLot25DView({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  isLoading,
}: ParkingLot25DViewProps) {
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const [viewMode, setViewMode] = useState<ViewMode>('2.5D')

  const availableCount = spaces.filter((s) => s.status === 'AVAILABLE').length
  const occupiedCount = spaces.filter((s) => s.status === 'OCCUPIED').length
  const reservedCount = spaces.filter((s) => s.status === 'RESERVED').length

  const screenWidth = Dimensions.get('window').width - spacing.lg * 2

  // Compute spatial bounding box
  const bounds = useMemo(() => {
    if (spaces.length === 0) return { width: screenWidth, height: 260 }
    const maxX = Math.max(...spaces.map((s) => (s.positionX ?? 0) + BAY_WIDTH))
    const maxY = Math.max(...spaces.map((s) => (s.positionY ?? 0) + BAY_HEIGHT))
    return {
      width: Math.max(screenWidth, maxX + 80),
      height: Math.max(260, maxY + 100),
    }
  }, [spaces, screenWidth])

  if (isLoading) {
    return (
      <View style={[styles.card, styles.emptyContainer]}>
        <Text style={styles.emptyText}>Loading parking spots…</Text>
      </View>
    )
  }

  if (spaces.length === 0) {
    return (
      <View style={[styles.card, styles.emptyContainer]}>
        <Ionicons name="car-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No parking spots mapped for this area.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      {/* Top Bar: Mode Toggle and Status Counts */}
      <View style={styles.toolbar}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendLabel}>{availableCount} Free</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendLabel}>{occupiedCount} Busy</Text>
          </View>
          {reservedCount > 0 ? (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.legendLabel}>{reservedCount} Res</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => setViewMode('2.5D')}
            style={[
              styles.modeBtn,
              viewMode === '2.5D' && { backgroundColor: colors.surface, borderColor: colors.separator },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={13}
              color={viewMode === '2.5D' ? colors.text : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                viewMode === '2.5D' ? styles.modeBtnActive : { color: colors.textSecondary },
              ]}
            >
              2.5D Lot
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('2D')}
            style={[
              styles.modeBtn,
              viewMode === '2D' && { backgroundColor: colors.surface, borderColor: colors.separator },
            ]}
          >
            <Ionicons
              name="map-outline"
              size={13}
              color={viewMode === '2D' ? colors.text : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                viewMode === '2D' ? styles.modeBtnActive : { color: colors.textSecondary },
              ]}
            >
              2D Plan
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Lot Canvas */}
      <View style={styles.lotCanvas}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ minWidth: bounds.width }}
        >
          <View style={{ width: bounds.width, height: bounds.height }}>
            {/* Drive Aisle Lane Markings */}
            <View style={[styles.driveAisle, { top: bounds.height / 2 - 20, width: bounds.width }]}>
              <View style={styles.laneDash} />
              <Text style={styles.laneText}>◄ DRIVE AISLE · ENTRY / EXIT ►</Text>
              <View style={styles.laneDash} />
            </View>

            {/* Parking Spaces */}
            {spaces.map((space) => {
              const isSelected = selectedSpaceId === space.id
              const isAvailable = space.status === 'AVAILABLE'
              const isOccupied = space.status === 'OCCUPIED'

              const posX = space.positionX ?? 40
              const posY = space.positionY ?? 60

              // 2.5D Isometric slant calculation
              const left = viewMode === '2.5D' ? posX + (posY * ISO_SLANT * 0.3) : posX
              const top = posY

              let bg = colors.success
              let edgeColor = '#0F5124'
              let textColor = '#FFFFFF'
              let statusText = 'FREE'

              if (isOccupied) {
                bg = colors.danger
                edgeColor = '#8A000D'
                statusText = 'BUSY'
              } else if (space.status === 'RESERVED') {
                bg = colors.warning
                edgeColor = '#6E3A00'
                statusText = 'RSVD'
              }

              return (
                <View
                  key={space.id}
                  style={[
                    styles.bayContainer,
                    {
                      left,
                      top,
                      width: BAY_WIDTH,
                      height: BAY_HEIGHT,
                    },
                    viewMode === '2.5D' && styles.bayIsoTransform,
                  ]}
                >
                  {/* 2.5D Isometric Extruded Edge (volumetric depth) */}
                  {viewMode === '2.5D' ? (
                    <View
                      style={[
                        styles.bayDepthEdge,
                        {
                          backgroundColor: edgeColor,
                          width: BAY_WIDTH,
                          height: BAY_HEIGHT,
                        },
                      ]}
                    />
                  ) : null}

                  {/* Main Bay Top Surface */}
                  <Pressable
                    disabled={!isAvailable}
                    onPress={() => onSelectSpace(space)}
                    style={({ pressed }) => [
                      styles.bayFace,
                      {
                        backgroundColor: bg,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
                        borderWidth: isSelected ? 2.5 : 1,
                      },
                      isSelected && styles.baySelectedGlow,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {/* Bay Stall Lines */}
                    <View style={styles.stallStripe} />

                    <View style={styles.bayContent}>
                      <Text style={[styles.bayCode, { color: textColor }]}>
                        {space.code ?? `S${space.id}`}
                      </Text>
                      {isOccupied ? (
                        <Ionicons name="car" size={15} color="#FFFFFF" style={{ marginVertical: 2 }} />
                      ) : (
                        <Text style={[styles.bayStatusPill, { color: textColor }]}>
                          {statusText}
                        </Text>
                      )}
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={10} color="#000000" />
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* Footer Helper */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.footerText}>
          {selectedSpaceId != null
            ? `Spot ${spaces.find((s) => s.id === selectedSpaceId)?.code ?? ''} selected · Tap "Reserve a spot" to confirm.`
            : 'Tap any green available spot to pick your parking bay.'}
        </Text>
      </View>
    </View>
  )
}

const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.separator,
      overflow: 'hidden',
      marginVertical: spacing.md,
    },
    emptyContainer: {
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      minHeight: 180,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.fill,
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    modeBtnText: {
      fontSize: 11,
      fontWeight: '600',
    },
    modeBtnActive: {
      color: colors.text,
      fontWeight: '700',
    },
    lotCanvas: {
      backgroundColor: '#181A1E',
      padding: spacing.md,
    },
    driveAisle: {
      position: 'absolute',
      height: 38,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    laneDash: {
      width: 40,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    laneText: {
      color: 'rgba(255,255,255,0.45)',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
    },
    bayContainer: {
      position: 'absolute',
    },
    bayIsoTransform: {
      transform: [{ skewX: '-8deg' }],
    },
    bayDepthEdge: {
      position: 'absolute',
      top: 5,
      left: 3,
      borderRadius: 8,
    },
    bayFace: {
      width: '100%',
      height: '100%',
      borderRadius: 8,
      padding: 4,
      justifyContent: 'space-between',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 4,
    },
    baySelectedGlow: {
      borderColor: '#FFFFFF',
      shadowColor: '#FFFFFF',
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 8,
    },
    stallStripe: {
      position: 'absolute',
      left: 3,
      top: 4,
      bottom: 4,
      width: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
      borderRadius: 1,
    },
    bayContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bayCode: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    bayStatusPill: {
      fontSize: 9,
      fontWeight: '700',
      marginTop: 2,
      letterSpacing: 0.5,
    },
    selectedBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.groupedBackground,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
  }),
)
