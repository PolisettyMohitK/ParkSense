import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Box, useTheme } from '@mui/material'
import HoloLotHud from './HoloLotHud'
import BayReadout from './HoloLotBayReadout'
import { ScanSweep } from './Stark'
import { useReducedMotion, useRovingGrid } from './StarkHooks'
import HoloLot2D from './HoloLot2D'
import { usePlanCamera } from './usePlanCamera'
import { radius, statusKeyFor } from '../theme'
import type { SurveyTerrain } from '../three/hololit'
import type { HoloLotBay, HoloLotMode, HoloLotPalette } from '../three/HoloLotTypes'
import type { HoloLotSceneProps } from '../three/HoloLotScene'

const HoloLotScene = () => import('../three/HoloLotScene')

export interface HoloLotProps {
  siteId: number
  zoneId: number
  zoneName?: string
  bays: HoloLotBay[]
  /** Bay holding the driver's current stay — gets the amber beacon. */
  activeBayId?: number | null
  selectedBayId?: number | null
  onSelectBay?: (bay: HoloLotBay | null) => void
  /** Drivers may only act on these statuses. */
  selectableStatuses?: HoloLotBay['status'][]
  /** Bumped by the caller every time live occupancy lands → scanline sweep. */
  sweepTrigger?: number
  /** Bumped by the caller when a specific bay changed → targeted 420 ms drop-in. */
  changedBayId?: number | null
  seed?: string
  survey?: SurveyTerrain | null
  loading?: boolean
  height?: number | string
  /** Login hero: slow orbit, no interaction affordances. */
  idle?: boolean
  className?: string
  /** Extra DOM overlay content, e.g. the area switcher. */
  overlay?: ReactNode
  /** Show the live counters + compass + zoom controls (5 elements max). */
  hud?: boolean
  /** Escape hatch for ambient scenes that paint the canvas themselves. */
  paletteOverride?: HoloLotPalette
}

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

/**
 * HoloLot — the holographic parking slab used by every place and every area.
 *
 * WebGL is loaded as a separate chunk and only mounted when the canvas is
 * actually on screen. If WebGL is unavailable, the tab is hidden, the device
 * asks for reduced motion, or the viewer is off-screen, the identical scene is
 * rendered with the SVG isometric renderer instead.
 */
