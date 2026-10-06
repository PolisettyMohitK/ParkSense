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
import { organizationsApi } from '../api/parking'
import { apiErrorMessage } from '../api/client'
import type { Organization } from '../types'

interface OrgForm {
  id?: number
  name: string
  code: string
  contactEmail: string
  contactPhone: string
  address: string
  active: boolean
}

const EMPTY: OrgForm = { name: '', code: '', contactEmail: '', contactPhone: '', address: '', active: true }

export default function OrganizationsPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<OrgForm>(EMPTY)

  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const saveMutation = useMutation({
    mutationFn: (payload: OrgForm) => {
      const body = {
        name: payload.name,
        code: payload.code,
        contactEmail: payload.contactEmail || null,
        contactPhone: payload.contactPhone || null,
        address: payload.address || null,
        active: payload.active,
      }
      return payload.id ? organizationsApi.update(payload.id, body) : organizationsApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      enqueueSnackbar('Organization saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => organizationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      enqueueSnackbar('Organization deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const edit = (org: Organization) => {
    setForm({
      id: org.id,
      name: org.name,
      code: org.code,
      contactEmail: org.contactEmail ?? '',
      contactPhone: org.contactPhone ?? '',
      address: org.address ?? '',
      active: org.active,
    })
    setOpen(true)
  }

  const orgs = orgsQuery.data ?? []

  return (
    <Box>
      <PageHeader
        title="Organizations"
        subtitle="Top-level tenants owning sites, zones and users."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
            New organization
          </Button>
        }
      />

      {orgsQuery.isLoading ? (
        <LoadingState />
      ) : orgs.length === 0 ? (
        <EmptyState title="No organizations" />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{org.name}</TableCell>
                  <TableCell>{org.code}</TableCell>
                  <TableCell>{org.contactEmail ?? '—'}</TableCell>
                  <TableCell>{org.address ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={org.active ? 'Active' : 'Inactive'} color={org.active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => edit(org)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(org.id)}>
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
        <DialogTitle>{form.id ? 'Edit organization' : 'New organization'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Contact email"
                value={form.contactEmail}
                onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                fullWidth
              />
              <TextField
                label="Contact phone"
                value={form.contactPhone}
                onChange={(event) => setForm({ ...form, contactPhone: event.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              fullWidth
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
            disabled={!form.name || !form.code || saveMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
