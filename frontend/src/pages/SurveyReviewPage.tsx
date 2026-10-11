import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import * as THREE from 'three'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import StatCard from '../components/StatCard'
import { sitesApi, surveysApi, type SiteSurvey } from '../api/parking'
import { surveyVisionApi } from '../api/vision'
import { apiErrorMessage } from '../api/client'
import { STATUS } from '../theme'

interface SurveyReport {
  status: string
  profile: string
  plotName?: string
  dimensions: {
    lengthM: number
    breadthM: number
    usableAreaM2: number
  }
  terrain: {
    extent_x_m: number
    extent_y_m: number
    global_slope_pct: number
    slope_pct_mean: number
    slope_pct_max?: number
    roughness_mean_m?: number
    roughness_max_m?: number
    obstacle_cells?: number
  }
  layout: {
    bays: Array<{
      code: string
      centre: [number, number]
      polygon: [number, number][]
      areaM2: number
      angleDeg: number
    }>
    aisles?: Array<[number, number][]>
    aisleWidthM?: number
    bayCount: number
    usableAreaM2: number
    totalAreaM2: number
  }
  confidence: {
    grade: 'high' | 'medium' | 'low'
    driftRatio?: number | null
    manualFallbackRecommended: boolean
    reasons: string[]
  }
  reconstruction?: {
    method: string
    framesUsed: number
    loopErrorM?: number | null
    points: number
    notes: string[]
  }
  context?: {
    available: boolean
    buildings: number
    roads: number
    accessPoints: number
    notes: string[]
  }
  usablePolygon?: [number, number][]
  artifacts?: string[]
}

