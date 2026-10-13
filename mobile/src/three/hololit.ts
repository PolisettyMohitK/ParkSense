/**
 * HoloLot scene maths - mobile mirror.
 *
 * This file is intentionally identical to `frontend/src/three/hololit.ts` apart
 * from its docblock. Both apps ship separate bundler roots (Vite vs Metro) and
 * neither is configured to reach outside its own directory, so the module is
 * mirrored rather than hoisted into a shared workspace package. The web copy
 * carries the Vitest suite that pins the behaviour; this copy is consumed
 * verbatim by the isometric SVG renderer.
 *
 * Do not edit one without the other.
 */

import { sceneTokens } from '../theme/tokens.generated'

export type Point2 = [number, number]
export type Point3 = [number, number, number]

/** Minimum layout-unit pitch a seeded bay column uses. Used as the metre anchor. */
const ANCHOR_BAY_UNITS = 92

/* -------------------------------------------------------------------------- *
 * Numbers
 * -------------------------------------------------------------------------- */

const NUMERIC = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Stable 32-bit string hash (FNV-1a). Same input → same seed on every platform. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/* -------------------------------------------------------------------------- *
 * Polygon parsing
 * -------------------------------------------------------------------------- */

/**
 * Parse a space polygon from either wire format.
 *
 * Seeded layouts: `"[0,0 40,0 40,80 0,80]"`
 * Survey / camera layouts: `"[[0,0],[40,0],[40,80],[0,80]]"`
 *
 * Both reduce to the same thing once the numbers are pulled out in order, so
 * the parser collects every numeric literal and pairs them. Returns `null` for
 * anything that cannot yield at least three finite points.
 */
export function parsePolygon(raw: string | null | undefined): Point2[] | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text) return null

  const numbers = text.match(NUMERIC)
  if (!numbers || numbers.length < 6 || numbers.length % 2 !== 0) return null

  const points: Point2[] = []
  for (let i = 0; i < numbers.length; i += 2) {
    const x = Number(numbers[i])
    const y = Number(numbers[i + 1])
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    points.push([x, y])
  }

  // Drop a duplicated closing vertex — several sources emit one.
  const first = points[0]
  const last = points[points.length - 1]
  if (points.length > 3 && first[0] === last[0] && first[1] === last[1]) {
    points.pop()
  }

  return points.length >= 3 ? points : null
}

/* -------------------------------------------------------------------------- *
 * Polygon helpers
 * -------------------------------------------------------------------------- */

export function polygonCentroid(points: Point2[]): Point2 {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % points.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  if (Math.abs(area) < 1e-9) {
    const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]] as Point2, [0, 0] as Point2)
    return [sum[0] / points.length, sum[1] / points.length]
  }
  area *= 0.5
  return [cx / (6 * area), cy / (6 * area)]
}

