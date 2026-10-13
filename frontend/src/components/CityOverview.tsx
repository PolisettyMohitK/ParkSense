import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import { fitProjection, projectPoint, type Point3 } from '../three/hololit'
import type { ParkingZone } from '../types'

/** Fixed camera for the city overview: high enough to read as a plan, not a lot. */
const PITCH_DEG = 62
const YAW_DEG = -18

export interface SiteCoord {
  lat: number
  lng: number
}

interface Slab {
  id: number
  siteId: number
  label: string
  rate: number
  level: number
  tone: 'free' | 'reserved' | 'occupied'
  top: string
  sides: string
  cx: number
  cy: number
  rx: number
  ry: number
  drop: number
}

export interface CityOverviewProps {
  zones: ParkingZone[]
  /** Real coordinates per site, keyed by site id. */
  siteCoords: Record<number, SiteCoord>
  width: number
  height: number
  selectedSiteId: number | null
  onSelect: (zone: ParkingZone) => void
}

/**
 * City overview: every venue as a small floating slab positioned by its real
 * latitude/longitude and stacked by floor level. A slab's glow encodes
 * occupancy, so the whole city reads as one instrument. Clicking a slab
 * selects that venue.
 */
export default function CityOverview({
  zones,
  siteCoords,
  width,
  height,
  selectedSiteId,
  onSelect,
}: CityOverviewProps) {
  const theme = useTheme()

  const fit = useMemo(
    () => fitProjection({ minX: -40, maxX: 40, minY: -30, maxY: 30 }, height, width, 0.12, PITCH_DEG, YAW_DEG),
    [height, width],
  )

  const slabs = useMemo(() => buildSlabs(zones, siteCoords, fit), [zones, siteCoords, fit])

  const grid = useMemo(() => {
    const out: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    const p = (x: number, z: number) => {
      const point = projectPoint([x, 0, z] as Point3, fit)
      return { x: point.x + fit.offsetX, y: point.y + fit.offsetY }
    }
    for (let i = -4; i <= 4; i += 1) {
      const a = p(i * 10, -30)
      const b = p(i * 10, 30)
      out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      const c = p(-40, i * 8)
      const d = p(40, i * 8)
      out.push({ x1: c.x, y1: c.y, x2: d.x, y2: d.y })
    }
    return out
  }, [fit])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      role="group"
      aria-label={`City overview: ${zones.length} parking areas`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="cityGlow" cx="0.5" cy="0.5" r="0.5">
          <stop
            offset="0%"
            stopColor={theme.stark.holo}
            stopOpacity={theme.palette.mode === 'dark' ? 0.12 : 0.08}
          />
          <stop offset="100%" stopColor={theme.stark.holo} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={width / 2} cy={height * 0.58} rx={width * 0.45} ry={height * 0.32} fill="url(#cityGlow)" />

      {grid.map((line, index) => (
        <line
          key={index}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={theme.stark.hairline}
          strokeWidth="0.5"
        />
      ))}

      {slabs.map((slab) => {
        const selected = slab.siteId === selectedSiteId
        const tint = theme.stark.status[slab.tone]
        const zone = zones.find((z) => z.id === slab.id)
        return (
          <g
            key={slab.id}
            role="button"
            tabIndex={0}
            aria-label={`${slab.label} ${zone?.name ?? ''}, ${Math.round(slab.rate * 100)} percent occupied`}
            onClick={() => zone && onSelect(zone)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (zone) onSelect(zone)
              }
            }}
            style={{ cursor: 'pointer', opacity: slab.level > 0 && !selected ? 0.35 : 1 }}
          >
            {/* Ground shadow sells the float. */}
            <ellipse
              cx={slab.cx}
              cy={slab.cy + slab.drop * 1.4}
              rx={slab.rx * 1.2}
              ry={slab.ry * 1.2}
              fill={theme.palette.mode === 'dark' ? '#000000' : theme.stark.hairline}
              opacity={0.4}
            />
            <path d={slab.sides} fill={theme.stark.surfaceRaised} stroke={theme.stark.hairline} strokeWidth="0.6" />
            <path
              d={slab.top}
              fill={theme.stark.surfaceRaised}
              stroke={selected ? theme.stark.holo : theme.stark.hairlineStrong}
              strokeWidth={selected ? 1.6 : 0.9}
            />
            {/* Occupancy glow: brighter the fuller the venue. */}
            <path
              d={slab.top}
              fill="none"
              stroke={tint}
              strokeWidth={selected ? 2.6 : 1.5}
              opacity={0.3 + slab.rate * 0.7}
              strokeLinejoin="round"
            />
            <circle cx={slab.cx} cy={slab.cy - slab.drop * 0.6} r={2.4} fill={tint} />
          </g>
        )
      })}
    </svg>
  )
}

