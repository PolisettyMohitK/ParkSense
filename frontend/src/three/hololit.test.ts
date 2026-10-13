import { describe, expect, it } from 'vitest'
import {
  boundsOf,
  buildContours,
  buildGridLines,
  buildSceneLayout,
  carWireSegments,
  clamp,
  createHeightField,
  createTerrainForScene,
  fallbackLayout,
  fitProjection,
  hashString,
  lerp,
  nearestBay,
  parsePolygon,
  pointInPolygon,
  polygonCentroid,
  projectPoint,
  rectangleFootprint,
  sampleGrid,
  valueNoise2D,
} from './hololit'

describe('parsePolygon', () => {
  it('parses the seeded "[x,y x,y ...]" format', () => {
    expect(parsePolygon('[0,0 40,0 40,80 0,80]')).toEqual([
      [0, 0],
      [40, 0],
      [40, 80],
      [0, 80],
    ])
  })

  it('parses the survey/camera "[[x,y],[x,y],...]" JSON format identically', () => {
    expect(parsePolygon('[[0,0],[40,0],[40,80],[0,80]]')).toEqual([
      [0, 0],
      [40, 0],
      [40, 80],
      [0, 80],
    ])
  })

  it('parses JSON spread over multiple lines', () => {
    expect(parsePolygon('[\n  [10, 20],\n  [30, 20],\n  [30, 60]\n]')).toEqual([
      [10, 20],
      [30, 20],
      [30, 60],
    ])
  })

  it('handles negative and decimal coordinates', () => {
    expect(parsePolygon('[-12.5,0.5 27.25,-8 3,44.75]')).toEqual([
      [-12.5, 0.5],
      [27.25, -8],
      [3, 44.75],
    ])
  })

  it('drops a duplicated closing vertex', () => {
    const parsed = parsePolygon('[0,0 40,0 40,80 0,80 0,0]')
    expect(parsed).toHaveLength(4)
  })

  it('rejects fewer than three points', () => {
    expect(parsePolygon('[0,0 40,0]')).toBeNull()
    expect(parsePolygon('[0,0]')).toBeNull()
  })

  it('rejects an odd number of coordinates', () => {
    expect(parsePolygon('[0,0 40,0 40]')).toBeNull()
  })

  it('rejects empty, null and non-numeric input', () => {
    expect(parsePolygon(null)).toBeNull()
    expect(parsePolygon(undefined)).toBeNull()
    expect(parsePolygon('')).toBeNull()
    expect(parsePolygon('   ')).toBeNull()
    expect(parsePolygon('unknown')).toBeNull()
    expect(parsePolygon('[pending, null]')).toBeNull()
  })

  it('tolerates a CSS polygon() payload as a bonus', () => {
    expect(parsePolygon('polygon(0 0, 10 0, 10 10)')).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ])
  })
})