export interface Bounds2 {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boundsOf(points: readonly Point2[]): Bounds2 {
  const bounds: Bounds2 = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const [x, y] of points) {
    if (x < bounds.minX) bounds.minX = x
    if (y < bounds.minY) bounds.minY = y
    if (x > bounds.maxX) bounds.maxX = x
    if (y > bounds.maxY) bounds.maxY = y
  }
  if (!Number.isFinite(bounds.minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return bounds
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Rectangular footprint centred on (cx, cy), in layout units.
 * `widthUnits`/`lengthUnits` default to the seeded pitch so a bay keeps its
 * footprint before normalisation.
 */
export function rectangleFootprint(
  cx: number,
  cy: number,
  widthUnits = ANCHOR_BAY_UNITS,
  lengthUnits = 112,
): Point2[] {
  const hw = widthUnits / 2
  const hl = lengthUnits / 2
  return [
    [cx - hw, cy - hl],
    [cx + hw, cy - hl],
    [cx + hw, cy + hl],
    [cx - hw, cy + hl],
  ]
}

/**
 * Deterministic double-row layout with a central drive aisle, used when a bay
 * has neither a polygon nor a position. Ordering is by `code` so the same venue
 * always produces the same lot.
 */
export function fallbackLayout(count: number, aisleUnits = 112): Point2[] {
  const perRow = Math.max(1, Math.ceil(count / 2))
  const centres: Point2[] = []
  for (let i = 0; i < count; i += 1) {
    const row = i < perRow ? 0 : 1
    const col = i % perRow
    const x = col * (ANCHOR_BAY_UNITS + 30)
    const y = row === 0 ? 56 : 56 + aisleUnits + 112
    centres.push([x + ANCHOR_BAY_UNITS / 2, y])
  }
  return centres
}

/* -------------------------------------------------------------------------- *
 * Scene layout
 * -------------------------------------------------------------------------- */

export type BayStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'

export interface BayInput {
  id: number
  code?: string | null
  positionX?: number | null
  positionY?: number | null
  polygon?: string | null
}

export interface BayGeometry {
  id: number
  code: string
  /** Outline in scene metres, relative to the slab origin. */
  outline: Point2[]
  centroid: Point2
  /** Yaw of the bay's long axis in radians (0 = long axis along Z). */
  angle: number
  /** True when the outline was generated rather than supplied. */
  synthetic: boolean
  /** `position` (both coords), `polygon` or `generated`. */
  source: 'position' | 'polygon' | 'generated'
}

export interface SceneLayout {
  bays: BayGeometry[]
  /** Metres per API layout unit used for the normalisation. */
  scale: number
  bounds: Bounds2
  width: number
  depth: number
  /** Centre of the drive aisle in scene metres, or null when undeterminable. */
  aisle: { x: number; z: number; width: number } | null
}

function hasCoordinates(input: BayInput): boolean {
  return Number.isFinite(input.positionX) && Number.isFinite(input.positionY)
}

/**
 * Turn API bay rows into a normalised, metre-scaled scene centred on the origin.
 */
export function buildSceneLayout(inputs: readonly BayInput[]): SceneLayout {
  const ordered = [...inputs].sort((a, b) => {
    const codeA = (a.code ?? '').padStart(6, '0')
    const codeB = (b.code ?? '').padStart(6, '0')
    if (codeA === codeB) return a.id - b.id
    return codeA < codeB ? -1 : 1
  })

  // 1. Resolve an outline in raw layout units for every bay.
  interface Draft {
    input: BayInput
    outline: Point2[] | null
    source: 'polygon' | 'position' | 'generated'
  }
  const drafts: Draft[] = ordered.map((input) => {
    const polygon = parsePolygon(input.polygon)
    if (polygon && polygon.length >= 3) {
      return { input, outline: polygon, source: 'polygon' }
    }
    if (hasCoordinates(input)) {
      return {
        input,
        outline: rectangleFootprint(input.positionX as number, input.positionY as number),
        source: 'position',
      }
    }
    return { input, outline: null, source: 'generated' }
  })

  const missing = drafts.filter((d) => d.outline === null)
  if (missing.length > 0) {
    const centres = fallbackLayout(missing.length)
    missing.forEach((draft, index) => {
      draft.outline = rectangleFootprint(centres[index][0], centres[index][1])
    })
  }

  // 2. Scale so a typical bay is ~2.5 m wide.
  const widths = drafts.map((d) => {
    const b = boundsOf(d.outline as Point2[])
    return Math.abs(b.maxX - b.minX)
  })
  const typicalWidth = median(widths.filter((w) => w > 0)) || ANCHOR_BAY_UNITS
  const scale = sceneTokens.bayWidthM / typicalWidth

  // 3. Centre the whole lot on the origin and lift layout Y into world Z.
  //    Layout Y grows downward on a plan image, world +Z grows toward the
  //    viewer, so the bottom of the plan map ends up nearest the camera.
  const allPoints = drafts.flatMap((d) => d.outline as Point2[])
  const rawBounds = boundsOf(allPoints)
  const cx = (rawBounds.minX + rawBounds.maxX) / 2
  const cy = (rawBounds.minY + rawBounds.maxY) / 2

  const toScene = ([x, y]: Point2): Point2 => [(x - cx) * scale, (y - cy) * scale]

  const bays: BayGeometry[] = drafts.map((draft) => {
    const outline = (draft.outline as Point2[]).map(toScene)
    const bounds = boundsOf(outline)
    const centroid = polygonCentroid(outline)
    const w = Math.abs(bounds.maxX - bounds.minX)
    const d = Math.abs(bounds.maxY - bounds.minY)
    // Bays are stored long-axis-along-Z; a wider-than-deep footprint is rotated.
    const angle = w > d ? Math.PI / 2 : 0
    return {
      id: draft.input.id,
      code: draft.input.code?.trim() || `#${draft.input.id}`,
      outline,
      centroid,
      angle,
      synthetic: draft.source === 'generated',
      source: draft.source,
    }
  })

  const margin = sceneTokens.aisleWidthM / 2
  const width = Math.abs(rawBounds.maxX - rawBounds.minX) * scale + margin * 2
  const depth = Math.abs(rawBounds.maxY - rawBounds.minY) * scale + margin * 2

  return {
    bays,
    scale,
    bounds: boundsOf(bays.flatMap((b) => b.outline)),
    width,
    depth,
    aisle: findAisle(bays),
  }
}

/**
 * Detect the central drive aisle as the widest empty band along X.
 * Used to draw the entry chevrons.
 */
function findAisle(bays: readonly BayGeometry[]): SceneLayout['aisle'] {
  if (bays.length < 4) return null
  const bounds = boundsOf(bays.flatMap((b) => b.outline))
  const slices = 40
  const occupancy = new Array<number>(slices).fill(0)
  const span = Math.max(1e-6, bounds.maxY - bounds.minY)
  for (const bay of bays) {
    const index = clamp(Math.floor(((bay.centroid[1] - bounds.minY) / span) * slices), 0, slices - 1)
    occupancy[index] += 1
  }
  let bestStart = -1
  let bestLength = 0
  let runStart = -1
  for (let i = 0; i <= slices; i += 1) {
    const empty = i < slices && occupancy[i] === 0
    if (empty && runStart === -1) runStart = i
    if (!empty && runStart !== -1) {
      if (i - runStart > bestLength) {
        bestLength = i - runStart
        bestStart = runStart
      }
      runStart = -1
    }
  }
  if (bestLength < 2) return null
  const zRange = bounds.maxY - bounds.minY
  const centre = bounds.minY + ((bestStart + bestLength / 2) / slices) * zRange
  return { x: (bounds.minX + bounds.maxX) / 2, z: centre, width: (bestLength / slices) * zRange }
}

/* -------------------------------------------------------------------------- *
 * Terrain
 * -------------------------------------------------------------------------- */

export interface TerrainOptions {
  seed: string
  width: number
  depth: number
  amplitude?: number
  maxSlopePct?: number
}

export interface HeightField {
  width: number
  depth: number
  amplitude: number
  maxSlopePct: number
  heightAt(x: number, z: number): number
}

function latticeValue(seed: number, ix: number, iz: number): number {
  let h = seed ^ Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

/** 2D value noise with smoothstep interpolation — stable across platforms. */
export function valueNoise2D(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const fx = smoothstep(x - x0)
  const fz = smoothstep(z - z0)
  const v00 = latticeValue(seed, x0, z0)
  const v10 = latticeValue(seed, x0 + 1, z0)
  const v01 = latticeValue(seed, x0, z0 + 1)
  const v11 = latticeValue(seed, x0 + 1, z0 + 1)
  return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fz)
}

/**
 * Deterministic gentle terrain. Amplitude is capped at `amplitude` (0.35 m) and
 * a planar slope at `maxSlopePct` (2 %) is added so the slab reads as a real
 * site. Same `seed` → identical field on every reload and on every platform.
 */
export function createHeightField(options: TerrainOptions): HeightField {
  const seed = hashString(options.seed || 'parksense')
  const amplitude = options.amplitude ?? sceneTokens.terrainAmplitudeM
  const maxSlopePct = options.maxSlopePct ?? sceneTokens.maxSlopePct

  // Largest planar slope the amplitude budget allows across the shortest axis.
  const run = Math.max(1, Math.min(options.width, options.depth))
  const slope = Math.min(maxSlopePct / 100, amplitude / run)

  const tiltX = ((latticeValue(seed, 11, 3) - 0.5) * 2 * slope) / 1
  const tiltZ = ((latticeValue(seed, 5, 29) - 0.5) * 2 * slope) / 1

  const frequency = 0.09
  const heightAt = (x: number, z: number): number => {
    let value = 0
    let amp = 1
    let total = 0
    for (let octave = 0; octave < 3; octave += 1) {
      value += valueNoise2D(seed + octave * 7919, x * frequency * (1 << octave), z * frequency * (1 << octave)) * amp
      total += amp
      amp *= 0.5
    }
    const noise = (value / total - 0.5) * 2 * amplitude
    return noise + x * tiltX + z * tiltZ
  }

  return { width: options.width, depth: options.depth, amplitude, maxSlopePct, heightAt }
}

/**
 * Build the terrain from a real site survey when one exists, otherwise from a
 * deterministic seed. Survey wins because it is measured ground truth.
 */
export interface SurveyTerrain {
  dimensions?: { lengthM?: number; breadthM?: number } | null
  terrain?: { global_slope_pct?: number; slope_pct_mean?: number; slope_pct_max?: number } | null
}

export function createTerrainForScene(
  seed: string,
  width: number,
  depth: number,
  survey?: SurveyTerrain | null,
): HeightField {
  const slopePct = survey?.terrain?.global_slope_pct ?? survey?.terrain?.slope_pct_mean ?? undefined
  return createHeightField({
    seed,
    width,
    depth,
    maxSlopePct: slopePct !== undefined ? Math.min(Math.abs(slopePct), sceneTokens.maxSlopePct * 4) : undefined,
  })
}

/* -------------------------------------------------------------------------- *
 * Contours + grid (marching squares)
 * -------------------------------------------------------------------------- */

export interface ContourResult {
  /** Flat `[x0,y0,z0, x1,y1,z1, ...]` triangle-free line list, in scene metres. */
  positions: Float32Array
  segmentCount: number
}

export interface SampleGrid {
  cols: number
  rows: number
  width: number
  depth: number
  samples: Float32Array
}

/** Resample a height field onto a regular `cols × rows` lattice. */
export function sampleGrid(field: HeightField, cols = 48, rows = 48): SampleGrid {
  const samples = new Float32Array((cols + 1) * (rows + 1))
  const halfW = field.width / 2
  const halfD = field.depth / 2
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) {
      const x = -halfW + (i / cols) * field.width
      const z = -halfD + (j / rows) * field.depth
      samples[j * (cols + 1) + i] = field.heightAt(x, z)
    }
  }
  return { cols, rows, width: field.width, depth: field.depth, samples }
}

/**
 * Marching squares over the sampled grid. Emits flat line segments on the
 * `level * n` iso-surfaces; safe for both the 3D renderer (one LineSegments)
 * and the SVG fallback (flattened to 2D).
 */
export function buildContours(grid: SampleGrid, interval: number): ContourResult {
  const step = interval > 0 ? interval : sceneTokens.contourIntervalM
  const out: number[] = []
  const halfW = grid.width / 2
  const halfD = grid.depth / 2
  const stepX = grid.width / grid.cols
  const stepZ = grid.depth / grid.rows

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < grid.samples.length; i += 1) {
    if (grid.samples[i] < min) min = grid.samples[i]
    if (grid.samples[i] > max) max = grid.samples[i]
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-6) {
    return { positions: new Float32Array(0), segmentCount: 0 }
  }

