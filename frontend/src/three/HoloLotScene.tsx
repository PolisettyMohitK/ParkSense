import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CAR_SILHOUETTE,
  buildContours,
  buildGridLines,
  buildSceneLayout,
  createTerrainForScene,
  sampleGrid,
  type BayGeometry,
  type HeightField,
  type Point2,
  type SurveyTerrain,
} from './hololit'
import { statusKeyFor } from '../theme'
import type { HoloLotBay, HoloLotPalette } from './HoloLotTypes'

/* -------------------------------------------------------------------------- *
 * Shaders
 * -------------------------------------------------------------------------- */

const TERRAIN_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

/**
 * Dark translucent slab with topographic isolines, a 1 m projected grid and a
 * fresnel rim. Lines are anti-aliased with fwidth so they stay 1 px at any
 * distance instead of aliasing into noise.
 */
const TERRAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uSurface;
  uniform vec3 uHolo;
  uniform vec3 uHairline;
  uniform float uInterval;
  uniform float uGridInterval;
  uniform float uHoloStrength;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float lineMask(float value, float interval, float width) {
    float f = fract(value / interval);
    float d = min(f, 1.0 - f) * interval;
    float w = fwidth(value) * width;
    return 1.0 - smoothstep(0.0, max(w, 1e-5), d);
  }

  void main() {
    vec3 base = uSurface;

    // Gentle depth gradient so the slab has form even with no lights.
    base *= 0.82 + 0.35 * smoothstep(-2.0, 3.0, vWorld.y);

    // 1 m projected grid.
    float grid = max(
      lineMask(vWorld.x, uGridInterval, 1.2),
      lineMask(vWorld.z, uGridInterval, 1.2)
    );
    base = mix(base, uHairline, grid * 0.55);

    // Topographic isolines.
    float contour = lineMask(vWorld.y, uInterval, 1.4);
    vec3 color = mix(base, uHolo, contour * uHoloStrength);

    // Fresnel rim on the slab edge.
    float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.4);
    color += uHolo * fres * 0.35;

    gl_FragColor = vec4(color, 0.92);
    #include <colorspace_fragment>
  }
`

const CHEVRON_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CHEVRON_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float band = fract(vUv.x * 4.0 - uTime * 0.25);
    float shape = step(0.55, vUv.y) * step(vUv.y, 0.9);
    float pulse = smoothstep(0.0, 0.35, band) * (1.0 - smoothstep(0.55, 1.0, band));
    float a = shape * pulse * 0.5;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`

const BEAM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float fade = pow(1.0 - vUv.y, 1.6);
    float edge = smoothstep(0.0, 0.25, vUv.x) * (1.0 - smoothstep(0.75, 1.0, vUv.x));
    gl_FragColor = vec4(uColor, fade * edge * uOpacity);
  }