describe('geometry helpers', () => {
  it('clamps and lerps', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-5, 0, 3)).toBe(0)
    expect(lerp(0, 10, 0.25)).toBe(2.5)
  })

  it('computes a square centroid', () => {
    expect(polygonCentroid(rectangleFootprint(100, 100))).toEqual([100, 100])
  })

  it('falls back to the vertex mean for a degenerate polygon', () => {
    expect(polygonCentroid([[0, 0], [2, 0], [4, 0]])).toEqual([2, 0])
  })

  it('computes bounds and survives an empty set', () => {
    expect(boundsOf([[1, 2], [5, -3]])).toEqual({ minX: 1, minY: -3, maxX: 5, maxY: 2 })
    expect(boundsOf([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })

  it('anchors the metre scale on the seeded 92-unit pitch', () => {
    // Two bays 92 layout units apart, no polygons.
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 0, positionY: 0 },
      { id: 2, code: 'A02', positionX: 92, positionY: 0 },
    ])
    // Typical width 92u maps to the 2.5 m bay width, so the two centres are 2.5 m apart.
    expect(layout.bays[1].centroid[0] - layout.bays[0].centroid[0]).toBeCloseTo(2.5, 3)
  })

  it('centres the scene on the origin', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 1000, positionY: 1000 },
      { id: 2, code: 'A02', positionX: 1092, positionY: 1000 },
    ])
    const midX = (layout.bays[0].centroid[0] + layout.bays[1].centroid[0]) / 2
    expect(midX).toBeCloseTo(0, 6)
  })

  it('maps layout Y onto scene Z so the plan bottom is nearest the camera', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 0, positionY: 0 },
      { id: 2, code: 'A02', positionX: 0, positionY: 200 },
    ])
    expect(layout.bays[1].centroid[1]).toBeGreaterThan(layout.bays[0].centroid[1])
  })

  it('prefers a polygon over a position when both exist', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 9999, positionY: 9999, polygon: '[[46,0],[138,0],[138,112],[46,112]]' },
      { id: 2, code: 'A02', positionX: 92, positionY: 0 },
    ])
    expect(layout.bays[0].source).toBe('polygon')
    expect(layout.bays[1].source).toBe('position')
    expect(layout.bays[0].centroid[0]).toBeCloseTo(layout.bays[1].centroid[0], 6)
  })

  it('lays out unpositioned bays deterministically by code', () => {
    const rows = [
      { id: 3, code: 'C01' },
      { id: 1, code: 'A01' },
      { id: 2, code: 'B01' },
    ]
    const a = buildSceneLayout(rows)
    const b = buildSceneLayout([...rows].reverse())
    expect(a.bays.map((bay) => bay.code)).toEqual(['A01', 'B01', 'C01'])
    expect(a.bays.map((bay) => bay.id)).toEqual(b.bays.map((bay) => bay.id))
    expect(a.bays.map((bay) => bay.centroid)).toEqual(b.bays.map((bay) => bay.centroid))
    expect(a.bays.every((bay) => bay.synthetic)).toBe(true)
  })

  it('falls back to a double row with a central aisle', () => {
    const centres = fallbackLayout(6)
    expect(centres).toHaveLength(6)
    const zs = centres.map((c) => c[1])
    // Exactly two distinct rows.
    expect(new Set(zs.map((z) => Math.round(z))).size).toBe(2)
  })

  it('survives an empty lot', () => {
    const layout = buildSceneLayout([])
    expect(layout.bays).toEqual([])
    expect(layout.width).toBeGreaterThan(0)
    expect(layout.depth).toBeGreaterThan(0)
  })

  it('rotates a landscape-oriented bay 90 degrees', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', polygon: '[[0,0],[160,0],[160,60],[0,60]]' },
      { id: 2, code: 'A02', polygon: '[[0,100],[160,100],[160,160],[0,160]]' },
    ])
    expect(layout.bays[0].angle).toBeCloseTo(Math.PI / 2, 6)
  })

  it('detects an aisle between two rows', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 0, positionY: 0 },
      { id: 2, code: 'A02', positionX: 92, positionY: 0 },
      { id: 3, code: 'B01', positionX: 0, positionY: 300 },
      { id: 4, code: 'B02', positionX: 92, positionY: 300 },
    ])
    expect(layout.aisle).not.toBeNull()
    expect(layout.aisle!.width).toBeGreaterThan(0)
  })
})

describe('terrain', () => {
  it('hashes deterministically', () => {
    expect(hashString('site-1')).toBe(hashString('site-1'))
    expect(hashString('site-1')).not.toBe(hashString('site-2'))
  })

  it('produces value noise inside [0, 1]', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = valueNoise2D(1234, i * 0.37, i * -0.21)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('is stable for the same seed and differs between seeds', () => {
    const a = createHeightField({ seed: 'zone-9', width: 40, depth: 30 })
    const b = createHeightField({ seed: 'zone-9', width: 40, depth: 30 })
    const c = createHeightField({ seed: 'zone-10', width: 40, depth: 30 })
    expect(a.heightAt(3, 4)).toBe(b.heightAt(3, 4))
    expect(a.heightAt(3, 4)).not.toBe(c.heightAt(3, 4))
  })

  it('respects the amplitude and slope budget', () => {
    const field = createHeightField({ seed: 'amp', width: 60, depth: 40, amplitude: 0.35, maxSlopePct: 2 })
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i <= 60; i += 1) {
      for (let j = 0; j <= 40; j += 1) {
        const h = field.heightAt(-30 + i, -20 + j)
        min = Math.min(min, h)
        max = Math.max(max, h)
      }
    }
    expect(max - min).toBeLessThanOrEqual(0.35 + 0.35 + 1.2)
    expect(Math.abs(max)).toBeLessThan(2)
    expect(Math.abs(min)).toBeLessThan(2)
  })

  it('lets a survey override the slope', () => {
    const field = createTerrainForScene('s', 40, 30, { terrain: { global_slope_pct: 6 } })
    expect(field.maxSlopePct).toBe(6)
    expect(createTerrainForScene('s', 40, 30, null).maxSlopePct).toBe(2)
  })
})