function buildSlabs(
  zones: ParkingZone[],
  siteCoords: Record<number, SiteCoord>,
  fit: ReturnType<typeof fitProjection>,
): Slab[] {
  const known = Object.values(siteCoords)
  const meanLat = known.length ? known.reduce((s, c) => s + c.lat, 0) / known.length : 17.385
  const meanLng = known.length ? known.reduce((s, c) => s + c.lng, 0) / known.length : 78.4867
  const spanLat = Math.max(0.015, ...known.map((c) => Math.abs(c.lat - meanLat)))
  const spanLng = Math.max(0.015, ...known.map((c) => Math.abs(c.lng - meanLng)))

  const floors = new Map<string, number>()
  for (const zone of zones) {
    const floor = zone.floor ?? 'G'
    if (!floors.has(floor)) floors.set(floor, floors.size)
  }

  const project = (x: number, y: number, z: number) => {
    const point = projectPoint([x, y, z] as Point3, fit)
    return { x: point.x + fit.offsetX, y: point.y + fit.offsetY }
  }
  const path = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return zones
    .map((zone, index) => {
      const coords = siteCoords[zone.siteId]
      const gx = coords ? ((coords.lng - meanLng) / spanLng) * 34 : Math.cos(index * 1.7) * 22
      const gz = coords ? -((coords.lat - meanLat) / spanLat) * 24 : Math.sin(index * 1.7) * 16
      const level = floors.get(zone.floor ?? 'G') ?? 0
      const y = level * 4.5

      const rate = zone.totalSpaces === 0 ? 0 : zone.occupiedSpaces / zone.totalSpaces
      const tone: Slab['tone'] = rate > 0.9 ? 'occupied' : rate > 0.6 ? 'reserved' : 'free'

      const w = Math.max(3, Math.min(9, 3 + Math.sqrt(Math.max(1, zone.totalSpaces)) * 0.7))
      const d = Math.max(2.5, Math.min(7, 2 + Math.sqrt(Math.max(1, zone.totalSpaces)) * 0.5))
      const drop = 1.3

      const corners: Array<[number, number, number]> = [
        [gx - w / 2, y, gz - d / 2],
        [gx + w / 2, y, gz - d / 2],
        [gx + w / 2, y, gz + d / 2],
        [gx - w / 2, y, gz + d / 2],
      ]
      const top = corners.map((c) => project(c[0], c[1], c[2]))
      const bottom = corners.map((c) => project(c[0], c[1] - drop, c[2]))
      const sides = [0, 1, 2, 3]
        .map((i) => path([top[i], top[(i + 1) % 4], bottom[(i + 1) % 4], bottom[i]]))
        .join(' ')

      return {
        id: zone.id,
        siteId: zone.siteId,
        label: zone.siteName,
        rate,
        level,
        tone,
        top: path(top),
        sides,
        cx: (top[0].x + top[2].x) / 2,
        cy: (top[0].y + top[2].y) / 2,
        rx: Math.abs(top[1].x - top[0].x) / 2,
        ry: Math.abs(top[0].y - top[3].y) / 2,
        drop,
      }
    })
    .sort((a, b) => a.level - b.level)
}
