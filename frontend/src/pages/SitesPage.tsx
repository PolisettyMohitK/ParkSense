import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
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
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import { organizationsApi, sitesApi } from '../api/parking'
import { apiErrorMessage } from '../api/client'
import type { ParkingSite } from '../types'

interface SiteForm {
  id?: number
  organizationId: number | ''
  name: string
  code: string
  address: string
  city: string
  latitude: string
  longitude: string
}

const EMPTY: SiteForm = {
  organizationId: '',
  name: '',
  code: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
}

export default function SitesPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SiteForm>(EMPTY)

  const sitesQuery = useQuery({ queryKey: ['sites'], queryFn: () => sitesApi.list() })
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const saveMutation = useMutation({
    mutationFn: (payload: SiteForm) => {
      const body = {
        organizationId: Number(payload.organizationId),
        name: payload.name,
        code: payload.code,
        address: payload.address || null,
        city: payload.city || null,
        latitude: payload.latitude ? Number(payload.latitude) : null,
        longitude: payload.longitude ? Number(payload.longitude) : null,
      }
      return payload.id ? sitesApi.update(payload.id, body) : sitesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      enqueueSnackbar('Site saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sitesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] })
      enqueueSnackbar('Site deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const edit = (site: ParkingSite) => {
    setForm({
      id: site.id,
      organizationId: site.organizationId,
      name: site.name,
      code: site.code,
      address: site.address ?? '',
      city: site.city ?? '',
      latitude: site.latitude != null ? String(site.latitude) : '',
      longitude: site.longitude != null ? String(site.longitude) : '',
    })
    setOpen(true)
  }

  const sites = sitesQuery.data ?? []

  return (
    <Box>
      <PageHeader
        title="Parking sites"
        subtitle="Physical locations belonging to an organization."
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setForm({ ...EMPTY, organizationId: orgsQuery.data?.[0]?.id ?? '' })
              setOpen(true)
            }}
          >
            New site
          </Button>
        }
      />

      {sitesQuery.isLoading ? (
        <LoadingState />
      ) : sites.length === 0 ? (
        <EmptyState title="No parking sites" />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Coordinates</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{site.name}</TableCell>
                  <TableCell>{site.code}</TableCell>
                  <TableCell>{site.organizationName}</TableCell>
                  <TableCell>{site.city ?? '—'}</TableCell>
                  <TableCell>
                    {site.latitude != null && site.longitude != null
                      ? `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}`
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="2.5D Surveys">
                      <IconButton size="small" component={RouterLink} to={`/admin/sites/${site.id}/surveys`}>
                        <ViewInArRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => edit(site)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(site.id)}>
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
        <DialogTitle>{form.id ? 'Edit site' : 'New parking site'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Organization"
              value={form.organizationId}
              onChange={(event) => setForm({ ...form, organizationId: Number(event.target.value) })}
              fullWidth
              required
            >
              {(orgsQuery.data ?? []).map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
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
            <TextField
              label="Address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="City"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                fullWidth
              />
              <TextField
                label="Latitude"
                type="number"
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                fullWidth
              />
              <TextField
                label="Longitude"
                type="number"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                fullWidth
              />
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
            disabled={!form.name || !form.code || !form.organizationId || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