describe('contours and grid', () => {
  it('emits marching-squares segments for a sloped field', () => {
    const field = createHeightField({ seed: 'contour', width: 30, depth: 30, amplitude: 0.35 })
    const grid = sampleGrid(field, 32, 32)
    const contours = buildContours(grid, 0.25)
    expect(contours.segmentCount).toBeGreaterThan(0)
    expect(contours.positions.length).toBe(contours.segmentCount * 6)
    for (const v of contours.positions) expect(Number.isFinite(v)).toBe(true)
  })

  it('emits nothing for a perfectly flat field', () => {
    const flat = { width: 10, depth: 10, amplitude: 0, maxSlopePct: 0, heightAt: () => 0 }
    const contours = buildContours(sampleGrid(flat, 8, 8), 0.25)
    expect(contours.segmentCount).toBe(0)
  })

  it('drapes a grid at 1 m intervals', () => {
    const field = createHeightField({ seed: 'grid', width: 10, depth: 10 })
    const lines = buildGridLines(field, 1)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.length % 6).toBe(0)
  })
})

describe('projection', () => {
  it('is a straight top-down plan view at 90 degrees', () => {
    const a = projectPoint([1, 0, 2], { pitchDeg: 90, yawDeg: 0, scale: 1 })
    const b = projectPoint([3, 0, 2], { pitchDeg: 90, yawDeg: 0, scale: 1 })
    expect(a.y).toBeCloseTo(2, 6)
    expect(b.y).toBeCloseTo(2, 6)
    expect(b.x - a.x).toBeCloseTo(2, 6)
    expect(a.depth).toBeCloseTo(0, 6)
  })

  it('is an elevation at 0 degrees', () => {
    const a = projectPoint([0, 0, 0], { pitchDeg: 0, yawDeg: 0, scale: 1 })
    const b = projectPoint([0, 3, 0], { pitchDeg: 0, yawDeg: 0, scale: 1 })
    expect(a.x).toBeCloseTo(b.x, 6)
    expect(b.y).toBeLessThan(a.y)
  })

  it('fits a scene into a viewport with a positive scale', () => {
    const fit = fitProjection({ minX: -20, maxX: 20, minY: -10, maxY: 10 }, 400, 800)
    expect(fit.scale).toBeGreaterThan(0)
    expect(Number.isFinite(fit.offsetX)).toBe(true)
    expect(Number.isFinite(fit.offsetY)).toBe(true)
  })
})

describe('car silhouette', () => {
  it('produces a closed wireframe', () => {
    const segments = carWireSegments()
    expect(segments.length % 6).toBe(0)
    expect(segments.length / 6).toBeGreaterThanOrEqual(10)
  })
})

describe('hit testing', () => {
  it('detects points inside and outside a polygon', () => {
    const square: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    expect(pointInPolygon([5, 5], square)).toBe(true)
    expect(pointInPolygon([15, 5], square)).toBe(false)
    expect(pointInPolygon([-1, -1], square)).toBe(false)
  })

  it('finds the nearest bay within range only', () => {
    const layout = buildSceneLayout([
      { id: 1, code: 'A01', positionX: 0, positionY: 0 },
      { id: 2, code: 'A02', positionX: 92, positionY: 0 },
    ])
    const target = layout.bays[1]
    expect(nearestBay(layout.bays, target.centroid)?.id).toBe(2)
    expect(nearestBay(layout.bays, [1000, 1000])).toBeNull()
  })
})