`

/* -------------------------------------------------------------------------- *
 * Helpers
 * -------------------------------------------------------------------------- */

function statusColor(bay: HoloLotBay, palette: HoloLotPalette): THREE.Color {
  if (bay.proposed) return new THREE.Color(palette.status.proposed)
  return new THREE.Color(palette.status[statusKeyFor(bay.status)])
}

/** Outline as a closed ring, drawn twice (outer + inner) so selection reads as thicker. */
function bayOutlineSegments(bay: BayGeometry, inset = 1): number[] {
  const cx = bay.centroid[0]
  const cz = bay.centroid[1]
  const points = bay.outline.map(([x, z]) => {
    const dx = x - cx
    const dz = z - cz
    const len = Math.hypot(dx, dz) || 1
    return [x - (dx / len) * inset, z - (dz / len) * inset] as Point2
  })
  const out: number[] = []
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    out.push(a[0], a[1], b[0], b[1])
  }
  return out
}

/* -------------------------------------------------------------------------- *
 * Terrain
 * -------------------------------------------------------------------------- */

function Terrain({ terrain, palette }: { terrain: HeightField; palette: HoloLotPalette }) {
  const geometry = useMemo(() => {
    const segments = 72
    const geo = new THREE.PlaneGeometry(terrain.width, terrain.depth, segments, segments)
    geo.rotateX(-Math.PI / 2)
    const position = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i)
      const z = position.getZ(i)
      position.setY(i, terrain.heightAt(x, z))
    }
    position.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [terrain])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: TERRAIN_VERTEX,
        fragmentShader: TERRAIN_FRAGMENT,
        transparent: true,
        uniforms: {
          uSurface: { value: new THREE.Color(palette.surfaceRaised) },
          uHolo: { value: new THREE.Color(palette.holo) },
          uHairline: { value: new THREE.Color(palette.hairlineStrong) },
          uInterval: { value: 0.25 },
          uGridInterval: { value: 1 },
          uHoloStrength: { value: palette.light ? 0.55 : 0.42 },
        },
      }),
    [palette],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} position={[0, 0, 0]} renderOrder={-2} frustumCulled={false} />
}

/** Topographic isolines as one LineSegments. */
function Contours({ terrain, palette }: { terrain: HeightField; palette: HoloLotPalette }) {
  const geometry = useMemo(() => {
    const grid = sampleGrid(terrain, 64, 64)
    const { positions } = buildContours(grid, 0.25)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [terrain])

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.holo),
        transparent: true,
        opacity: palette.light ? 0.4 : 0.28,
      }),
    [palette],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
}

/** The 1 m projected grid, drawn as short segments that follow the terrain. */
function Grid({ terrain, palette }: { terrain: HeightField; palette: HoloLotPalette }) {
  const geometry = useMemo(() => {
    const raw = buildGridLines(terrain, 1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(raw, 3))
    return geo
  }, [terrain])

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.hairlineStrong),
        transparent: true,
        opacity: palette.light ? 0.5 : 0.34,
      }),
    [palette],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
}

/** Infinite dark floor with a soft pool of light beneath the slab. */
function Floor({ palette, radius }: { palette: HoloLotPalette; radius: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Color(palette.holo) },
          uOpacity: { value: palette.light ? 0.14 : 0.2 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float a = (1.0 - smoothstep(0.0, 1.0, d)) * uOpacity;
            if (a < 0.002) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    [palette],
  )

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} material={material} renderOrder={-3}>
      <planeGeometry args={[radius * 2.4, radius * 2.4]} />
    </mesh>
  )
}

/* -------------------------------------------------------------------------- *
 * Bays
 * -------------------------------------------------------------------------- */

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0)

function Bays({
  bays,
  geometry,
  terrain,
  palette,
  selectedBayId,
  hoveredBayId,
  activeBayId,
  selectableIds,
  showLabels,
  changed,
  onHover,
  onSelect,
  onDoubleClick,
  reducedMotion,
}: {
  bays: HoloLotBay[]
  geometry: BayGeometry[]
  terrain: HeightField
  palette: HoloLotPalette
  selectedBayId: number | null
  hoveredBayId: number | null
  activeBayId: number | null
  selectableIds: Set<number>
  showLabels: boolean
  /** bayId -> timestamp of the last live change, for the 420 ms drop-in. */
  changed: Map<number, number>
  onHover: (id: number | null) => void
  onSelect: (id: number) => void
  onDoubleClick: (id: number) => void
  reducedMotion: boolean
}) {
  const { invalidate } = useThree()

  const fillRef = useRef<THREE.InstancedMesh>(null)
  const carRef = useRef<THREE.InstancedMesh>(null)
  const outlineRef = useRef<THREE.LineSegments>(null)

  const indexById = useMemo(() => new Map(geometry.map((bay, index) => [bay.id, index])), [geometry])
  const bayById = useMemo(() => new Map(bays.map((bay) => [bay.id, bay])), [bays])

  // Static per-instance transforms (position, yaw, footprint size).
  const slots = useMemo(
    () =>
      geometry.map((bay) => {
        const xs = bay.outline.map((p) => p[0])
        const zs = bay.outline.map((p) => p[1])
        return {
          x: bay.centroid[0],
          z: bay.centroid[1],
          width: Math.max(0.6, Math.max(...xs) - Math.min(...xs)),
          depth: Math.max(0.6, Math.max(...zs) - Math.min(...zs)),
          angle: bay.angle,
        }
      }),
    [geometry],
  )

  /* --- fills: one InstancedMesh, per-instance colour --- */
  const fillGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const fillMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(
    () => () => {
      fillGeometry.dispose()
      fillMaterial.dispose()
    },
    [fillGeometry, fillMaterial],
  )

  /* --- outlines: merged ring segments with vertex colours --- */
  const outlineData = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    const ranges: Array<{ start: number; end: number; id: number }> = []
    const dummy = new THREE.Object3D()
    for (const bay of geometry) {
      const start = positions.length / 6
      const meta = bayById.get(bay.id)
      if (!meta) continue
      const color = statusColor(meta, palette)
      for (const ring of [bayOutlineSegments(bay, 0.16), bayOutlineSegments(bay, 0)]) {
        for (let i = 0; i < ring.length; i += 4) {
          const ax = ring[i]
          const az = ring[i + 1]
          const bx = ring[i + 2]
          const bz = ring[i + 3]
          dummy.position.set(ax, terrain.heightAt(ax, az) + 0.022, az)
          dummy.updateMatrix()
          const av = new THREE.Vector3().setFromMatrixPosition(dummy.matrix)
          dummy.position.set(bx, terrain.heightAt(bx, bz) + 0.022, bz)
          dummy.updateMatrix()
          const bv = new THREE.Vector3().setFromMatrixPosition(dummy.matrix)
          positions.push(av.x, av.y, av.z, bv.x, bv.y, bv.z)
          colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
        }
      }
      ranges.push({ start, end: positions.length / 6, id: bay.id })
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return { geo, ranges }
  }, [geometry, bayById, terrain, palette])

  const outlineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: palette.light ? 0.95 : 1,
        toneMapped: false,
      }),
    [palette],
  )

  useEffect(
    () => () => {
      outlineData.geo.dispose()
      outlineMaterial.dispose()
    },
    [outlineData, outlineMaterial],
  )

  /* --- cars: one InstancedMesh, 4 graphite/silver variants --- */
  const carGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    CAR_SILHOUETTE.forEach(([x, z], index) => {
      const px = x * 1.85
      const pz = z * 4.3
      if (index === 0) shape.moveTo(px, pz)
      else shape.lineTo(px, pz)
    })
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.11,
      bevelSegments: 1,
      curveSegments: 1,
    })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, 0.36, 0)
    return geo
  }, [])

  const carMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.42,
        metalness: 0.55,
        flatShading: true,
        transparent: true,
        opacity: 0.95,
      }),
    [],
  )
  useEffect(
    () => () => {
      carGeometry.dispose()
      carMaterial.dispose()
    },
    [carGeometry, carMaterial],
  )

  const carColors = useMemo(
    () => ['#8E939B', '#B6BBC2', '#5C6169', '#D3D7DC'].map((c) => new THREE.Color(c)),
    [],
  )

  /* --- animated state --- */
  const lifts = useRef(new Float32Array(geometry.length))
  const appear = useRef(new Float32Array(geometry.length).fill(1))

  // Seed colour attributes + base instance matrices once the meshes exist.
  useEffect(() => {
    const mesh = fillRef.current
    const cars = carRef.current
    const dummy = new THREE.Object3D()
    slots.forEach((slot, index) => {
      const meta = bayById.get(geometry[index].id)
      const color = statusColor(meta ?? { id: 0, code: '', status: 'OUT_OF_SERVICE' }, palette)
      mesh?.setColorAt(index, color)
      dummy.position.set(slot.x, terrain.heightAt(slot.x, slot.z) + 0.012, slot.z)
      dummy.rotation.set(-Math.PI / 2, 0, slot.angle)
      dummy.scale.set(slot.width, slot.depth, 1)
      dummy.updateMatrix()
      mesh?.setMatrixAt(index, dummy.matrix)
    })
    if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true
    if (mesh) mesh.instanceMatrix.needsUpdate = true
    void cars
  }, [slots, bayById, geometry, terrain, palette])

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.count = geometry.length
      fillRef.current.instanceMatrix.needsUpdate = true
    }
    if (carRef.current) carRef.current.count = geometry.length
  }, [geometry.length])

  // React to live occupancy: only the changed bay animates.
  useEffect(() => {
    changed.forEach((at, id) => {
      const index = indexById.get(id)
      if (index === undefined) return
      const meta = bayById.get(id)
      if (meta?.status === 'OCCUPIED') appear.current[index] = 0
      void at
    })
    invalidate()
  }, [changed, bayById, indexById, invalidate])

  // Repaint instance colours when any bay status changes.
  useEffect(() => {
    const mesh = fillRef.current
    if (!mesh) return
    bays.forEach((bay) => {
      const index = indexById.get(bay.id)
      if (index === undefined) return
      mesh.setColorAt(index, statusColor(bay, palette))
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [bays, indexById, palette])

  // Repaint outline vertex colours for the same reason.
  useEffect(() => {
    const attr = outlineData.geo.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!attr) return
    outlineData.ranges.forEach((range) => {
      const meta = bayById.get(range.id)
      if (!meta) return
      const color = statusColor(meta, palette)
      for (let i = range.start * 2; i < range.end * 2; i += 1) attr.setXYZ(i, color.r, color.g, color.b)
    })
    attr.needsUpdate = true
  }, [bays, outlineData, bayById, palette])

  /* --- frame loop --- */
  const clock = useRef(0)

  useFrame((_, delta) => {
    const mesh = fillRef.current
    const cars = carRef.current
    if (!mesh) return
    clock.current += delta

    const dummy = new THREE.Object3D()
    let dirty = false

    slots.forEach((slot, index) => {
      const bay = geometry[index]
      const selected = bay.id === selectedBayId
      const targetLift = selected ? 0.06 : 0
      const lift = lifts.current[index]
      const nextLift = lift + (targetLift - lift) * Math.min(1, delta * 8)
      if (Math.abs(nextLift - lift) > 1e-5) dirty = true
      lifts.current[index] = nextLift

      const meta = bayById.get(bay.id)
      const occupied = meta?.status === 'OCCUPIED'

      // Cars fade and drop in over 420 ms on becoming occupied, and lift away
      // faster when the bay frees up.
      if (occupied && appear.current[index] < 1) {
        appear.current[index] = Math.min(1, appear.current[index] + delta * 2.4)
        dirty = true
      } else if (!occupied && appear.current[index] > 0) {
        appear.current[index] = Math.max(0, appear.current[index] - delta * 4)
        dirty = true
      }
      const scale = appear.current[index]

      const baseY = terrain.heightAt(slot.x, slot.z)
      dummy.position.set(slot.x, baseY + 0.012 + nextLift, slot.z)
      dummy.rotation.set(-Math.PI / 2, 0, slot.angle)
      dummy.scale.set(slot.width, slot.depth, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)

      if (cars) {
        if (scale > 0.01) {
          dummy.position.set(slot.x, baseY + nextLift, slot.z)
          dummy.rotation.set(0, slot.angle, 0)
          dummy.scale.set(scale, scale, scale)
          dummy.updateMatrix()
          cars.setMatrixAt(index, dummy.matrix)
          if (cars.instanceColor) {
            cars.setColorAt(index, carColors[index % carColors.length])
          }
        } else {
          cars.setMatrixAt(index, HIDDEN)
        }
      }
    })

    if (dirty || clock.current % 0.5 < delta) {
      mesh.instanceMatrix.needsUpdate = true
      if (cars?.instanceColor) cars.instanceColor.needsUpdate = true
      if (cars) cars.instanceMatrix.needsUpdate = true
    }
  })

  // Highlight the hovered / selected / active bay by brightening its outline.
  useEffect(() => {
    const attr = outlineData.geo.getAttribute('color') as THREE.BufferAttribute | undefined
    if (!attr) return
    outlineData.ranges.forEach((range) => {
      const meta = bayById.get(range.id)
      if (!meta) return
      const base = statusColor(meta, palette)
      const emphasis =
        range.id === selectedBayId ? 2.1 : range.id === hoveredBayId ? 1.5 : range.id === activeBayId ? 1.7 : 1
      for (let i = range.start * 2; i < range.end * 2; i += 1) {
        attr.setXYZ(i, base.r * emphasis, base.g * emphasis, base.b * emphasis)
      }
    })
    attr.needsUpdate = true
  }, [selectedBayId, hoveredBayId, activeBayId, outlineData, bayById, palette])

  useEffect(() => {
    outlineMaterial.opacity = palette.light ? 0.95 : 1
    fillMaterial.opacity = palette.light ? 0.2 : 0.16
  }, [palette, outlineMaterial, fillMaterial])

  const handleMove = (event: { instanceId?: number }) => {
    if (event.instanceId === undefined) return
    const bay = geometry[event.instanceId]
    if (!bay) return
    onHover(bay.id)
  }

  return (
    <group>
      <instancedMesh
        ref={fillRef}
        args={[fillGeometry, fillMaterial, Math.max(1, geometry.length)]}
        onPointerMove={handleMove}
        onPointerOut={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation()
          if (event.instanceId === undefined) return
          const bay = geometry[event.instanceId]
          if (!bay || !selectableIds.has(bay.id)) return
          onSelect(bay.id)
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          if (event.instanceId === undefined) return
          const bay = geometry[event.instanceId]
          if (bay) onDoubleClick(bay.id)
        }}
        frustumCulled={false}
        renderOrder={1}
      />

      <lineSegments
        ref={outlineRef as never}
        args={[outlineData.geo, outlineMaterial]}
        frustumCulled={false}
        renderOrder={2}
      />

      <instancedMesh
        ref={carRef}
        args={[carGeometry, carMaterial, Math.max(1, geometry.length)]}
        frustumCulled={false}
        renderOrder={3}
      />

      {showLabels ? <BayLabels geometry={geometry} terrain={terrain} bays={bays} palette={palette} /> : null}

      <SelectionBeam
        geometry={geometry}
        terrain={terrain}
        selectedBayId={selectedBayId}
        palette={palette}
        reducedMotion={reducedMotion}
      />

      <Beacon
        geometry={geometry}
        terrain={terrain}
        activeBayId={activeBayId}
        palette={palette}
        reducedMotion={reducedMotion}
      />
    </group>
  )
}

/** Bay IDs laid flat on the ground in the instrument typeface. */
function BayLabels({
  geometry,
  terrain,
  bays,
  palette,
}: {
  geometry: BayGeometry[]
  terrain: HeightField
  bays: HoloLotBay[]
  palette: HoloLotPalette
}) {
  const groupRef = useRef<THREE.Group>(null)
  const labelById = useMemo(() => new Map(bays.map((bay) => [bay.id, bay.code])), [bays])
  const tint = useMemo(() => new THREE.Color(palette.textPrimary), [palette])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    for (const child of [...group.children]) {
      group.remove(child)
      const sprite = child as THREE.Sprite
      const material = sprite.material as THREE.SpriteMaterial
      material.map?.dispose()
      material.dispose()
    }
    for (const bay of geometry) {
      const text = labelById.get(bay.id)
      if (!text) continue
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.font = '600 44px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = `#${tint.getHexString()}`
      ctx.fillText(text.slice(0, 5), canvas.width / 2, canvas.height / 2)

      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          opacity: 0.9,
          toneMapped: false,
        }),
      )
      sprite.scale.set(1.5, 0.75, 1)
      sprite.position.set(
        bay.centroid[0],
        terrain.heightAt(bay.centroid[0], bay.centroid[1]) + 0.1,
        bay.centroid[1],
      )
      group.add(sprite)
    }
    return () => {
      for (const child of [...group.children]) {
        const sprite = child as THREE.Sprite
        const material = sprite.material as THREE.SpriteMaterial
        material.map?.dispose()
        material.dispose()
      }
    }
  }, [geometry, labelById, terrain, tint])

  return <group ref={groupRef} />
}