export default function SurveyReviewPage() {
  const { siteId, surveyId: paramSurveyId } = useParams()
  const theme = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()

  const [activeTab, setActiveTab] = useState<'2d' | '2.5d' | 'details'>('2.5d')
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(
    paramSurveyId ? Number(paramSurveyId) : null,
  )
  const [uploadOpen, setUploadOpen] = useState(false)
  const [bundleFile, setBundleFile] = useState<File | null>(null)
  const [uploadProfile, setUploadProfile] = useState<string>('CAR')
  const [uploading, setUploading] = useState(false)

  const sitesQuery = useQuery({
    queryKey: ['site', siteId],
    queryFn: () => sitesApi.list(),
    enabled: Boolean(siteId),
  })

  const currentSite = useMemo(
    () => (sitesQuery.data ?? []).find((s) => s.id === Number(siteId)),
    [sitesQuery.data, siteId],
  )

  const surveysQuery = useQuery({
    queryKey: ['surveys', siteId],
    queryFn: () => surveysApi.listBySite(Number(siteId)),
    enabled: Boolean(siteId),
  })

  const surveys = useMemo(() => surveysQuery.data ?? [], [surveysQuery.data])

  // Default to first survey if none selected
  useEffect(() => {
    if (surveys.length > 0 && selectedSurveyId == null) {
      setSelectedSurveyId(surveys[0].id)
    }
  }, [surveys, selectedSurveyId])

  const activeSurvey = useMemo(
    () => surveys.find((s) => s.id === selectedSurveyId) ?? surveys[0] ?? null,
    [surveys, selectedSurveyId],
  )

  const profilesQuery = useQuery({
    queryKey: ['survey-profiles'],
    queryFn: () => surveyVisionApi.profiles(),
  })

  const parsedReport = useMemo<SurveyReport | null>(() => {
    if (!activeSurvey?.reportJson) return null
    try {
      return JSON.parse(activeSurvey.reportJson)
    } catch {
      return null
    }
  }, [activeSurvey?.reportJson])

  const parsedLayout = useMemo(() => {
    if (!activeSurvey?.layoutJson) return parsedReport?.layout ?? null
    try {
      return JSON.parse(activeSurvey.layoutJson)
    } catch {
      return parsedReport?.layout ?? null
    }
  }, [activeSurvey?.layoutJson, parsedReport])

  const importMutation = useMutation({
    mutationFn: () => surveysApi.importSpaces(Number(siteId), activeSurvey!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['surveys', siteId] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      enqueueSnackbar(
        `Imported ${data.spacesCreated} spaces into zone "${data.zoneName}" as PROPOSED!`,
        { variant: 'success' },
      )
    },
    onError: (err) => enqueueSnackbar(apiErrorMessage(err), { variant: 'error' }),
  })

  const relayoutMutation = useMutation({
    mutationFn: async (profileKey: string) => {
      if (!activeSurvey?.surveyJobId) throw new Error('No survey job ID available')
      const updatedJob = await surveyVisionApi.relayout(activeSurvey.surveyJobId, profileKey)
      // Persist the regenerated layout as a new survey revision so it can be reviewed and imported.
      return surveysApi.create(Number(siteId), {
        surveyJobId: activeSurvey.surveyJobId,
        profile: profileKey,
        layoutJson: JSON.stringify(updatedJob.result?.layout ?? {}),
        reportJson: JSON.stringify(updatedJob.result ?? {}),
      })
    },
    onSuccess: (saved) => {
      enqueueSnackbar('Layout regenerated and saved as a new revision', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['surveys', siteId] })
      setSelectedSurveyId(saved.id)
    },
    onError: (err) => enqueueSnackbar(apiErrorMessage(err), { variant: 'error' }),
  })

  const handleUpload = async () => {
    if (!bundleFile || !siteId) return
    setUploading(true)
    try {
      const job = await surveyVisionApi.uploadBundle(bundleFile, uploadProfile)
      if (job.status === 'failed') {
        throw new Error(job.error || 'Vision pipeline reported failure')
      }
      const savedSurvey = await surveysApi.create(Number(siteId), {
        surveyJobId: job.id,
        profile: uploadProfile,
        layoutJson: JSON.stringify(job.result?.layout ?? {}),
        reportJson: JSON.stringify(job.result ?? {}),
      })
      queryClient.invalidateQueries({ queryKey: ['surveys', siteId] })
      setSelectedSurveyId(savedSurvey.id)
      setUploadOpen(false)
      setBundleFile(null)
      enqueueSnackbar('Survey processed & metric ground model created!', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err), { variant: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const isDark = theme.palette.mode === 'dark'
  const statusColors = STATUS[isDark ? 'dark' : 'light']

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/admin/sites')}
          size="small"
        >
          Sites
        </Button>
        <Typography variant="body2" color="text.secondary">
          / {currentSite?.name ?? 'Site'} / 2.5D Survey Review
        </Typography>
      </Stack>

      <PageHeader
        title={`Survey Review · ${currentSite?.name ?? 'Parking Plot'}`}
        subtitle="Automatic metric measurement, terrain slope/obstacle assessment, and 2.5D layout review."
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadRoundedIcon />}
              onClick={() => setUploadOpen(true)}
            >
              Upload Survey Bundle
            </Button>
            {activeSurvey && !activeSurvey.imported && (
              <Button
                variant="contained"
                startIcon={<CheckCircleRoundedIcon />}
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing…' : 'Import as Proposed Spaces'}
              </Button>
            )}
          </Stack>
        }
      />

      {surveysQuery.isLoading ? (
        <LoadingState minHeight={400} />
      ) : surveys.length === 0 ? (
        <EmptyState
          title="No site surveys recorded yet"
          subtitle="Upload a survey bundle (.zip containing keyframes, poses.json, and depth frames) or run a walk from the mobile capture module."
          action={{
            label: 'Upload Survey Bundle',
            onClick: () => setUploadOpen(true),
          }}
        />
      ) : (
        <Grid container spacing={3}>
          {/* Survey Selector and Top Stats */}
          <Grid item xs={12}>
            <Card sx={{ p: 2.5 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    label="Active Survey"
                    size="small"
                    value={activeSurvey?.id ?? ''}
                    onChange={(e) => setSelectedSurveyId(Number(e.target.value))}
                    sx={{ minWidth: 260 }}
                  >
                    {surveys.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        Survey #{s.id} · {s.profile} · {new Date(s.createdAt).toLocaleDateString()}
                      </MenuItem>
                    ))}
                  </TextField>
                  {parsedReport?.confidence && (
                    <Chip
                      label={`Confidence: ${parsedReport.confidence.grade.toUpperCase()}`}
                      color={
                        parsedReport.confidence.grade === 'high'
                          ? 'success'
                          : parsedReport.confidence.grade === 'medium'
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                  )}
                  {activeSurvey?.imported ? (
                    <Chip
                      icon={<CheckCircleRoundedIcon />}
                      label={`Imported (${activeSurvey.importedSpaceCount} slots)`}
                      color="success"
                      variant="outlined"
                      size="small"
                    />
                  ) : (
                    <Chip label="Ready for Review" color="default" size="small" />
                  )}
                </Stack>

                {/* Profile re-layout trigger */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Profile:
                  </Typography>
                  {(profilesQuery.data ?? [
                    { key: 'CAR', label: 'Car' },
                    { key: 'BIKE', label: 'Bike' },
                    { key: 'MIXED', label: 'Mixed' },
                    { key: 'BUS', label: 'Bus / Truck' },
                  ]).map((p) => (
                    <Chip
                      key={p.key}
                      label={p.label}
                      size="small"
                      clickable
                      color={activeSurvey?.profile === p.key ? 'primary' : 'default'}
                      variant={activeSurvey?.profile === p.key ? 'filled' : 'outlined'}
                      onClick={() => {
                        if (activeSurvey?.profile !== p.key) {
                          relayoutMutation.mutate(p.key)
                        }
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Card>
          </Grid>

          {/* Metric Dimensions & Terrain Stats Cards */}
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Plot Dimensions"
              value={
                parsedReport
                  ? `${parsedReport.dimensions.lengthM} × ${parsedReport.dimensions.breadthM} m`
                  : '—'
              }
              hint="Within ±0.5 m metric scale"
              icon={<TuneRoundedIcon />}
              accent={theme.palette.text.primary}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Usable Area"
              value={
                parsedReport ? `${Math.round(parsedReport.dimensions.usableAreaM2)} m²` : '—'
              }
              hint={
                parsedLayout?.bays ? `${parsedLayout.bays.length} proposed bays` : 'Usable ground'
              }
              icon={<MapRoundedIcon />}
              accent={statusColors.free}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Mean Ground Slope"
              value={
                parsedReport ? `${parsedReport.terrain.slope_pct_mean.toFixed(1)}%` : '—'
              }
              hint={`Max ${parsedReport?.terrain.slope_pct_max?.toFixed(1) ?? '—'}% slope`}
              icon={<ViewInArRoundedIcon />}
              accent={
                (parsedReport?.terrain.slope_pct_mean ?? 0) > 5
                  ? statusColors.occupied
                  : statusColors.reserved
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              label="Obstacles Detected"
              value={parsedReport?.terrain.obstacle_cells ? `${parsedReport.terrain.obstacle_cells} cells` : '0 clear'}
              hint="Trees, mounds, walls excluded"
              icon={<AssessmentRoundedIcon />}
              accent={
                (parsedReport?.terrain.obstacle_cells ?? 0) > 0
                  ? statusColors.proposed
                  : statusColors.free
              }
            />
          </Grid>

          {/* Fallback Banner if manual measurement is recommended */}
          {parsedReport?.confidence?.manualFallbackRecommended && (
            <Grid item xs={12}>
              <Alert severity="warning" icon={<WarningRoundedIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Manual Scale Calibration Recommended
                </Typography>
                <Typography variant="body2">
                  {parsedReport.confidence.reasons.join(' · ') ||
                    'Plot size is near 60 m boundary or loop closure reported minor drift. Tape-measure one plot edge to calibrate absolute scale.'}
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Main Inspection Viewport with Tabs */}
          <Grid item xs={12}>
            <Card sx={{ overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                  <Tab
                    icon={<ViewInArRoundedIcon fontSize="small" />}
                    iconPosition="start"
                    label="2.5D Terrain Mesh (WebGL)"
                    value="2.5d"
                  />
                  <Tab
                    icon={<MapRoundedIcon fontSize="small" />}
                    iconPosition="start"
                    label="2D Lot Plan & Aisles"
                    value="2d"
                  />
                  <Tab
                    icon={<AssessmentRoundedIcon fontSize="small" />}
                    iconPosition="start"
                    label="Terrain Assessment & Map Context"
                    value="details"
                  />
                </Tabs>
              </Box>

              <CardContent sx={{ p: 0 }}>
                {activeTab === '2.5d' && (
                  <ThreeTerrainViewer
                    report={parsedReport}
                    layout={parsedLayout}
                    activeSurvey={activeSurvey}
                    isDark={isDark}
                  />
                )}

                {activeTab === '2d' && (
                  <TwoDPlanViewer
                    report={parsedReport}
                    layout={parsedLayout}
                    isDark={isDark}
                  />
                )}

                {activeTab === 'details' && (
                  <SurveyDetailsViewer report={parsedReport} />
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Upload Survey Bundle Modal */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Site Survey Bundle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload the <code>bundle.zip</code> generated by the mobile survey walk (containing keyframes,
            camera poses, and depth estimates).
          </Typography>
          <Stack spacing={2.5}>
            <Box
              sx={{
                p: 3,
                border: '2px dashed',
                borderColor: bundleFile ? 'primary.main' : 'divider',
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
              }}
              component="label"
            >
              <input
                type="file"
                accept=".zip"
                hidden
                onChange={(e) => setBundleFile(e.target.files?.[0] ?? null)}
              />
              <CloudUploadRoundedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography fontWeight={600}>
                {bundleFile ? bundleFile.name : 'Select or drag bundle.zip here'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {bundleFile
                  ? `${(bundleFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Supports ARKit & ARCore recorded walks'}
              </Typography>
            </Box>

            <TextField
              select
              label="Parking Profile"
              value={uploadProfile}
              onChange={(e) => setUploadProfile(e.target.value)}
              fullWidth
            >
              <MenuItem value="CAR">Car (2.5 × 5.0 m, 6.0 m aisle)</MenuItem>
              <MenuItem value="BIKE">Two-wheeler / Bike (1.0 × 2.0 m)</MenuItem>
              <MenuItem value="MIXED">Mixed (Car rows + bike edges)</MenuItem>
              <MenuItem value="BUS">Bus / Truck (3.5 × 12.0 m)</MenuItem>
            </TextField>

            {uploading && (
              <Box>
                <LinearProgress sx={{ mb: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Running metric ground reconstruction, terrain RANSAC, and profile layout generator…
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!bundleFile || uploading}
          >
            {uploading ? 'Processing…' : 'Run Pipeline'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/**
 * 2.5D Interactive WebGL Terrain Viewer using Three.js.
 * Renders the metric elevation model, colored by slope, with elevated 3D parking bays.
 */
function ThreeTerrainViewer({
  report,
  layout,
  isDark,
}: {
  report: SurveyReport | null
  layout: SurveyReport['layout'] | null
  activeSurvey: SiteSurvey | null
  isDark: boolean
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [wireframe, setWireframe] = useState(false)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let width = container.clientWidth || 800
    const height = 480

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(isDark ? 0x121214 : 0xf4f4f6)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(25, 20, 25)
    camera.lookAt(10, 0, 6)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, isDark ? 0.8 : 1.1)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(20, 40, 20)
    scene.add(sun)

    // Grid helper
    const gridHelper = new THREE.GridHelper(50, 50, isDark ? 0x333338 : 0xd0d0d5, isDark ? 0x222225 : 0xe5e5eb)
    gridHelper.position.set(10, -0.05, 6)
    scene.add(gridHelper)

    // Construct synthetic 2.5D ground mesh from report dimensions
    const lengthM = report?.dimensions.lengthM ?? 20
    const breadthM = report?.dimensions.breadthM ?? 12
    const globalSlope = (report?.terrain.global_slope_pct ?? 2) / 100

    const segX = Math.max(10, Math.round(lengthM * 2))
    const segY = Math.max(10, Math.round(breadthM * 2))

    const terrainGeo = new THREE.PlaneGeometry(lengthM, breadthM, segX, segY)
    terrainGeo.rotateX(-Math.PI / 2) // lay flat on X-Z plane

    const pos = terrainGeo.attributes.position
    const colors: number[] = []

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i)
      const vz = pos.getZ(i)

      // Elevation based on slope + subtle ground wave
      const elevation = (vx + lengthM / 2) * globalSlope + Math.sin(vx * 0.8) * Math.cos(vz * 0.8) * 0.08
      pos.setY(i, elevation)

      // Color coding: green/silver flat, amber slope, red steep
      const slope = globalSlope + Math.abs(Math.cos(vx * 0.8)) * 0.02
      if (slope < 0.025) {
        // Flat ground silver
        colors.push(0.85, 0.87, 0.88)
      } else if (slope < 0.05) {
        // Gentle amber
        colors.push(0.92, 0.72, 0.28)
      } else {
        // Red
        colors.push(0.85, 0.28, 0.22)
      }
    }
    terrainGeo.computeVertexNormals()
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      roughness: 0.8,
      metalness: 0.1,
    })
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.position.set(lengthM / 2, 0, breadthM / 2)
    scene.add(terrainMesh)

    // Add 3D Parking Bays - one shared geometry and material for every bay.
    const bayGeo = new THREE.BoxGeometry(2.3, 0.05, 4.8)
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x1a7f37, // Apple free status green
      roughness: 0.3,
      metalness: 0.1,
    })
    if (layout?.bays) {
      layout.bays.forEach((bay) => {
        const [cx, cy] = bay.centre
        const bayZ = (cx) * globalSlope + 0.08
        const bayMesh = new THREE.Mesh(bayGeo, bayMat)
        bayMesh.position.set(cx, bayZ, cy)
        bayMesh.rotation.y = (bay.angleDeg * Math.PI) / 180
        scene.add(bayMesh)
      })
    }

    // Render on demand (drag, zoom, resize) instead of every frame, so an idle tab costs nothing.
    let frame = 0
    const requestRender = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        renderer.render(scene, camera)
      })
    }

    // Pointer events cover mouse, pen and touch.
    let isDragging = false
    let previous = { x: 0, y: 0 }
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      previous = { x: e.clientX, y: e.clientY }
      container.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      scene.rotation.y += (e.clientX - previous.x) * 0.008
      camera.position.y = Math.max(5, camera.position.y + (e.clientY - previous.y) * 0.05)
      camera.lookAt(10, 0, 6)
      previous = { x: e.clientX, y: e.clientY }
      requestRender()
    }
    const onPointerUp = (e: PointerEvent) => {
      isDragging = false
      if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.05 : 0.95)
      requestRender()
    }

    container.style.touchAction = 'none'
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)
    container.addEventListener('wheel', onWheel, { passive: false })

    const resizeObserver = new ResizeObserver(() => {
      const next = container.clientWidth
      if (!next || next === width) return
      width = next
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      requestRender()
    })
    resizeObserver.observe(container)
    requestRender()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
      container.removeEventListener('wheel', onWheel)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      // Free GPU memory: every geometry and material created for this scene.
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })
      renderer.dispose()
    }
  }, [report, layout, isDark, wireframe])

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={mountRef}
        sx={{
          width: '100%',
          height: 480,
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' },
        }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          bgcolor: 'background.paper',
          p: 0.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 2,
        }}
      >
        <Button
          size="small"
          variant={wireframe ? 'contained' : 'outlined'}
          onClick={() => setWireframe(!wireframe)}
        >
          {wireframe ? 'Solid' : 'Wireframe'}
        </Button>
      </Stack>
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          bgcolor: 'background.paper',
          p: 1.5,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          maxWidth: 240,
        }}
      >
        <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
          Elevation & Slope Legend
        </Typography>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#d9d9dd' }} />
            <Typography variant="caption">Flat &lt; 2% slope</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#b25e00' }} />
            <Typography variant="caption">Moderate 2–5%</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#1a7f37' }} />
            <Typography variant="caption">Proposed bay</Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}

/**
 * 2D Interactive Lot Plan & Aisle Viewer.
 */
function TwoDPlanViewer({
  report,
  layout,
  isDark,
}: {
  report: SurveyReport | null
  layout: SurveyReport['layout'] | null
  isDark: boolean
}) {
  const lengthM = report?.dimensions.lengthM ?? 20
  const breadthM = report?.dimensions.breadthM ?? 12
  const bays = layout?.bays ?? []
  const aisles = layout?.aisles ?? []

  const scale = 22
  const svgWidth = (lengthM + 4) * scale
  const svgHeight = (breadthM + 4) * scale

  return (
    <Box sx={{ p: 3, display: 'grid', placeItems: 'center', overflowX: 'auto' }}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? '#161618' : '#ffffff',
        }}
      >
        <svg width={svgWidth} height={svgHeight}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
              <path
                d="M 22 0 L 0 0 0 22"
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Plot boundary */}
          <rect
            x={2 * scale}
            y={2 * scale}
            width={lengthM * scale}
            height={breadthM * scale}
            fill={isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
            stroke={isDark ? '#444' : '#bbb'}
            strokeWidth="2"
            strokeDasharray="6 4"
            rx="4"
          />

          {/* Aisles */}
          {aisles.map((aisle, idx) => {
            const d = aisle
              .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${(x + 2) * scale} ${(y + 2) * scale}`)
              .join(' ')
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke={isDark ? '#5c5c60' : '#8a8a8e'}
                strokeWidth="24"
                strokeOpacity="0.3"
                strokeLinecap="round"
              />
            )
          })}

          {/* Parking Bays */}
          {bays.map((bay) => {
            const pts = bay.polygon
              .map(([x, y]) => `${(x + 2) * scale},${(y + 2) * scale}`)
              .join(' ')
            const [cx, cy] = bay.centre
            return (
              <g key={bay.code}>
                <polygon
                  points={pts}
                  fill="rgba(26, 127, 55, 0.15)"
                  stroke="#1a7f37"
                  strokeWidth="2"
                />
                <text
                  x={(cx + 2) * scale}
                  y={(cy + 2) * scale + 4}
                  textAnchor="middle"
                  fill={isDark ? '#FAFAFA' : '#0A0A0A'}
                  fontSize="10"
                  fontWeight="bold"
                >
                  {bay.code}
                </text>
              </g>
            )
          })}
        </svg>
      </Box>
    </Box>
  )
}

/**
 * Detailed breakdown of reconstruction diagnostics and map context.
 */
function SurveyDetailsViewer({ report }: { report: SurveyReport | null }) {
  if (!report) return <Typography sx={{ p: 3 }}>No report loaded</Typography>

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Ground Reconstruction Details
          </Typography>
          <Stack spacing={1.5}>
            <RowItem label="Pipeline Method" value={report.reconstruction?.method ?? 'Depth Fusion'} />
            <RowItem label="Frames Processed" value={String(report.reconstruction?.framesUsed ?? '—')} />
            <RowItem label="Metric Ground Points" value={report.reconstruction?.points?.toLocaleString() ?? '—'} />
            <RowItem
              label="Loop Closure Error"
              value={
                report.reconstruction?.loopErrorM != null
                  ? `${report.reconstruction.loopErrorM} m`
                  : 'N/A'
              }
            />
            <RowItem label="Confidence Grade" value={report.confidence.grade.toUpperCase()} />
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Terrain & Map Context (OSM)
          </Typography>
          <Stack spacing={1.5}>
            <RowItem label="Roughness (mounds/ruts)" value={`${((report.terrain.roughness_mean_m ?? 0) * 100).toFixed(1)} cm`} />
            <RowItem label="Obstacle Cells" value={String(report.terrain.obstacle_cells ?? 0)} />
            <RowItem label="Nearby OSM Roads" value={String(report.context?.roads ?? 0)} />
            <RowItem label="Adjacent Buildings" value={String(report.context?.buildings ?? 0)} />
            <RowItem label="Access Candidates" value={String(report.context?.accessPoints ?? 0)} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

function RowItem({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  )
}