  const first = Math.ceil(min / step)
  const last = Math.floor(max / step)

  for (let level = first; level <= last; level += 1) {
    const iso = level * step
    for (let j = 0; j < grid.rows; j += 1) {
      for (let i = 0; i < grid.cols; i += 1) {
        const a = grid.samples[j * (grid.cols + 1) + i]
        const b = grid.samples[j * (grid.cols + 1) + i + 1]
        const c = grid.samples[(j + 1) * (grid.cols + 1) + i + 1]
        const d = grid.samples[(j + 1) * (grid.cols + 1) + i]

        const ax = -halfW + i * stepX
        const bx = ax + stepX
        const az = -halfD + j * stepZ
        const bz = az + stepZ

        const crosses: Point2[] = []
        const edge = (p0: number, p1: number, x0: number, z0: number, x1: number, z1: number) => {
          if ((p0 < iso) === (p1 < iso)) return
          const t = (iso - p0) / (p1 - p0)
          crosses.push([lerp(x0, x1, t), lerp(z0, z1, t)])
        }
        edge(a, b, ax, az, bx, az)
        edge(b, c, bx, az, bx, bz)
        edge(c, d, bx, bz, ax, bz)
        edge(d, a, ax, bz, ax, az)

        if (crosses.length === 2) {
          out.push(crosses[0][0], 0, crosses[0][1], crosses[1][0], 0, crosses[1][1])
        } else if (crosses.length === 4) {
          // Saddle: keep the two crossings that share the cell centre's side so
          // the isolines never jump across the ambiguous diagonal.
          const centreAbove = (a + b + c + d) / 4 >= iso
          const first = crosses.slice(0, 2)
          const second = crosses.slice(2)
          const mean = (pair: Point2[]) => (pair[0][1] + pair[1][1]) / 2
          const pairs = mean(first) < mean(second) ? [first, second] : [second, first]
          const leading = centreAbove ? pairs[1] : pairs[0]
          const trailing = centreAbove ? pairs[0] : pairs[1]
          out.push(trailing[0][0], 0, trailing[0][1], trailing[1][0], 0, trailing[1][1])
          out.push(leading[0][0], 0, leading[0][1], leading[1][0], 0, leading[1][1])
        }
      }
    }
  }

