import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import { spacesApi, zonesApi } from '../api/parking'
import { occupancyApi } from '../api/occupancy'
import { apiErrorMessage } from '../api/client'
import { detectOccupancy, proposeSlots, visionHealth, type DetectResult, type DetectSlot, type ProposeResult } from '../api/vision'
import type { ParkingSpace } from '../types'

function parsePolygon(raw?: string | null): number[][] | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length >= 3 && Array.isArray(parsed[0])) {
      return parsed as number[][]
    }
  } catch {
    /* stored polygon is not JSON */
  }
  return null
}

function slotsFromSpaces(spaces: ParkingSpace[]): DetectSlot[] {
  const slots: DetectSlot[] = []
  for (const space of spaces) {
    if (!space.active) continue
    const polygon = parsePolygon(space.polygon)
    if (polygon) {
      slots.push({ id: space.code ?? `#${space.id}`, space_id: space.id, polygon })
    } else if (space.positionX != null && space.positionY != null) {
      const x = space.positionX
      const y = space.positionY
      slots.push({
        id: space.code ?? `#${space.id}`,
        space_id: space.id,
        polygon: [
          [x, y],
          [x + 84, y],
          [x + 84, y + 104],
          [x, y + 104],
        ],
      })
    }
  }
  return slots
}

export default function CameraPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState<'propose' | 'detect'>('propose')

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const healthQuery = useQuery({ queryKey: ['vision-health'], queryFn: visionHealth, retry: 0, refetchInterval: 15000 })

  const [zoneId, setZoneId] = useState<number | ''>('')
  const activeZoneId = zoneId === '' ? (zonesQuery.data?.[0]?.id ?? '') : zoneId

  const spacesQuery = useQuery({
    queryKey: ['spaces', activeZoneId],
    queryFn: () => spacesApi.list(activeZoneId as number),
    enabled: activeZoneId !== '',
  })

  const [image, setImage] = useState<File | null>(null)
  const [reference, setReference] = useState<File | null>(null)
  const [cameraCode, setCameraCode] = useState('CAM-L1')
  const [mode, setMode] = useState('auto')
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(4)
  const [threshold, setThreshold] = useState<string>('')

  const [proposeResult, setProposeResult] = useState<ProposeResult | null>(null)
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null)

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  // Release the blob behind the previous preview when the image changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const proposeMutation = useMutation({
    mutationFn: () => proposeSlots(image as File, { mode, rows, cols }),
    onSuccess: (data) => {
      setProposeResult(data)
      setDetectResult(null)
      enqueueSnackbar(`${data.count} slot(s) proposed via ${data.method}`, { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const detectMutation = useMutation({
    mutationFn: () => {
      const slots = slotsFromSpaces(spacesQuery.data ?? [])
      if (slots.length === 0) {
        throw new Error('This zone has no positioned spaces to analyse')
      }
      const parsedThreshold = threshold.trim() === '' ? null : Number(threshold)
      return detectOccupancy(image as File, slots, reference, parsedThreshold)
    },
    onSuccess: (data) => {
      setDetectResult(data)
      setProposeResult(null)
      enqueueSnackbar(`${data.occupied} occupied / ${data.vacant} vacant`, { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!proposeResult) return { created: 0, failed: 0 }
      const results = await Promise.allSettled(
        proposeResult.slots.map((slot) => {
          const centroid = slot.polygon.reduce(
            (accumulator, point) => ({ x: accumulator.x + point[0], y: accumulator.y + point[1] }),
            { x: 0, y: 0 },
          )
          return spacesApi.create({
            zoneId: Number(activeZoneId),
            // Name proposed spaces after the detector's label so they are identifiable on the map.
            code: slot.label ? `CAM-${slot.label}`.slice(0, 50) : null,
            label: slot.label,
            polygon: JSON.stringify(slot.polygon),
            positionX: centroid.x / slot.polygon.length,
            positionY: centroid.y / slot.polygon.length,
            verificationStatus: 'PROPOSED',
            operationalState: 'IN_SERVICE',
          })
        }),
      )
      const failed = results.filter((result) => result.status === 'rejected').length
      return { created: results.length - failed, failed }
    },
    onSuccess: ({ created, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      enqueueSnackbar(
        failed === 0
          ? `${created} proposed space(s) created - verify them in the zone view`
          : `${created} created, ${failed} failed (duplicate codes?) - verify them in the zone view`,
        { variant: failed === 0 ? 'success' : 'warning' },
      )
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!detectResult) return { pushed: 0, failed: 0 }
      const frameId = `web-${Date.now()}`
      const results = await Promise.allSettled(
        detectResult.detections
          .filter((detection) => detection.spaceId != null)
          .map((detection) =>
            occupancyApi.record({
              spaceId: detection.spaceId as number,
              state: detection.state,
              source: 'CAMERA',
              confidence: detection.confidence,
              externalId: `${cameraCode}:${frameId}:${detection.spaceId}`,
              note: `vision:${detection.method}`,
            }),
          ),
      )
      const failed = results.filter((result) => result.status === 'rejected').length
      return { pushed: results.length - failed, failed }
    },
    onSuccess: ({ pushed, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      enqueueSnackbar(
        failed === 0 ? `${pushed} occupancy event(s) pushed` : `${pushed} pushed, ${failed} failed`,
        { variant: failed === 0 ? 'success' : 'warning' },
      )
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const visionDown = healthQuery.isError
  const overlay = proposeResult?.overlay ?? detectResult?.overlay ?? null

  return (
    <Box>
      <PageHeader
        title="Camera capture"
        subtitle="Upload a lot photo to propose parking slots, or detect live occupancy on an existing zone."
        action={
          <Chip
            icon={<PhotoCameraRoundedIcon />}
            label={visionDown ? 'Vision service offline' : 'Vision service online'}
            color={visionDown ? 'default' : 'success'}
            variant="outlined"
          />
        }
      />

      {visionDown && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The vision service is not reachable. Start it with:{' '}
          <code>cd vision-service &amp;&amp; .venv/bin/uvicorn app.main:app --port 8001</code>
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Zone"
                  value={activeZoneId}
                  onChange={(event) => setZoneId(Number(event.target.value))}
                  fullWidth
                >
                  {(zonesQuery.data ?? []).map((zone) => (
                    <MenuItem key={zone.id} value={zone.id}>
                      {zone.name} ({zone.code})
                    </MenuItem>
                  ))}
                </TextField>

                <Button component="label" variant="outlined" startIcon={<AddPhotoAlternateRoundedIcon />}>
                  {image ? image.name : 'Choose lot image'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      setImage(event.target.files?.[0] ?? null)
                      setProposeResult(null)
                      setDetectResult(null)
                    }}
                  />
                </Button>

                <Button component="label" variant="text" size="small" startIcon={<UploadFileRoundedIcon />}>
                  {reference ? `Reference: ${reference.name}` : 'Add empty-lot reference (optional)'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => setReference(event.target.files?.[0] ?? null)}
                  />
                </Button>

                <TextField
                  label="Camera code"
                  value={cameraCode}
                  onChange={(event) => setCameraCode(event.target.value)}
                  fullWidth
                />

                <Divider />

                <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth">
                  <Tab value="propose" label="Propose slots" />
                  <Tab value="detect" label="Detect occupancy" />
                </Tabs>

                {tab === 'propose' ? (
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Detection mode"
                      value={mode}
                      onChange={(event) => setMode(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="auto">Auto (lines, then grid)</MenuItem>
                      <MenuItem value="lines">Painted lines only</MenuItem>
                      <MenuItem value="grid">Grid</MenuItem>
                    </TextField>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Rows"
                        type="number"
                        value={rows}
                        onChange={(event) => setRows(Number(event.target.value))}
                        fullWidth
                      />
                      <TextField
                        label="Columns"
                        type="number"
                        value={cols}
                        onChange={(event) => setCols(Number(event.target.value))}
                        fullWidth
                      />
                    </Stack>
                    <Button
                      variant="contained"
                      startIcon={<AutoFixHighRoundedIcon />}
                      disabled={!image || proposeMutation.isPending || visionDown}
                      onClick={() => proposeMutation.mutate()}
                    >
                      {proposeMutation.isPending ? 'Analysing…' : 'Propose slots'}
                    </Button>
                    {proposeResult && (
                      <Button
                        variant="outlined"
                        startIcon={<CloudUploadRoundedIcon />}
                        disabled={importMutation.isPending || activeZoneId === ''}
                        onClick={() => importMutation.mutate()}
                      >
                        Import {proposeResult.count} as proposed spaces
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Threshold (optional)"
                      value={threshold}
                      onChange={(event) => setThreshold(event.target.value)}
                      helperText="Leave blank to auto-split at the widest score gap"
                      fullWidth
                    />
                    <Typography variant="caption" color="text.secondary">
                      {(spacesQuery.data ?? []).length} space(s) in this zone
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PhotoCameraRoundedIcon />}
                      disabled={!image || detectMutation.isPending || visionDown}
                      onClick={() => detectMutation.mutate()}
                    >
                      {detectMutation.isPending ? 'Detecting…' : 'Detect occupancy'}
                    </Button>
                    {detectResult && (
                      <Button
                        variant="outlined"
                        startIcon={<CloudUploadRoundedIcon />}
                        disabled={pushMutation.isPending}
                        onClick={() => pushMutation.mutate()}
                      >
                        Push {detectResult.detections.length} occupancy event(s)
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              {!image && (
                <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
                  <Stack alignItems="center" spacing={1}>
                    <PhotoCameraRoundedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                    <Typography color="text.secondary">
                      Choose a photo of the parking area to begin.
                    </Typography>
                  </Stack>
                </Box>
              )}

              {image && (
                <Box sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={overlay ? `data:image/png;base64,${overlay}` : previewUrl ?? ''}
                    alt="parking analysis"
                    sx={{ width: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                  />
                </Box>
              )}

              {proposeResult && (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="primary" label={`${proposeResult.count} slots`} />
                    <Chip size="small" variant="outlined" label={`method: ${proposeResult.method}`} />
                    <Chip size="small" variant="outlined" label={proposeResult.note} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Importing creates PROPOSED spaces; verify or reject them from the zone view to
                    make them real.
                  </Typography>
                </Stack>
              )}

              {detectResult && (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip size="small" color="error" label={`${detectResult.occupied} occupied`} />
                    <Chip size="small" color="success" label={`${detectResult.vacant} vacant`} />
                    <Chip size="small" variant="outlined" label={`threshold ${detectResult.threshold}`} />
                  </Stack>
                  <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                    {detectResult.detections.map((detection) => (
                      <Stack
                        key={detection.slotId}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ py: 0.6, borderBottom: '1px solid', borderBottomColor: 'divider' }}
                      >
                        <Typography variant="body2" fontWeight={600}>
                          {detection.slotId}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            score {detection.score.toFixed(3)} · conf {detection.confidence.toFixed(2)} ·{' '}
                            {detection.method}
                          </Typography>
                          <Chip
                            size="small"
                            color={detection.state === 'OCCUPIED' ? 'error' : 'success'}
                            label={detection.state}
                          />
                        </Stack>
                      </Stack>
                    ))}
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
