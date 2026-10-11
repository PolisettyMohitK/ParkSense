import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { useConfirm } from '../hooks/useConfirm'
import StatusChip from '../components/StatusChip'
import { devicesApi } from '../api/resources'
import { zonesApi } from '../api/parking'
import { apiErrorMessage } from '../api/client'
import type { DeviceStatus, DeviceType, MonitoringDevice } from '../types'

const DEVICE_TYPES: DeviceType[] = ['CAMERA', 'SENSOR', 'MANUAL']
const DEVICE_STATUSES: DeviceStatus[] = ['ONLINE', 'OFFLINE', 'MAINTENANCE']

interface DeviceForm {
  id?: number
  zoneId: number | ''
  name: string
  code: string
  type: DeviceType
  status: DeviceStatus
  identifier: string
  streamUrl: string
}

const EMPTY: DeviceForm = {
  zoneId: '',
  name: '',
  code: '',
  type: 'CAMERA',
  status: 'OFFLINE',
  identifier: '',
  streamUrl: '',
}

export default function DevicesPage() {
  const queryClient = useQueryClient()
  const [confirm, confirmDialog] = useConfirm()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DeviceForm>(EMPTY)

  const devicesQuery = useQuery({ queryKey: ['devices'], queryFn: () => devicesApi.list() })
  const zonesQuery = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.list() })

  const saveMutation = useMutation({
    mutationFn: (payload: DeviceForm) => {
      const body = {
        zoneId: Number(payload.zoneId),
        name: payload.name,
        code: payload.code,
        type: payload.type,
        status: payload.status,
        identifier: payload.identifier || null,
        streamUrl: payload.streamUrl || null,
      }
      return payload.id ? devicesApi.update(payload.id, body) : devicesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      enqueueSnackbar('Device saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => devicesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      enqueueSnackbar('Device deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const edit = (device: MonitoringDevice) => {
    setForm({
      id: device.id,
      zoneId: device.zoneId,
      name: device.name,
      code: device.code,
      type: device.type,
      status: device.status,
      identifier: device.identifier ?? '',
      streamUrl: device.streamUrl ?? '',
    })
    setOpen(true)
  }

  const devices = devicesQuery.data ?? []

  return (
    <Box>
      <PageHeader
        title="Monitoring devices"
        subtitle="Cameras and sensors feeding occupancy events into a zone."
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setForm({ ...EMPTY, zoneId: zonesQuery.data?.[0]?.id ?? '' })
              setOpen(true)
            }}
          >
            New device
          </Button>
        }
      />

      {devicesQuery.isLoading ? (
        <LoadingState />
      ) : devicesQuery.isError ? (
        <ErrorState subtitle={apiErrorMessage(devicesQuery.error)} onRetry={() => devicesQuery.refetch()} />
      ) : devices.length === 0 ? (
        <EmptyState title="No devices" subtitle="Register a camera or sensor to attach it to a zone." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Zone</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{device.name}</TableCell>
                  <TableCell>{device.code}</TableCell>
                  <TableCell>{device.zoneName}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={device.type} />
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="device" value={device.status} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => edit(device)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={async () => {
                          if (await confirm({ title: 'Delete device?', message: `${device.name} (${device.code}) will be removed. Devices with recorded events cannot be deleted - deactivate them instead.`, confirmLabel: 'Delete' })) {
                            deleteMutation.mutate(device.id)
                          }
                        }}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{form.id ? 'Edit device' : 'New monitoring device'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Zone"
              value={form.zoneId}
              onChange={(event) => setForm({ ...form, zoneId: Number(event.target.value) })}
              fullWidth
              required
            >
              {(zonesQuery.data ?? []).map((zone) => (
                <MenuItem key={zone.id} value={zone.id}>
                  {zone.name} ({zone.code})
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
                onChange={(event) => setForm({ ...form, type: event.target.value as DeviceType })}
                fullWidth
              >
                {DEVICE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as DeviceStatus })}
                fullWidth
              >
                {DEVICE_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Identifier / serial"
              value={form.identifier}
              onChange={(event) => setForm({ ...form, identifier: event.target.value })}
              fullWidth
            />
            <TextField
              label="Stream URL"
              value={form.streamUrl}
              onChange={(event) => setForm({ ...form, streamUrl: event.target.value })}
              fullWidth
              helperText="Placeholder for future camera integration"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.name || !form.code || !form.zoneId || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </Box>
  )
}
