import { useMemo } from 'react'
import {
  CAR_SILHOUETTE,
  buildContours,
  buildGridLines,
  buildSceneLayout,
  carWireSegments,
  createTerrainForScene,
  fitProjection,
  projectPoint,
  sampleGrid,
  type Point2,
} from '../three/hololit'
import { statusKeyFor } from '../theme'
import type { SurveyTerrain } from '../three/hololit'
import type { HoloLotBay, HoloLotPalette } from '../three/HoloLotTypes'

interface HoloLot2DProps {
  bays: HoloLotBay[]
  seed: string
  survey?: SurveyTerrain | null
  palette: HoloLotPalette
  selectedBayId: number | null
  hoveredBayId: number | null
  activeBayId?: number | null
  selectableIds: Set<number>
  width: number
  height: number
  /** 90° is the accessible plan view; lower values give the isometric read. */
  pitchDeg: number
  yawDeg: number
  showLabels: boolean
  onSelect?: (bay: HoloLotBay | null) => void
  onHover?: (bay: HoloLotBay | null) => void
  onBackgroundClick?: () => void
}

function toPath(points: Array<{ x: number; y: number }>): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
}

/**
 * Isometric SVG rendering of the exact same scene the WebGL viewer draws.
 *
 * It is the accessible / low-power fallback, the mobile-equivalent look, the
 * empty-state illustration source and the booking-sheet thumbnail. Every
 * projection comes from the shared maths module, so 2D and 3D can never drift
 * apart visually.
 */