  return { positions: new Float32Array(out), segmentCount: out.length / 6 }
}

/** A faint 1 m grid draped over the terrain, as one LineSegments buffer. */
export function buildGridLines(field: HeightField, interval = sceneTokens.gridIntervalM): Float32Array {
  const out: number[] = []
  const halfW = field.width / 2
  const halfD = field.depth / 2
  const lift = 0.004
  const step = interval > 0 ? interval : 1

  for (let x = -Math.floor(halfW / step) * step; x <= halfW + 1e-6; x += step) {
    const segments = 8
    for (let s = 0; s < segments; s += 1) {
      const z0 = -halfD + (s / segments) * field.depth
      const z1 = -halfD + ((s + 1) / segments) * field.depth
      out.push(x, field.heightAt(x, z0) + lift, z0, x, field.heightAt(x, z1) + lift, z1)
    }
  }
  for (let z = -Math.floor(halfD / step) * step; z <= halfD + 1e-6; z += step) {
    const segments = 8
    for (let s = 0; s < segments; s += 1) {
      const x0 = -halfW + (s / segments) * field.width
      const x1 = -halfW + ((s + 1) / segments) * field.width
      out.push(x0, field.heightAt(x0, z) + lift, z, x1, field.heightAt(x1, z) + lift, z)
    }
  }
  return new Float32Array(out)
}

