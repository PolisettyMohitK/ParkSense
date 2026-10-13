import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  CardActionArea,
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
  TextField,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { useSnackbar } from 'notistack'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { NumericReadout } from '../components/Stark'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import ConfirmDialog from '../components/ConfirmDialog'
import { sitesApi, zonesApi } from '../api/parking'
import { apiErrorMessage } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { ParkingZone, ZoneType } from '../types'

interface ZoneFormState {
  id?: number
  siteId: number | ''
  name: string
  code: string
  type: ZoneType
  floor: string
  capacity: string
  mapImageUrl: string
  description: string
  active: boolean
}

const EMPTY_FORM: ZoneFormState = {
  siteId: '',
  name: '',
  code: '',
  type: 'STRUCTURED',
  floor: '',
  capacity: '',
  mapImageUrl: '',
  description: '',
  active: true,
}

export default function ZonesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const user = useAppSelector((state) => state.auth.user)
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ZoneFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ParkingZone | null>(null)

  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })
  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: () => sitesApi.list() })

  const saveMutation = useMutation({
    mutationFn: async (payload: ZoneFormState) => {
      const body = {
        siteId: Number(payload.siteId),
        name: payload.name,
        code: payload.code,
        type: payload.type,
        floor: payload.floor || null,
        capacity: payload.capacity ? Number(payload.capacity) : null,
        mapImageUrl: payload.mapImageUrl || null,
        description: payload.description || null,
        active: payload.active,
      }
      return payload.id ? zonesApi.update(payload.id, body) : zonesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      enqueueSnackbar('Zone saved', { variant: 'success' })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => zonesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      enqueueSnackbar('Zone deleted', { variant: 'success' })
      setDeleteTarget(null)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, siteId: sitesQuery.data?.[0]?.id ?? '' })
    setDialogOpen(true)
  }

  const openEdit = (zone: ParkingZone) => {
    setForm({
      id: zone.id,
      siteId: zone.siteId,
      name: zone.name,
      code: zone.code,
      type: zone.type,
      floor: zone.floor ?? '',
      capacity: zone.capacity ? String(zone.capacity) : '',
      mapImageUrl: zone.mapImageUrl ?? '',
      description: zone.description ?? '',
      active: zone.active,
    })
    setDialogOpen(true)
  }

  const zones = zonesQuery.data ?? []

  return (
    <div>
      <PageHeader
        overline="Operations"
        title="Parking zones"
        subtitle="Structured bays and image-mapped areas across your sites."
        action={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={openCreate}
              disabled={!sitesQuery.data?.length}
            >
              New zone
            </Button>
          ) : undefined
        }
      />

      {zonesQuery.isLoading ? (
        <LoadingState />
      ) : zonesQuery.isError ? (
        <ErrorState subtitle={apiErrorMessage(zonesQuery.error)} onRetry={() => zonesQuery.refetch()} />
      ) : zones.length === 0 ? (
        <EmptyState
          title="No parking zones yet"
          subtitle="Create your first structured or unstructured zone to start tracking occupancy."
          action={
            canManage && sitesQuery.data?.length ? { label: 'Create zone', onClick: openCreate } : undefined
          }
        />
      ) : (
        <Grid container spacing={2.5}>
          {zones.map((zone, index) => {
            const rate = zone.totalSpaces === 0 ? 0 : (zone.occupiedSpaces / zone.totalSpaces) * 100
            return (
              <Grid item xs={12} sm={6} lg={4} key={zone.id}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={() => navigate(`/zones/${zone.id}`)}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <ZoneIdentity zone={zone} />
                          <Chip
                            size="small"
                            label={zone.type === 'STRUCTURED' ? 'Structured' : 'Unstructured'}
                            color={zone.type === 'STRUCTURED' ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                        </Stack>

                        <ZoneCounts zone={zone} />

                        <LinearProgress
                          variant="determinate"
                          value={rate}
                          sx={{ mt: 2, height: 8, borderRadius: 4 }}
                          color={rate > 80 ? 'error' : rate > 55 ? 'warning' : 'success'}
                        />
                      </CardContent>
                    </CardActionArea>
                    {canManage && (
                      <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pb: 1 }}>
                        <Button
                          size="small"
                          startIcon={<EditRoundedIcon />}
                          onClick={(event) => {
                            event.stopPropagation()
                            openEdit(zone)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<DeleteOutlineRoundedIcon />}
                          onClick={() => setDeleteTarget(zone)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    )}
                  </Card>
                </motion.div>
              </Grid>
            )
          })}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit zone' : 'New parking zone'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Site"
              value={form.siteId}
              onChange={(event) => setForm({ ...form, siteId: Number(event.target.value) })}
              fullWidth
              required
            >
              {(sitesQuery.data ?? []).map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                fullWidth
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as ZoneType })}
                fullWidth
              >
                <MenuItem value="STRUCTURED">Structured</MenuItem>
                <MenuItem value="UNSTRUCTURED">Unstructured (image-mapped)</MenuItem>
              </TextField>
              <TextField
                label="Capacity"
                type="number"
                value={form.capacity}
                onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Floor / level"
              value={form.floor}
              onChange={(event) => setForm({ ...form, floor: event.target.value })}
              fullWidth
            />
            <TextField
              label="Map image URL"
              value={form.mapImageUrl}
              onChange={(event) => setForm({ ...form, mapImageUrl: event.target.value })}
              fullWidth
              helperText="Used for image-assisted mapping of unstructured areas"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.name || !form.code || !form.siteId || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete zone"
        message={`Delete ${deleteTarget?.name}? Spaces and history in this zone will be affected.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function ZoneIdentity({ zone }: { zone: ParkingZone }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>{zone.name}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        {zone.siteName} · {zone.code}
      </div>
    </div>
  )
}

function ZoneCounts({ zone }: { zone: ParkingZone }) {
  return (
    <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
      <ZoneCount label="spaces" value={zone.totalSpaces} />
      <ZoneCount label="occupied" value={zone.occupiedSpaces} tint="var(--color-status-occupied)" />
      <ZoneCount label="available" value={zone.availableSpaces} tint="var(--color-status-free)" />
    </Stack>
  )
}

function ZoneCount({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div>
      <NumericReadout value={value} size={22} color={tint} />
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
    </div>
  )
}
