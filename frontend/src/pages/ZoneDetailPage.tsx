import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import StatusChip from '../components/StatusChip'
import HoloLot from '../components/HoloLot'
import OperatorBaySheet from '../components/OperatorBaySheet'
import OccupancyStrip from '../components/OccupancyStrip'
import { toHoloLotBays } from '../utils/holoLotAdapter'
import { spacesApi, zonesApi } from '../api/parking'
import { occupancyApi } from '../api/occupancy'
import { apiErrorMessage, apiErrorStatus } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useConfirm } from '../hooks/useConfirm'
import { parsePositiveInt } from '../utils/format'
import ErrorState from '../components/ErrorState'
import NotFoundPage from './NotFoundPage'
import { useOccupancyStream } from '../hooks/useOccupancyStream'
import { useAppSelector } from '../store/hooks'
import type { OperationalState, ParkingSpace, VerificationStatus } from '../types'

interface SpaceFormState {
  id?: number
  code: string
  label: string
  positionX: string
  positionY: string
  polygon: string
  operationalState: OperationalState
  verificationStatus: VerificationStatus
}

const EMPTY_SPACE: SpaceFormState = {
  code: '',
  label: '',
  positionX: '',
  positionY: '',
  polygon: '',
  operationalState: 'IN_SERVICE',
  verificationStatus: 'VERIFIED',
}

const STATUS_BG: Record<string, string> = {
  AVAILABLE: 'rgba(34,197,94,0.16)',
  OCCUPIED: 'rgba(239,68,68,0.18)',
  RESERVED: 'rgba(245,158,11,0.18)',
  OUT_OF_SERVICE: 'rgba(100,116,139,0.22)',
}