export default function HoloLot2D({
  bays,
  seed,
  survey,
  palette,
  selectedBayId,
  hoveredBayId,
  activeBayId,
  selectableIds,
  width,
  height,
  pitchDeg,
  yawDeg,
  showLabels,
  onSelect,
  onHover,
  onBackgroundClick,
}: HoloLot2DProps) {
  const gradientId = `holo-${seed.replace(/\W/g, '')}`

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
    const terrain = createTerrainForScene(seed, layout.width, layout.depth, survey)
    const fit = fitProjection(layout.bounds, height, width, 0.1, pitchDeg, yawDeg)
    const projection = { pitchDeg, yawDeg, scale: fit.scale }
    const project = (p: [number, number, number]) => {
      const point = projectPoint(p, projection)
      return { x: point.x + fit.offsetX, y: point.y + fit.offsetY, depth: point.depth }
    }
    return { layout, terrain, project }
  }, [bays, seed, survey, pitchDeg, yawDeg, width, height])

  const { layout, terrain, project } = scene

  const slab = useMemo(() => {
    const halfW = layout.width / 2
    const halfD = layout.depth / 2
    const corners: Array<[number, number]> = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [halfW, halfD],
      [-halfW, halfD],
    ]
    // The slab has thickness, so draw the rim faces before the top surface.
    const drop = 0.22
    const sides = corners.map((corner, index) => {
      const next = corners[(index + 1) % corners.length]
      const a = project([corner[0], terrain.heightAt(corner[0], corner[1]) - drop, corner[1]])
      const b = project([next[0], terrain.heightAt(next[0], next[1]) - drop, next[1]])
      const c = project([next[0], terrain.heightAt(next[0], next[1]), next[1]])
      const d = project([corner[0], terrain.heightAt(corner[0], corner[1]), corner[1]])
      return toPath([a, b, c, d])
    })
    const top = toPath(
      corners.map((corner) => project([corner[0], terrain.heightAt(corner[0], corner[1]), corner[1]])),
    )
    return { sides, top }
  }, [layout, terrain, project])

  const contours = useMemo(() => {
    const grid = sampleGrid(terrain, 40, 40)
    const result = buildContours(grid, 0.25)
    const segments: string[] = []
    for (let i = 0; i < result.positions.length; i += 6) {
      const ax = result.positions[i]
      const az = result.positions[i + 2]
      const bx = result.positions[i + 3]
      const bz = result.positions[i + 5]
      segments.push(
        toPath([
          project([ax, terrain.heightAt(ax, az) + 0.01, az]),
          project([bx, terrain.heightAt(bx, bz) + 0.01, bz]),
        ]).replace(/ Z$/, ''),
      )
    }
    return segments
  }, [terrain, project])

  const gridLines = useMemo(() => {
    const raw = buildGridLines(terrain, 1)
    const segments: string[] = []
    for (let i = 0; i < raw.length; i += 6) {
      segments.push(
        toPath([
          project([raw[i], raw[i + 1], raw[i + 2]]),
          project([raw[i + 3], raw[i + 4], raw[i + 5]]),
        ]).replace(/ Z$/, ''),
      )
    }
    return segments
  }, [terrain, project])

  const aisleChevrons = useMemo(() => {
    if (!layout.aisle) return []
    const count = 7
    const span = layout.bounds.maxX - layout.bounds.minX
    const out: Array<{ d: string; opacity: number }> = []
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count
      const x = layout.bounds.minX + t * span
      const z = layout.aisle.z
      const w = 0.5
      const d = 0.45
      out.push({
        d: toPath([
          project([x - w, terrain.heightAt(x - w, z) + 0.02, z - d]),
          project([x + w, terrain.heightAt(x + w, z - d) + 0.02, z - d]),
          project([x, terrain.heightAt(x, z + d * 0.2) + 0.02, z + d]),
        ]).replace(/ Z$/, ''),
        opacity: 0.1 + 0.16 * (1 - Math.abs(t - 0.5) * 2),
      })
    }
    return out
  }, [layout, terrain, project])

  const carSegments = useMemo(() => carWireSegments(), [])

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', touchAction: 'none' }}
      onClick={onBackgroundClick}
      role="presentation"
    >
      <defs>
        <linearGradient id={`${gradientId}-slab`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={palette.surfaceRaised} stopOpacity={palette.light ? 0.9 : 0.72} />
          <stop offset="100%" stopColor={palette.surface} stopOpacity={palette.light ? 0.95 : 0.5} />
        </linearGradient>
        <radialGradient id={`${gradientId}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={palette.holo} stopOpacity={palette.light ? 0.1 : 0.14} />
          <stop offset="100%" stopColor={palette.holo} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Floor: a soft pool of light sells the slab floating. */}
      <ellipse
        cx={width / 2}
        cy={height * 0.58}
        rx={Math.max(width, height) * 0.46}
        ry={Math.max(width, height) * 0.3}
        fill={`url(#${gradientId}-glow)`}
      />

      {slab.sides.map((d, index) => (
        <path key={index} d={d} fill={palette.canvas} opacity={0.9} />
      ))}
      <path d={slab.top} fill={`url(#${gradientId}-slab)`} stroke={palette.hairlineStrong} strokeWidth="1" />

      {gridLines.map((d, index) => (
        <path key={`g${index}`} d={d} stroke={palette.hairline} strokeWidth="0.6" fill="none" />
      ))}
      {contours.map((d, index) => (
        <path key={`c${index}`} d={d} stroke={palette.holo} strokeWidth="0.7" fill="none" opacity="0.32" />
      ))}

      {aisleChevrons.map((chevron, index) => (
        <path key={`v${index}`} d={chevron.d} stroke={palette.holo} strokeWidth="1" fill="none" opacity={chevron.opacity} />
      ))}

      {/* Bays, painted back to front. */}
      {layout.bays
        .map((bay) => {
          const meta = bays.find((b) => b.id === bay.id)
          return { bay, meta }
        })
        .filter((entry) => entry.meta)
        .sort((a, b) => project([a.bay.centroid[0], 0, a.bay.centroid[1]]).y - project([b.bay.centroid[0], 0, b.bay.centroid[1]]).y)
        .map(({ bay, meta }) => {
          const selected = bay.id === selectedBayId
          const hovered = bay.id === hoveredBayId
          const key = meta!.proposed ? 'proposed' : statusKeyFor(meta!.status)
          const tint = palette.status[key]
          const lift = selected ? 0.06 : 0
          const projected = bay.outline.map(([x, z]) =>
            project([x, terrain.heightAt(x, z) + 0.02 + lift, z]),
          )
          const label = project([bay.centroid[0], terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.06 + lift, bay.centroid[1]])
          const interactive = selectableIds.has(bay.id)
          const occupied = meta!.status === 'OCCUPIED'
          const reserved = meta!.status === 'RESERVED'
          const offline = meta!.status === 'OUT_OF_SERVICE'

          return (
            <g
              key={bay.id}
              onClick={(event) => {
                if (!interactive) return
                event.stopPropagation()
                onSelect?.(meta!)
              }}
              onPointerEnter={() => interactive && onHover?.(meta!)}
              onPointerLeave={() => onHover?.(null)}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              opacity={interactive || selected || hovered ? 1 : 0.62}
            >
              <path
                d={toPath(projected)}
                fill={offline ? palette.hairline : tint}
                fillOpacity={selected ? 0.3 : 0.12}
                stroke={tint}
                strokeWidth={selected ? 2.4 : hovered ? 1.8 : 1.2}
                strokeDasharray={meta!.proposed ? '4 3' : reserved ? '5 3' : undefined}
                strokeLinejoin="round"
              />
              {occupied ? (
                <CarGlyph
                  segments={carSegments}
                  outline={CAR_SILHOUETTE}
                  project={project}
                  centroid={bay.centroid}
                  height={terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.03 + lift}
                  angle={bay.angle}
                  tint={tint}
                />
              ) : null}
              {reserved ? <ClockGlyph centre={label} tint={tint} /> : null}
              {bay.id === activeBayId ? (
                <path
                  d={toPath(projected)}
                  fill="none"
                  stroke={palette.arc}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              ) : null}
              {showLabels ? (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="var(--font-mono, monospace)"
                  fill={interactive || selected ? palette.textPrimary : palette.textSecondary}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {bay.code}
                </text>
              ) : null}
            </g>
          )
        })}

      {selectedBayId !== null
        ? (() => {
            const bay = layout.bays.find((b) => b.id === selectedBayId)
            if (!bay) return null
            const centre = project([
              bay.centroid[0],
              terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.05,
              bay.centroid[1],
            ])
            return (
              <g aria-hidden>
                <ellipse cx={centre.x} cy={centre.y} rx={26} ry={9} fill={palette.holo} opacity="0.14" />
                <path
                  d={`M${centre.x - 5},${centre.y} L${centre.x},${centre.y - 16} L${centre.x + 5},${centre.y} Z`}
                  fill={palette.holo}
                  opacity="0.5"
                />
              </g>
            )
          })()
        : null}
    </svg>
  )
}

type Project = (p: [number, number, number]) => { x: number; y: number; depth: number }

/** Low-poly car drawn as a filled silhouette plus its wireframe seams. */
function CarGlyph({
  segments,
  outline,
  project,
  centroid,
  height,
  angle,
  tint,
}: {
  segments: Float32Array
  outline: readonly Point2[]
  project: Project
  centroid: Point2
  height: number
  angle: number
  tint: string
}) {
  const length = 4.2
  const width = 1.9
  const map = (p: Point2) => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const lx = p[0] * width
    const lz = p[1] * length
    return project([centroid[0] + lx * cos - lz * sin, height, centroid[1] + lx * sin + lz * cos])
  }
  const body = toPath(outline.map(map))
  const seams: string[] = []
  for (let i = 12; i < segments.length; i += 6) {
    seams.push(
      toPath([
        map([segments[i] * width, segments[i + 2] * length]),
        map([segments[i + 3] * width, segments[i + 5] * length]),
      ]).replace(/ Z$/, ''),
    )
  }
  return (
    <g aria-hidden pointerEvents="none">
      <path d={body} fill={tint} fillOpacity="0.22" stroke={tint} strokeWidth="0.9" strokeLinejoin="round" />
      {seams.map((d, index) => (
        <path key={index} d={d} stroke={tint} strokeWidth="0.6" fill="none" opacity="0.7" />
      ))}
    </g>
  )
}

function ClockGlyph({ centre, tint }: { centre: { x: number; y: number }; tint: string }) {
  const r = 4.6
  return (
    <g aria-hidden pointerEvents="none">
      <circle cx={centre.x} cy={centre.y - 9} r={r} fill="none" stroke={tint} strokeWidth="1" />
      <path
        d={`M${centre.x},${centre.y - 9 - r / 2} L${centre.x},${centre.y - 9} L${centre.x + r / 2},${centre.y - 9}`}
        stroke={tint}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  )
}

/* -------------------------------------------------------------------------- *
 * Interaction
 * -------------------------------------------------------------------------- */