/* -------------------------------------------------------------------------- *
 * Projection (isometric / top-down, used by the 2D fallback)
 * -------------------------------------------------------------------------- */

export interface Projection {
  pitchDeg: number
  yawDeg: number
  /** Uniform scale applied to the result. */
  scale: number
}

export interface ProjectedPoint {
  x: number
  y: number
  /** Larger = closer to camera; used for painter's-algorithm ordering. */
  depth: number
}

/**
 * Orthographic-feel projection shared by the SVG fallback on both platforms.
 * `pitchDeg` 90 is a straight top-down plan view.
 */
export function projectPoint(point: Point3, projection: Projection): ProjectedPoint {
  const pitch = (projection.pitchDeg * Math.PI) / 180
  const yaw = (projection.yawDeg * Math.PI) / 180
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)

  const rx = point[0] * cy + point[2] * sy
  const rz = -point[0] * sy + point[2] * cy
  const ry = point[1] * cp - rz * sp
  const dz = point[1] * sp + rz * cp

  return { x: rx * projection.scale, y: -ry * projection.scale, depth: dz }
}

/** Fit a scene into a viewport: returns the projection plus a centring offset. */
export function fitProjection(
  bounds: Bounds2,
  height: number,
  width: number,
  padding = 0.08,
  pitchDeg = sceneTokens.defaultPitchDeg,
  yawDeg = -30,
): Projection & { offsetX: number; offsetY: number } {
  const probe: Projection = { pitchDeg, yawDeg, scale: 1 }
  const corners: Point3[] = [
    [bounds.minX, 0, bounds.minY],
    [bounds.maxX, 0, bounds.minY],
    [bounds.maxX, 0, bounds.maxY],
    [bounds.minX, 0, bounds.maxY],
  ]
  const projected = corners.map((corner) => projectPoint(corner, probe))
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of projected) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  const usableW = Math.max(1, width * (1 - padding * 2))
  const usableH = Math.max(1, height * (1 - padding * 2))
  const scale = Math.min(usableW / Math.max(1e-6, maxX - minX), usableH / Math.max(1e-6, maxY - minY))
  return {
    ...probe,
    scale,
    offsetX: width / 2 - ((minX + maxX) / 2) * scale,
    offsetY: height / 2 - ((minY + maxY) / 2) * scale,
  }
}