export default function ZoneDetailPage() {
  const { zoneId } = useParams()
  const parsedId = parsePositiveInt(zoneId)
  const id = parsedId ?? 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const user = useAppSelector((state) => state.auth.user)
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<SpaceFormState>(EMPTY_SPACE)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuSpace, setMenuSpace] = useState<ParkingSpace | null>(null)
  const [confirm, confirmDialog] = useConfirm()
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [changed, setChanged] = useState<{ trigger: number; bayId: number | null }>({ trigger: 0, bayId: null })

  const enabled = parsedId !== null
  const zoneQuery = useQuery({ queryKey: queryKeys.zones.detail(id), queryFn: () => zonesApi.get(id), enabled })
  const occupancyQuery = useQuery({
    queryKey: queryKeys.zones.occupancy(id),
    queryFn: () => zonesApi.occupancy(id),
    enabled,
  })
  const spacesQuery = useQuery({ queryKey: queryKeys.spaces.list(id), queryFn: () => spacesApi.list(id), enabled })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.spaces.list(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.zones.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
  }

  useOccupancyStream((event) => {
    if (event.zoneId !== id) return
    setChanged((prev) => ({ trigger: prev.trigger + 1, bayId: event.spaceId }))
    invalidate()
  })

  const occupancyMutation = useMutation({
    mutationFn: (payload: { spaceId: number; state: 'OCCUPIED' | 'VACANT' }) =>
      occupancyApi.record({ spaceId: payload.spaceId, state: payload.state, source: 'MANUAL' }),
    onSuccess: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: SpaceFormState) => {
      const body = {
        zoneId: id,
        code: payload.code || null,
        label: payload.label || null,
        positionX: payload.positionX ? Number(payload.positionX) : null,
        positionY: payload.positionY ? Number(payload.positionY) : null,
        polygon: payload.polygon || null,
        operationalState: payload.operationalState,
        verificationStatus: payload.verificationStatus,
      }
      return payload.id ? spacesApi.update(payload.id, body) : spacesApi.create(body)
    },
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Space saved', { variant: 'success' })
      setDialogOpen(false)
      setForm(EMPTY_SPACE)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ spaceId, status }: { spaceId: number; status: VerificationStatus }) =>
      spacesApi.verify(spaceId, status),
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Verification updated', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const operationalStateMutation = useMutation({
    mutationFn: ({ spaceId, state }: { spaceId: number; state: OperationalState }) =>
      spacesApi.changeOperationalState(spaceId, state),
    onSuccess: () => {
      invalidate()
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (spaceId: number) => spacesApi.remove(spaceId),
    onSuccess: () => {
      invalidate()
      enqueueSnackbar('Space deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  if (parsedId === null || apiErrorStatus(zoneQuery.error) === 404) {
    return <NotFoundPage />
  }

  if (zoneQuery.isLoading || spacesQuery.isLoading) {
    return <LoadingState minHeight={400} />
  }

  if (zoneQuery.isError || spacesQuery.isError) {
    return (
      <ErrorState
        subtitle={apiErrorMessage(zoneQuery.error ?? spacesQuery.error)}
        onRetry={() => {
          zoneQuery.refetch()
          spacesQuery.refetch()
        }}
      />
    )
  }

  const zone = zoneQuery.data
  const spaces = spacesQuery.data ?? []
  const occupancy = occupancyQuery.data
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId) ?? null

  const openEdit = (space: ParkingSpace) => {
    setForm({
      id: space.id,
      code: space.code ?? '',
      label: space.label ?? '',
      positionX: space.positionX != null ? String(space.positionX) : '',
      positionY: space.positionY != null ? String(space.positionY) : '',
      polygon: space.polygon ?? '',
      operationalState: space.operationalState,
      verificationStatus: space.verificationStatus,
    })
    setDialogOpen(true)
    setMenuAnchor(null)
  }

  return (
    <div>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/zones')} sx={{ mb: 2, ml: -1, color: 'text.secondary' }}>
        Zones
      </Button>

      <PageHeader
        overline={zone?.siteName ?? undefined}
        title={zone?.name ?? 'Zone'}
        subtitle={`${zone?.code ?? ''} · ${zone?.floor ?? 'Ground'} · ${
          zone?.type === 'UNSTRUCTURED' ? 'Image-mapped area' : 'Structured'
        }`}
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setForm(EMPTY_SPACE)
                setDialogOpen(true)
              }}
            >
              Add space
            </Button>
          ) : undefined
        }
      />

      {occupancy ? <OccupancyStrip occupancy={occupancy} /> : null}

      {/* Operator mode: the same HoloLot scene, with per-bay actions. */}
      {spaces.length > 0 ? (
        <HoloLot
          siteId={zone?.siteId ?? 0}
          zoneId={id}
          zoneName={zone?.name}
          bays={toHoloLotBays(spaces)}
          selectedBayId={selectedSpaceId}
          onSelectBay={(bay) => setSelectedSpaceId(bay ? bay.id : null)}
          selectableStatuses={['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE']}
          sweepTrigger={changed.trigger}
          changedBayId={changed.bayId}
          height={460}
        />
      ) : null}

      {selectedSpace ? (
        <OperatorBaySheet
          space={selectedSpace}
          canManage={canManage}
          busy={occupancyMutation.isPending}
          onMarkOccupied={() =>
            occupancyMutation.mutate({ spaceId: selectedSpace.id, state: 'OCCUPIED' })
          }
          onMarkVacant={() => occupancyMutation.mutate({ spaceId: selectedSpace.id, state: 'VACANT' })}
          onOutOfService={async () => {
            const ok = await confirm({
              title: 'Take bay out of service?',
              message: `${selectedSpace.code ?? selectedSpace.id} will stop accepting bookings until it is returned to service.`,
              confirmLabel: 'Out of service',
            })
            if (ok) operationalStateMutation.mutate({ spaceId: selectedSpace.id, state: 'OUT_OF_SERVICE' })
          }}
          onClose={() => setSelectedSpaceId(null)}
        />
      ) : null}

      {spaces.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              No spaces in this zone yet. Add spaces manually, or (for unstructured areas) add
              proposed spaces to be verified.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {spaces.map((space) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={space.id}>
              <Card
                sx={{
                  bgcolor: STATUS_BG[space.status],
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ pb: '12px !important' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <SpaceIdentity code={space.code} label={space.label} />
                    {canManage && (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          setMenuAnchor(event.currentTarget)
                          setMenuSpace(space)
                        }}
                      >
                        <MoreVertRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  <Stack spacing={0.8} sx={{ mt: 1 }}>
                    <StatusChip kind="space" value={space.status} variant="filled" />
                    {space.verificationStatus !== 'VERIFIED' && (
                      <StatusChip kind="verification" value={space.verificationStatus} />
                    )}
                  </Stack>

                  {canManage && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                      <Tooltip title="Mark occupied">
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => occupancyMutation.mutate({ spaceId: space.id, state: 'OCCUPIED' })}
                          disabled={
                            space.occupancyState === 'OCCUPIED' || space.operationalState !== 'IN_SERVICE'
                          }
                          sx={{ minWidth: 0, px: 1 }}
                        >
                          In
                        </Button>
                      </Tooltip>
                      <Tooltip title="Mark vacant">
                        <Button
                          size="small"
                          color="success"
                          variant="outlined"
                          onClick={() => occupancyMutation.mutate({ spaceId: space.id, state: 'VACANT' })}
                          disabled={
                            space.occupancyState !== 'OCCUPIED' || space.operationalState !== 'IN_SERVICE'
                          }
                          sx={{ minWidth: 0, px: 1 }}
                        >
                          Out
                        </Button>
                      </Tooltip>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => menuSpace && openEdit(menuSpace)}>Edit space</MenuItem>
        {menuSpace?.verificationStatus === 'PROPOSED' ? (
          <>
            <MenuItem
              onClick={() => {
                if (menuSpace) verifyMutation.mutate({ spaceId: menuSpace.id, status: 'VERIFIED' })
                setMenuAnchor(null)
              }}
            >
              <VerifiedRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Verify
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (menuSpace) verifyMutation.mutate({ spaceId: menuSpace.id, status: 'REJECTED' })
                setMenuAnchor(null)
              }}
            >
              <CancelRoundedIcon fontSize="small" sx={{ mr: 1 }} />
              Reject
            </MenuItem>
          </>
        ) : (
          <MenuItem
            onClick={() => {
              if (menuSpace)
                operationalStateMutation.mutate({
                  spaceId: menuSpace.id,
                  state: menuSpace.operationalState === 'IN_SERVICE' ? 'OUT_OF_SERVICE' : 'IN_SERVICE',
                })
              setMenuAnchor(null)
            }}
          >
            {menuSpace?.operationalState !== 'IN_SERVICE' ? (
              <>
                <CheckCircleRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Restore service
              </>
            ) : (
              <>
                <BlockRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                Out of service
              </>
            )}
          </MenuItem>
        )}
        <MenuItem
          onClick={async () => {
            const target = menuSpace
            setMenuAnchor(null)
            if (
              target &&
              (await confirm({
                title: `Delete space ${target.code ?? ''}?`,
                message:
                  'The space is removed permanently. Spaces with occupancy history or bookings cannot be deleted - set them out of service instead.',
                confirmLabel: 'Delete',
              }))
            ) {
              deleteMutation.mutate(target.id)
            }
          }}
          sx={{ color: 'error.main' }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit space' : 'New parking space'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                fullWidth
                helperText="Leave blank to keep as proposed"
              />
              <TextField
                label="Label"
                value={form.label}
                onChange={(event) => setForm({ ...form, label: event.target.value })}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Position X"
                type="number"
                value={form.positionX}
                onChange={(event) => setForm({ ...form, positionX: event.target.value })}
                fullWidth
              />
              <TextField
                label="Position Y"
                type="number"
                value={form.positionY}
                onChange={(event) => setForm({ ...form, positionY: event.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Polygon"
              value={form.polygon}
              onChange={(event) => setForm({ ...form, polygon: event.target.value })}
              fullWidth
              helperText="e.g. [40,80 125,80 125,180 40,180] for irregular areas"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Operational state"
                value={form.operationalState}
                onChange={(event) =>
                  setForm({ ...form, operationalState: event.target.value as OperationalState })
                }
                fullWidth
              >
                {['IN_SERVICE', 'OUT_OF_SERVICE', 'MAINTENANCE'].map((state) => (
                  <MenuItem key={state} value={state}>
                    {state.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Verification"
                value={form.verificationStatus}
                onChange={(event) =>
                  setForm({ ...form, verificationStatus: event.target.value as VerificationStatus })
                }
                fullWidth
              >
                {['PROPOSED', 'VERIFIED', 'REJECTED'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {zone?.type === 'UNSTRUCTURED' && (
              <Chip size="small" label="Unstructured zone — use polygon + position" variant="outlined" />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </div>
  )
}

function SpaceIdentity({ code, label }: { code?: string | null; label?: string | null }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 600, letterSpacing: '0.03em' }}>
        {code ?? '—'}
      </div>
      {label ? <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div> : null}
    </div>
  )
}