export default function HoloLot({
  siteId,
  zoneId,
  zoneName,
  bays,
  activeBayId = null,
  selectedBayId = null,
  onSelectBay,
  selectableStatuses,
  sweepTrigger = 0,
  changedBayId = null,
  seed,
  survey,
  loading = false,
  height = 440,
  idle = false,
  className,
  overlay,
  hud = true,
  paletteOverride,
}: HoloLotProps) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const [Scene, setScene] = useState<React.ComponentType<HoloLotSceneProps> | null>(null)
  const [hoveredBayId, setHoveredBayId] = useState<number | null>(null)
  const [mode, setMode] = useState<HoloLotMode>('3d')
  const [labels, setLabels] = useState(true)
  const [resetSignal, setResetSignal] = useState(0)
  const [size, setSize] = useState({ width: 960, height: 440 })
  const [yaw, setYaw] = useState(Math.PI * 0.25)

  const resolvedSeed = seed ?? `site-${siteId}-zone-${zoneId}`

  // Survey ground truth beats the procedural field when the site has one.
  const surveyMemo = useMemo(() => survey ?? null, [survey])

  /* --- mount gating: only build the scene once it is on screen --- */
  useEffect(() => setWebgl(detectWebGL()), [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: '160px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  /* --- reserve the exact box so the page never shifts --- */
  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const measure = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0) setSize({ width: rect.width, height: rect.height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /* --- lazy-load the three.js chunk, never in the main bundle --- */
  useEffect(() => {
    if (webgl === false || reducedMotion || mode === '2d') return
    let cancelled = false
    HoloLotScene()
      .then((module) => {
        if (!cancelled) setScene(() => module.default)
      })
      .catch(() => setWebgl(false))
    return () => {
      cancelled = true
    }
  }, [webgl, reducedMotion, mode])

  const use3D = webgl === true && !reducedMotion && mode === '3d' && Scene !== null && visible && tabVisible

  const themePalette: HoloLotPalette = useMemo(
    () => ({
      holo: theme.stark.holo,
      holoSoft: theme.stark.holoSoft,
      arc: theme.stark.arc,
      hairline: theme.stark.hairline,
      hairlineStrong: theme.stark.hairlineStrong,
      canvas: theme.palette.background.default,
      surface: theme.palette.background.paper,
      surfaceRaised: theme.stark.surfaceRaised,
      textPrimary: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      status: theme.stark.status,
      light: theme.palette.mode === 'light',
    }),
    [theme],
  )
  const palette = paletteOverride ?? themePalette

  const selectableIds = useMemo(() => {
    const allowed = new Set(selectableStatuses ?? (['AVAILABLE'] as HoloLotBay['status'][]))
    return new Set(bays.filter((bay) => allowed.has(bay.status) && !bay.proposed).map((bay) => bay.id))
  }, [bays, selectableStatuses])

  const counts = useMemo(() => {
    const acc = { free: 0, occupied: 0, reserved: 0, offline: 0 }
    for (const bay of bays) {
      if (bay.proposed) continue
      const key = statusKeyFor(bay.status)
      if (key !== 'proposed') acc[key] += 1
    }
    return acc
  }, [bays])

  /* --- live change tracking: only the changed bay animates --- */
  const previous = useRef<Map<number, string>>(new Map())
  const changed = useRef<Map<number, number>>(new Map())
  const [sweep, setSweep] = useState(0)
  const lastTrigger = useRef(sweepTrigger)

  useEffect(() => {
    const next = new Map<number, string>()
    let mutated = false
    for (const bay of bays) {
      const signature = `${bay.status}:${bay.proposed ? 1 : 0}`
      next.set(bay.id, signature)
      if (previous.current.has(bay.id) && previous.current.get(bay.id) !== signature) {
        changed.current.set(bay.id, performance.now())
        mutated = true
      }
    }
    if (previous.current.size === 0) previous.current = next
    else {
      previous.current = next
      if (mutated) setSweep((value) => value + 1)
    }
    // `changed` is a ref: the scene reads it on the next frame.
  }, [bays])

  // The caller can also drive the sweep directly (e.g. staff operator mode).
  useEffect(() => {
    if (sweepTrigger === lastTrigger.current) return
    lastTrigger.current = sweepTrigger
    setSweep((value) => value + 1)
  }, [sweepTrigger])

  /* --- keyboard + screen-reader parity --- */
  const [activeIndex, setActiveIndex] = useState(0)
  const columnCount = Math.max(1, Math.ceil(Math.sqrt(bays.length)))
  const rowCount = Math.max(1, Math.ceil(bays.length / columnCount))
  const sorted = useMemo(() => [...bays].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })), [bays])
  const roving = useRovingGrid({
    rowCount,
    columnCount,
    activeIndex: Math.min(activeIndex, Math.max(0, sorted.length - 1)),
    onChange: (index) => {
      setActiveIndex(index)
      const bay = sorted[index]
      if (bay) onSelectBay?.(bay)
    },
    onActivate: (index) => {
      const bay = sorted[index]
      if (!bay || !selectableIds.has(bay.id)) return
      onSelectBay?.(bay)
    },
  })

  const announcement = useRef<HTMLDivElement>(null)
  const lastAnnounce = useRef(0)
  useEffect(() => {
    if (sweep === 0) return
    const now = performance.now()
    if (now - lastAnnounce.current < 1200) return
    lastAnnounce.current = now
    const node = announcement.current
    if (!node) return
    const changedBay = changedBayId !== null ? bays.find((b) => b.id === changedBayId) : undefined
    node.textContent = changedBay
      ? `Bay ${changedBay.code} is now ${statusKeyFor(changedBay.status)}.`
      : `Occupancy updated. ${counts.free} free, ${counts.occupied} occupied.`
  }, [sweep, changedBayId, bays, counts])

  const handleSelect = useCallback(
    (id: number) => {
      const bay = bays.find((b) => b.id === id)
      if (bay) onSelectBay?.(bay)
    },
    [bays, onSelectBay],
  )

  const handleDeselect = useCallback(() => {
    if (selectedBayId !== null) onSelectBay?.(null)
  }, [selectedBayId, onSelectBay])

  const plan = usePlanCamera({ yaw: -30, zoom: 1 })
  const selectedBay = bays.find((bay) => bay.id === selectedBayId) ?? null

  const compassDeg = ((yaw * 180) / Math.PI + 360) % 360

  const shellStyle: CSSProperties = {
    position: 'relative',
    height,
    width: '100%',
    borderRadius: radius.panel,
    overflow: 'hidden',
    border: `1px solid ${theme.stark.hairline}`,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.stark.surfaceSunken,
    contain: 'paint',
    opacity: loading ? 0.6 : 1,
  }

  return (
    <div ref={containerRef} className={className} data-hololit="true" style={shellStyle}>
      {!idle ? <ScanSweep trigger={sweep} reduced={reducedMotion} /> : null}

      {/* Scene */}
      {use3D && Scene ? (
        <Canvas
          frameloop={tabVisible && visible ? 'always' : 'never'}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 42, position: [18, 18, 18] }}
          onPointerMissed={handleDeselect}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Scene
            bays={bays}
            seed={resolvedSeed}
            palette={palette}
            selectedBayId={selectedBayId}
            hoveredBayId={hoveredBayId}
            activeBayId={activeBayId}
            selectableIds={selectableIds}
            showLabels={labels}
            survey={surveyMemo}
            changed={changed.current}
            reducedMotion={reducedMotion}
            driftEnabled={!idle}
            onCameraChange={(nextYaw: number) => setYaw(nextYaw)}
            onHover={setHoveredBayId}
            onSelect={handleSelect}
            onDoubleClick={handleSelect}
            onDeselect={handleDeselect}
            resetSignal={resetSignal}
          />
          <OrbitControls
            enablePan
            enableDamping
            dampingFactor={0.08}
            minPolarAngle={0.22}
            maxPolarAngle={Math.PI / 2 - 0.06}
            minDistance={8}
            maxDistance={140}
            makeDefault
            enabled={!idle}
          />
        </Canvas>
      ) : (
        <div
          {...plan.handlers}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            cursor: idle ? 'default' : 'grab',
          }}
        >
          <HoloLot2D
            bays={bays}
            seed={resolvedSeed}
            survey={surveyMemo}
            palette={palette}
            selectedBayId={selectedBayId}
            hoveredBayId={hoveredBayId}
            activeBayId={activeBayId}
            selectableIds={selectableIds}
            width={size.width}
            height={size.height}
            pitchDeg={mode === '2d' ? 90 : 35}
            yawDeg={plan.yaw}
            showLabels={labels}
            onSelect={(bay) => onSelectBay?.(bay)}
            onHover={(bay) => setHoveredBayId(bay?.id ?? null)}
            onBackgroundClick={handleDeselect}
          />
        </div>
      )}

      {overlay ? <div style={overlaySlot}>{overlay}</div> : null}

      {hud && !idle ? (
        <HoloLotHud
          zoneName={zoneName}
          counts={counts}
          total={bays.length}
          compassDeg={compassDeg}
          mode={mode}
          labels={labels}
          canZoom={use3D}
          onModeChange={setMode}
          onToggleLabels={() => setLabels((value) => !value)}
          onReset={() => setResetSignal((value) => value + 1)}
        />
      ) : null}

      {selectedBay && !idle ? <BayReadout bay={selectedBay} /> : null}

      {/* Accessible mirror of the scene. */}
      {!idle ? (
        <div style={visuallyHidden}>
          <p style={{ margin: 0, fontSize: 12 }}>
            {zoneName ?? 'Parking area'} map. {counts.free} of {bays.length} bays free.
          </p>
          <ul
            role="listbox"
            aria-label="Parking bays"
            onKeyDown={roving.onKeyDown}
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
          >
            {sorted.map((bay, index) => {
              const interactive = selectableIds.has(bay.id)
              return (
                <Box
                  component="li"
                  key={bay.id}
                  role="option"
                  aria-selected={bay.id === selectedBayId}
                  aria-label={`Bay ${bay.code}, ${statusKeyFor(bay.status)}${interactive ? '' : ', not selectable'}`}
                  tabIndex={index === roving.activeIndex ? 0 : -1}
                  onClick={() => {
                    setActiveIndex(index)
                    if (interactive) onSelectBay?.(bay)
                  }}
                  sx={{ fontFamily: theme.stark.mono, fontSize: 12 }}
                >
                  {bay.code}
                </Box>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div ref={announcement} aria-live="polite" aria-atomic="true" style={visuallyHidden} />
    </div>
  )
}

const overlaySlot: CSSProperties = {
  position: 'absolute',
  top: 14,
  left: 14,
  zIndex: 3,
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
}

/* -------------------------------------------------------------------------- *
 * HUD
 * -------------------------------------------------------------------------- */



/* -------------------------------------------------------------------------- *
 * HUD
 * -------------------------------------------------------------------------- */