/* -------------------------------------------------------------------------- *
 * Car silhouette
 * -------------------------------------------------------------------------- */

/**
 * Top-down low-poly car footprint in normalised units: 1.0 long (Z), ~0.44 wide
 * (X), nose towards -Z. Twelve vertices — enough to read as a car without
 * becoming a cartoon, and cheap enough for InstancedMesh / SVG alike.
 */
export const CAR_SILHOUETTE: readonly Point2[] = [
  [-0.13, -0.5],
  [0.13, -0.5],
  [0.2, -0.34],
  [0.22, 0.2],
  [0.14, 0.42],
  [0.14, 0.5],
  [-0.14, 0.5],
  [-0.14, 0.42],
  [-0.22, 0.2],
  [-0.2, -0.34],
]

/** Closed outline segments for the wireframe body. */
export function carWireSegments(): Float32Array {
  const out: number[] = []
  for (let i = 0; i < CAR_SILHOUETTE.length; i += 1) {
    const a = CAR_SILHOUETTE[i]
    const b = CAR_SILHOUETTE[(i + 1) % CAR_SILHOUETTE.length]
    out.push(a[0], 0, a[1], b[0], 0, b[1])
  }
  // Cabin seam so the wireframe reads as a vehicle, not a slab.
  out.push(-0.2, 0, -0.1, 0.2, 0, -0.1)
  out.push(-0.22, 0, 0.06, 0.22, 0, 0.06)
  return new Float32Array(out)
}

/* -------------------------------------------------------------------------- *
 * Point-in-polygon, used for hover hit-testing in the 2D fallback
 * -------------------------------------------------------------------------- */

export function pointInPolygon(point: Point2, polygon: readonly Point2[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Nearest bay to a scene-space point, or null beyond `maxDistance` metres. */
export function nearestBay(
  bays: readonly BayGeometry[],
  point: Point2,
  maxDistance = 4,
): BayGeometry | null {
  let best: BayGeometry | null = null
  let bestDistance = Infinity
  for (const bay of bays) {
    const distance = Math.hypot(bay.centroid[0] - point[0], bay.centroid[1] - point[1])
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance
      best = bay
    }
  }
  return best
}
