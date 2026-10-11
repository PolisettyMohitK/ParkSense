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
import { vehiclesApi, usersApi } from '../api/resources'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAppSelector } from '../store/hooks'
import { plateProblem } from '../utils/validation'
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
  const [confirm, confirmDialog] = useConfirm()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<VehicleForm>(EMPTY)

  const isStaff = useAppSelector((state) => state.auth.user?.role !== 'USER')
  const vehiclesQuery = useQuery({ queryKey: queryKeys.vehicles.list(), queryFn: () => vehiclesApi.list() })
  const usersQuery = useQuery({ queryKey: queryKeys.users.all, queryFn: () => usersApi.list(), enabled: isStaff })
  const plateError = form.plateNumber ? plateProblem(form.plateNumber) : null

  const saveMutation = useMutation({
    mutationFn: (payload: VehicleForm) => {
      const body = {
        // Drivers always own what they register; only staff choose an owner.
        ownerId: isStaff && payload.ownerId !== '' ? Number(payload.ownerId) : undefined,
        plateNumber: payload.plateNumber.trim(),
        make: payload.make || null,
        model: payload.model || null,
        color: payload.color || null,
        type: payload.type,
      }
      return payload.id ? vehiclesApi.update(payload.id, body) : vehiclesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      enqueueSnackbar('Vehicle saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      enqueueSnackbar('Vehicle removed', { variant: 'success' })
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
      ) : vehiclesQuery.isError ? (
        <ErrorState subtitle={apiErrorMessage(vehiclesQuery.error)} onRetry={() => vehiclesQuery.refetch()} />
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
                      <IconButton size="small" color="error" onClick={async () => {
                          if (await confirm({ title: 'Remove vehicle?', message: `${vehicle.plateNumber} will be removed. Vehicles used in past bookings are kept on record but hidden.`, confirmLabel: 'Delete' })) {
                            deleteMutation.mutate(vehicle.id)
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
        <DialogTitle>{form.id ? 'Edit vehicle' : 'New vehicle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isStaff && (
              <TextField
                select
                label="Owner"
                value={form.ownerId}
                onChange={(event) => setForm({ ...form, ownerId: Number(event.target.value) })}
                fullWidth
              >
                {(usersQuery.data ?? []).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName} · {user.email}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Plate number"
              value={form.plateNumber}
              onChange={(event) => setForm({ ...form, plateNumber: event.target.value.toUpperCase() })}
              fullWidth
              required
              error={Boolean(plateError)}
              helperText={plateError ?? 'e.g. TS09 AB 1234'}
              inputProps={{ maxLength: 30 }}
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
            disabled={!form.plateNumber.trim() || Boolean(plateError) || (isStaff && !form.ownerId) || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </Box>
  )
}