/** A vertical column of light rising from the selected bay. */
function SelectionBeam({
  geometry,
  terrain,
  selectedBayId,
  palette,
  reducedMotion,
}: {
  geometry: BayGeometry[]
  terrain: HeightField
  selectedBayId: number | null
  palette: HoloLotPalette
  reducedMotion: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uColor: { value: new THREE.Color(palette.holo) },
          uOpacity: { value: 0.85 },
        },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: BEAM_FRAGMENT,
      }),
    [palette],
  )
  useEffect(() => () => material.dispose(), [material])

  const bay = geometry.find((b) => b.id === selectedBayId)
  const y = bay ? terrain.heightAt(bay.centroid[0], bay.centroid[1]) : 0

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const pulse = reducedMotion ? 0.75 : 0.6 + Math.sin(clock.elapsedTime * 2.2) * 0.2
    material.uniforms.uOpacity.value = pulse
  })

  if (!bay) return null
  return (
    <mesh
      ref={meshRef}
      material={material}
      position={[bay.centroid[0], y + 1.6, bay.centroid[1]]}
      renderOrder={4}
    >
      <cylinderGeometry args={[0.5, 0.85, 3.2, 12, 1, true]} />
    </mesh>
  )
}

/** Amber beacon above the driver's own car. */
function Beacon({
  geometry,
  terrain,
  activeBayId,
  palette,
  reducedMotion,
}: {
  geometry: BayGeometry[]
  terrain: HeightField
  activeBayId: number | null
  palette: HoloLotPalette
  reducedMotion: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(palette.arc),
        transparent: true,
        toneMapped: false,
      }),
    [palette],
  )
  useEffect(() => () => material.dispose(), [material])

  const bay = geometry.find((b) => b.id === activeBayId)

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const phase = reducedMotion ? 1 : (Math.sin(clock.elapsedTime * 2.6) + 1) / 2
    mesh.scale.setScalar(0.85 + phase * 0.3)
    material.opacity = 0.45 + phase * 0.45
  })

  if (!bay) return null
  const y = terrain.heightAt(bay.centroid[0], bay.centroid[1])
  return (
    <mesh ref={meshRef} material={material} position={[bay.centroid[0], y + 1.35, bay.centroid[1]]} renderOrder={5}>
      <octahedronGeometry args={[0.22, 0]} />
    </mesh>
  )
}

