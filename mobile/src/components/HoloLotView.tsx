import { useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, Easing, type LayoutChangeEvent } from 'react-native'
import Svg, { G, Path, Line, Ellipse, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg'
import {
  CAR_SILHOUETTE,
  buildContours,
  buildGridLines,
  buildSceneLayout,
  createTerrainForScene,
  fitProjection,
  projectPoint,
  sampleGrid,
  type Point2,
} from '../three/hololit'
import { statusColor, statusKeyFor, type Palette } from '../theme/palette'
import type { PublicSpace } from '../types'

export type HoloLotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'

export interface HoloLotBay {
  id: number
  code: string
  status: HoloLotStatus
  proposed?: boolean
  positionX?: number | null
  positionY?: number | null
  polygon?: string | null
}

export interface HoloLotViewProps {
  bays: HoloLotBay[]
  seed: string
  colors: Palette
  selectedBayId: number | null
  activeBayId?: number | null
  /** Drivers may only act on free bays. */
  selectableStatuses?: HoloLotStatus[]
  onSelectBay?: (bay: HoloLotBay | null) => void
  height?: number
  showLabels?: boolean
  sweepTrigger?: number
  /** Renders the scanline sweep when live data lands. */
  sweep?: boolean
  reducedMotion?: boolean
  zoneName?: string
}

function toPath(points: Array<{ x: number; y: number }>, close = true): string {
  const body = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  return close ? `${body} Z` : body
}

/**
 * HoloLot on mobile: the same scene the web viewer draws, projected with the
 * same maths module and rendered as isometric SVG. 60 bays stay well inside
 * frame budget in Expo Go and it honours reduced motion by freezing the drift.
 */
export default function HoloLotView({
  bays,
  seed,
  colors,
  selectedBayId,
  activeBayId,
  selectableStatuses,
  onSelectBay,
  height = 320,
  showLabels = true,
  sweepTrigger = 0,
  sweep = true,
  reducedMotion = false,
  zoneName,
}: HoloLotViewProps) {
  const [size, setSize] = useState({ width: 360, height })
  const [hovered, setHovered] = useState<number | null>(null)
  const [yaw, setYaw] = useState(-30)
  const dragRef = useRef<{ x: number; yaw: number } | null>(null)
  const lastSweep = useRef(sweepTrigger)
  const scanAnim = useRef(new Animated.Value(0)).current

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: h } = event.nativeEvent.layout
    if (width > 0) setSize({ width, height: h })
  }

  if (sweepTrigger !== lastSweep.current) {
    lastSweep.current = sweepTrigger
    if (sweep && !reducedMotion) {
      scanAnim.setValue(0)
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }
  }

  const allowed = useMemo(() => new Set(selectableStatuses ?? (['AVAILABLE'] as HoloLotStatus[])), [selectableStatuses])

  const scene = useMemo(() => {
    const layout = buildSceneLayout(
      bays.map((bay) => ({
        id: bay.id,
        code: bay.code,
        positionX: bay.positionX,
        positionY: bay.positionY,
        polygon: bay.polygon,
      })),
    )
    const terrain = createTerrainForScene(seed, layout.width, layout.depth)
    const fit = fitProjection(layout.bounds, size.height, size.width, 0.1, 35, yaw)
    const project = (p: [number, number, number]) => {
      const point = projectPoint(p, fit)
      return { x: point.x + fit.offsetX, y: point.y + fit.offsetY, depth: point.depth }
    }
    return { layout, terrain, project }
  }, [bays, seed, size.width, size.height, yaw])

  const { layout, terrain, project } = scene

  const slab = useMemo(() => {
    const halfW = layout.width / 2
    const halfD = layout.depth / 2
    const corners: Point2[] = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [halfW, halfD],
      [-halfW, halfD],
    ]
    const drop = 0.22
    const sides = corners
      .map((corner, index) => {
        const next = corners[(index + 1) % corners.length]
        return toPath([
          project([corner[0], terrain.heightAt(corner[0], corner[1]) - drop, corner[1]]),
          project([next[0], terrain.heightAt(next[0], next[1]) - drop, next[1]]),
          project([next[0], terrain.heightAt(next[0], next[1]), next[1]]),
          project([corner[0], terrain.heightAt(corner[0], corner[1]), corner[1]]),
        ], false)
      })
      .join(' ')
    const top = toPath(corners.map((c) => project([c[0], terrain.heightAt(c[0], c[1]), c[1]])))
    return { sides, top }
  }, [layout, terrain, project])

  const contours = useMemo(() => {
    const result = buildContours(sampleGrid(terrain, 36, 36), 0.25)
    const out: string[] = []
    for (let i = 0; i < result.positions.length; i += 6) {
      const ax = result.positions[i]
      const az = result.positions[i + 2]
      const bx = result.positions[i + 3]
      const bz = result.positions[i + 5]
      out.push(
        toPath(
          [
            project([ax, terrain.heightAt(ax, az) + 0.01, az]),
            project([bx, terrain.heightAt(bx, bz) + 0.01, bz]),
          ],
          false,
        ),
      )
    }
    return out
  }, [terrain, project])

  const grid = useMemo(() => {
    const raw = buildGridLines(terrain, 1)
    const out: string[] = []
    for (let i = 0; i < raw.length; i += 6) {
      out.push(
        toPath([project([raw[i], raw[i + 1], raw[i + 2]]), project([raw[i + 3], raw[i + 4], raw[i + 5]])], false),
      )
    }
    return out
  }, [terrain, project])

  const painted = useMemo(
    () =>
      layout.bays
        .map((bay) => ({ bay, meta: bays.find((b) => b.id === bay.id) }))
        .filter((entry) => entry.meta)
        .sort(
          (a, b) =>
            project([a.bay.centroid[0], 0, a.bay.centroid[1]]).y -
            project([b.bay.centroid[0], 0, b.bay.centroid[1]]).y,
        ),
    [layout, bays, project],
  )

  return (
    <View onLayout={onLayout} style={[styles.wrap, { height }]}>
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          dragRef.current = { x: event.nativeEvent.pageX, yaw }
        }}
        onResponderMove={(event) => {
          if (!dragRef.current) return
          const dx = event.nativeEvent.pageX - dragRef.current.x
          dragRef.current = null
          setYaw(Math.max(-180, Math.min(180, yaw + dx * 0.3)))
        }}
        onResponderRelease={() => {
          dragRef.current = null
        }}
      >
        <Svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
          <Defs>
            <LinearGradient id="slab" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={colors.surfaceRaised} stopOpacity={colors.light ? 0.9 : 0.75} />
              <Stop offset="1" stopColor={colors.surface} stopOpacity={colors.light ? 0.95 : 0.5} />
            </LinearGradient>
          </Defs>

          <Ellipse
            cx={size.width / 2}
            cy={size.height * 0.58}
            rx={Math.max(size.width, size.height) * 0.46}
            ry={Math.max(size.width, size.height) * 0.3}
            fill={colors.holo}
            opacity={colors.light ? 0.08 : 0.12}
          />

          <Path d={slab.sides} fill={colors.background} opacity={0.9} />
          <Path d={slab.top} fill="url(#slab)" stroke={colors.hairlineStrong} strokeWidth={1} />

          {grid.map((d, i) => (
            <Path key={`g${i}`} d={d} stroke={colors.hairline} strokeWidth={0.6} fill="none" />
          ))}
          {contours.map((d, i) => (
            <Path key={`c${i}`} d={d} stroke={colors.holo} strokeWidth={0.7} fill="none" opacity={0.3} />
          ))}

          {painted.map(({ bay, meta }) => (
            <BayShape
              key={bay.id}
              bay={bay}
              meta={meta!}
              colors={colors}
              terrain={terrain}
              project={project}
              selected={bay.id === selectedBayId}
              hovered={bay.id === hovered}
              active={bay.id === activeBayId}
              interactive={allowed.has(meta!.status)}
              showLabel={showLabels}
            />
          ))}
        </Svg>
      </View>

      {/* Hit targets sit above the SVG so presses are reliable. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {painted.map(({ bay, meta }) => {
          const centre = project([bay.centroid[0], terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.02, bay.centroid[1]])
          const w = 34
          const h = 46
          if (centre.x < -w || centre.x > size.width + w || centre.y < -h || centre.y > size.height + h) return null
          return (
            <Pressable
              key={`hit-${bay.id}`}
              onPress={() => {
                if (allowed.has(meta!.status)) onSelectBay?.(meta!)
              }}
              onPressIn={() => setHovered(bay.id)}
              onPressOut={() => setHovered(null)}
              accessibilityRole="button"
              accessibilityLabel={`Bay ${bay.code}, ${meta!.status.toLowerCase().replace('_', ' ')}`}
              accessibilityState={{ selected: bay.id === selectedBayId, disabled: !allowed.has(meta!.status) }}
              style={{
                position: 'absolute',
                left: centre.x - w / 2,
                top: centre.y - h / 2,
                width: w,
                height: h,
              }}
            />
          )
        })}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.scan,
          {
            opacity: scanAnim.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, size.height] }) },
            ],
          },
        ]}
      />

      <View style={styles.readout} pointerEvents="none">
        {zoneName ? <Text style={styles.zone}>{zoneName}</Text> : null}
        <Text style={styles.counts}>
          <Text style={{ color: colors.success }}>{bays.filter((b) => b.status === 'AVAILABLE').length}</Text>
          {' free · '}
          <Text style={{ color: colors.danger }}>{bays.filter((b) => b.status === 'OCCUPIED').length}</Text>
          {' occupied · '}
          <Text style={{ color: colors.textTertiary }}>{bays.length}</Text>
        </Text>
      </View>
    </View>
  )
}

type Project = (p: [number, number, number]) => { x: number; y: number; depth: number }

function BayShape({
  bay,
  meta,
  colors,
  terrain,
  project,
  selected,
  hovered,
  active,
  interactive,
  showLabel,
}: {
  bay: { outline: Point2[]; centroid: Point2; code: string; angle: number }
  meta: HoloLotBay
  colors: Palette
  terrain: { heightAt: (x: number, z: number) => number }
  project: Project
  selected: boolean
  hovered: boolean
  active: boolean
  interactive: boolean
  showLabel: boolean
}) {
  const key = meta.proposed ? 'proposed' : statusKeyFor(meta.status)
  const tint = statusColor(colors, key)
  const lift = selected ? 0.06 : 0
  const outline = bay.outline.map(([x, z]) => project([x, terrain.heightAt(x, z) + 0.02 + lift, z]))
  const label = project([
    bay.centroid[0],
    terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.06 + lift,
    bay.centroid[1],
  ])

  const car = CAR_SILHOUETTE.map(([x, z]) => {
    const cos = Math.cos(bay.angle)
    const sin = Math.sin(bay.angle)
    const lx = x * 1.85
    const lz = z * 4.3
    return project([
      bay.centroid[0] + lx * cos - lz * sin,
      terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.03 + lift,
      bay.centroid[1] + lx * sin + lz * cos,
    ])
  })

  return (
    <G opacity={interactive || selected || hovered ? 1 : 0.62}>
      <Path
        d={toPath(outline)}
        fill={meta.status === 'OUT_OF_SERVICE' ? colors.hairline : tint}
        fillOpacity={selected ? 0.3 : 0.12}
        stroke={tint}
        strokeWidth={selected ? 2.4 : hovered ? 1.8 : 1.2}
        strokeDasharray={meta.proposed ? '4 3' : meta.status === 'RESERVED' ? '5 3' : undefined}
        strokeLinejoin="round"
      />
      {meta.status === 'OCCUPIED' ? (
        <>
          <Path d={toPath(car)} fill={tint} fillOpacity={0.22} stroke={tint} strokeWidth={0.9} strokeLinejoin="round" />
          <Line
            x1={car[8].x}
            y1={car[8].y}
            x2={car[9].x}
            y2={car[9].y}
            stroke={tint}
            strokeWidth={0.6}
          />
        </>
      ) : null}
      {active ? (
        <Path d={toPath(outline)} fill="none" stroke={colors.arc} strokeWidth={2.2} strokeLinejoin="round" />
      ) : null}
      {selected ? (
        <>
          <Ellipse cx={label.x} cy={label.y} rx={26} ry={9} fill={colors.holo} opacity={0.14} />
          <Path
            d={`M${label.x - 5},${label.y} L${label.x},${label.y - 16} L${label.x + 5},${label.y} Z`}
            fill={colors.holo}
            opacity={0.5}
          />
        </>
      ) : null}
      {showLabel ? (
        <SvgText
          x={label.x}
          y={label.y}
          fill={interactive || selected ? colors.text : colors.textSecondary}
          fontSize={9}
          fontFamily={colors.mono}
          textAnchor="middle"
        >
          {bay.code.slice(0, 5)}
        </SvgText>
      ) : null}
    </G>
  )
}

/** The single faint scanline pass, fired once when live data lands. */
const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,190,230,0.12)',
    backgroundColor: 'transparent',
  },
  readout: {
    position: 'absolute',
    top: 12,
    left: 14,
    gap: 2,
  },
  zone: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: 'rgba(154,164,178,1)',
  },
  counts: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    color: 'rgba(233,238,245,1)',
  },
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 80,
    backgroundColor: 'rgba(92,225,255,0.10)',
  },
})
