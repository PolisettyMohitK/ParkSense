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
import { vehiclesApi, usersApi } from '../api/resources'
import { apiErrorMessage } from '../api/client'
import type { Vehicle, VehicleType } from '../types'

const TYPES: VehicleType[] = ['CAR', 'BIKE', 'SUV', 'TRUCK', 'EV', 'OTHER']

interface VehicleForm {
  id?: number
  ownerId: number | ''
  plateNumber: string
  make: string
  model: string
  color: string
  type: VehicleType
}

const EMPTY: VehicleForm = { ownerId: '', plateNumber: '', make: '', model: '', color: '', type: 'CAR' }

export default function VehiclesPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<VehicleForm>(EMPTY)

  const vehiclesQuery = useQuery({ queryKey: ['vehicles'], queryFn: () => vehiclesApi.list() })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })

  const saveMutation = useMutation({
    mutationFn: (payload: VehicleForm) => {
      const body = {
        ownerId: Number(payload.ownerId),
        plateNumber: payload.plateNumber,
        make: payload.make || null,
        model: payload.model || null,
        color: payload.color || null,
        type: payload.type,
      }
      return payload.id ? vehiclesApi.update(payload.id, body) : vehiclesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      enqueueSnackbar('Vehicle saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      enqueueSnackbar('Vehicle deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const edit = (vehicle: Vehicle) => {
    setForm({
      id: vehicle.id,
      ownerId: vehicle.ownerId,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      color: vehicle.color ?? '',
      type: vehicle.type,
    })
    setOpen(true)
  }

  const vehicles = vehiclesQuery.data ?? []

  return (
    <Box>
      <PageHeader
        title="Vehicles"
        subtitle="Registered vehicles and their owners."
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setForm({ ...EMPTY, ownerId: usersQuery.data?.[0]?.id ?? '' })
              setOpen(true)
            }}
          >
            New vehicle
          </Button>
        }
      />

      {vehiclesQuery.isLoading ? (
        <LoadingState />
      ) : vehicles.length === 0 ? (
        <EmptyState title="No vehicles" subtitle="Register a vehicle to use it in reservations." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Plate</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Make / model</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{vehicle.plateNumber}</TableCell>
                  <TableCell>{vehicle.ownerName}</TableCell>
                  <TableCell>
                    {vehicle.make} {vehicle.model}
                  </TableCell>
                  <TableCell>{vehicle.color ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={vehicle.type} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => edit(vehicle)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(vehicle.id)}>
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
        <DialogTitle>{form.id ? 'Edit vehicle' : 'New vehicle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Owner"
              value={form.ownerId}
              onChange={(event) => setForm({ ...form, ownerId: Number(event.target.value) })}
              fullWidth
            >
              {(usersQuery.data ?? []).map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.fullName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Plate number"
              value={form.plateNumber}
              onChange={(event) => setForm({ ...form, plateNumber: event.target.value })}
              fullWidth
              required
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Make"
                value={form.make}
                onChange={(event) => setForm({ ...form, make: event.target.value })}
                fullWidth
              />
              <TextField
                label="Model"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                fullWidth
              />
              <TextField
                select
                label="Type"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as VehicleType })}
                fullWidth
              >
                {TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.plateNumber || !form.ownerId || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