/** Drive-aisle chevrons flowing toward the entry. Very low opacity. */
function AisleChevrons({
  aisle,
  terrain,
  width,
  palette,
  reducedMotion,
}: {
  aisle: { x: number; z: number; width: number } | null
  terrain: HeightField
  width: number
  palette: HoloLotPalette
  reducedMotion: boolean
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(palette.holo) },
        },
        vertexShader: CHEVRON_VERTEX,
        fragmentShader: CHEVRON_FRAGMENT,
      }),
    [palette],
  )
  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime
  })

  if (!aisle) return null
  const count = Math.max(3, Math.min(12, Math.round(width / 4)))
  const step = width / count
  return (
    <group>
      {Array.from({ length: count }, (_, index) => {
        const x = aisle.x - width / 2 + step * (index + 0.5)
        return (
          <mesh
            key={index}
            material={material}
            rotation={[-Math.PI / 2, 0, Math.PI]}
            position={[x, terrain.heightAt(x, aisle.z) + 0.03, aisle.z]}
          >
            <planeGeometry args={[step * 0.42, aisle.width * 0.3]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** A few slow dust motes. Nothing more. */
function Dust({ radius, palette, reducedMotion }: { radius: number; palette: HoloLotPalette; reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const count = 48
    const positions = new Float32Array(count * 3)
    let seed = 20240917
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (rand() - 0.5) * radius * 2.4
      positions[i * 3 + 1] = rand() * 4.5 + 0.2
      positions[i * 3 + 2] = (rand() - 0.5) * radius * 2.4
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [radius])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color(palette.holo),
        size: 0.045,
        transparent: true,
        opacity: palette.light ? 0.28 : 0.5,
        sizeAttenuation: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [palette],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const points = pointsRef.current
    if (!points) return
    points.rotation.y = clock.elapsedTime * 0.012
    points.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.08
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
}

/* -------------------------------------------------------------------------- *
 * Scene root
 * -------------------------------------------------------------------------- */

export interface HoloLotSceneProps {
  bays: HoloLotBay[]
  seed: string
  survey?: SurveyTerrain | null
  palette: HoloLotPalette
  selectedBayId: number | null
  hoveredBayId: number | null
  activeBayId: number | null
  selectableIds: Set<number>
  showLabels: boolean
  changed: Map<number, number>
  reducedMotion: boolean
  driftEnabled: boolean
  /** Reports camera state so the HUD compass stays honest. */
  onCameraChange?: (yaw: number, pitch: number) => void
  onHover: (id: number | null) => void
  onSelect: (id: number) => void
  onDoubleClick: (id: number) => void
  onDeselect: () => void
  resetSignal: number
}

export default function HoloLotScene(props: HoloLotSceneProps) {
  const {
    bays,
    seed,
    survey,
    palette,
    selectedBayId,
    hoveredBayId,
    activeBayId,
    selectableIds,
    showLabels,
    changed,
    reducedMotion,
    driftEnabled,
    onCameraChange,
    onHover,
    onSelect,
    onDoubleClick,
    onDeselect,
    resetSignal,
  } = props

  const { scene, camera, invalidate } = useThree()

  const sceneData = useMemo(() => {
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
    return { layout, terrain }
  }, [bays, seed, survey])

  const { layout, terrain } = sceneData
  const radius = Math.max(layout.width, layout.depth) / 2 + 4

  // Lighting: one key, one cool rim. Nothing else.
  useEffect(() => {
    const key = new THREE.DirectionalLight(new THREE.Color(palette.holo), palette.light ? 2.1 : 1.5)
    key.position.set(radius * 0.8, radius * 1.4, radius * 0.6)
    const rim = new THREE.DirectionalLight(new THREE.Color(palette.arc), palette.light ? 0.5 : 0.65)
    rim.position.set(-radius, radius * 0.5, -radius * 0.8)
    const ambient = new THREE.HemisphereLight(
      new THREE.Color(palette.hairlineStrong),
      palette.canvas,
      palette.light ? 1.4 : 0.75,
    )
    scene.add(key, rim, ambient)
    scene.fog = new THREE.Fog(new THREE.Color(palette.canvas), radius * 0.9, radius * 3.1)
    return () => {
      scene.remove(key, rim, ambient)
      scene.fog = null
    }
  }, [scene, palette, radius])

  // Frame the lot: fit the slab bounds to the camera distance.
  const frameCamera = useMemo(() => {
    const fitRadius = Math.max(radius, 6)
    const fov = ((camera as THREE.PerspectiveCamera).fov ?? 45) * (Math.PI / 180)
    const distance = (fitRadius / Math.tan(fov / 2)) * 0.85
    return distance
  }, [radius, camera])

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera
    const yaw = Math.PI * 0.25
    const pitch = 35 * (Math.PI / 180)
    const horizontal = Math.cos(pitch) * frameCamera
    perspective.position.set(
      Math.sin(yaw) * horizontal,
      Math.sin(pitch) * frameCamera,
      Math.cos(yaw) * horizontal,
    )
    perspective.near = Math.max(0.1, frameCamera * 0.02)
    perspective.far = frameCamera * 12
    perspective.updateProjectionMatrix()
    perspective.lookAt(0, 0, 0)
    invalidate()
    onCameraChange?.(yaw, pitch)
  }, [camera, frameCamera, invalidate, onCameraChange, resetSignal])

  /* Idle drift: ±3° of yaw over 20 s. Only re-renders when the angle actually
     changes, so a static lot costs roughly one frame per second. */
  const driftState = useRef({ yaw: Math.PI * 0.25, lastDrawn: Math.PI * 0.25, t: 0 })
  useEffect(() => {
    if (!driftEnabled || reducedMotion) return
    let raf = 0
    const threshold = (3 * Math.PI) / 180 / 200 // 0.05° per tick
    const tick = () => {
      driftState.current.t += 1 / 60
      const phase = (driftState.current.t / 20) * Math.PI * 2
      driftState.current.yaw = Math.PI * 0.25 + (Math.sin(phase) * 3 * Math.PI) / 180
      if (Math.abs(driftState.current.yaw - driftState.current.lastDrawn) > threshold) {
        driftState.current.lastDrawn = driftState.current.yaw
        const pitch = 35 * (Math.PI / 180)
        const horizontal = Math.cos(pitch) * frameCamera
        const camera3 = camera as THREE.PerspectiveCamera
        camera3.position.set(
          Math.sin(driftState.current.yaw) * horizontal,
          Math.sin(pitch) * frameCamera,
          Math.cos(driftState.current.yaw) * horizontal,
        )
        camera3.lookAt(0, 0, 0)
        onCameraChange?.(driftState.current.yaw, pitch)
        invalidate()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [driftEnabled, reducedMotion, frameCamera, camera, invalidate, onCameraChange])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDeselect()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDeselect])

  return (
    <>
      <Floor palette={palette} radius={radius} />
      <Terrain terrain={terrain} palette={palette} />
      <Grid terrain={terrain} palette={palette} />
      <Contours terrain={terrain} palette={palette} />
      <AisleChevrons
        aisle={layout.aisle}
        terrain={terrain}
        width={layout.bounds.maxX - layout.bounds.minX}
        palette={palette}
        reducedMotion={reducedMotion}
      />
      <Bays
        bays={bays}
        geometry={layout.bays}
        terrain={terrain}
        palette={palette}
        selectedBayId={selectedBayId}
        hoveredBayId={hoveredBayId}
        activeBayId={activeBayId}
        selectableIds={selectableIds}
        showLabels={showLabels}
        changed={changed}
        onHover={onHover}
        onSelect={onSelect}
        onDoubleClick={onDoubleClick}
        reducedMotion={reducedMotion}
      />
      <Dust radius={radius} palette={palette} reducedMotion={reducedMotion} />
    </>
  )
}
