import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
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
import { isEmail } from '../utils/validation'
import { usersApi } from '../api/resources'
import { organizationsApi } from '../api/parking'
import { apiErrorMessage } from '../api/client'
import type { Role, User } from '../types'

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'USER']

interface UserForm {
  id?: number
  fullName: string
  email: string
  password: string
  role: Role
  phone: string
  enabled: boolean
  organizationId: number | ''
}

const EMPTY: UserForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'USER',
  phone: '',
  enabled: true,
  organizationId: '',
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [confirm, confirmDialog] = useConfirm()
  const { enqueueSnackbar } = useSnackbar()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<UserForm>(EMPTY)

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: () => organizationsApi.list() })

  const saveMutation = useMutation({
    mutationFn: (payload: UserForm) => {
      const body: Record<string, unknown> = {
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        phone: payload.phone || null,
        enabled: payload.enabled,
        organizationId: payload.organizationId === '' ? null : Number(payload.organizationId),
      }
      if (payload.password) body.password = payload.password
      return payload.id ? usersApi.update(payload.id, body) : usersApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('User saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      enqueueSnackbar('User deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const edit = (user: User) => {
    setForm({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone ?? '',
      enabled: user.enabled,
      organizationId: user.organizationId ?? '',
    })
    setOpen(true)
  }

  const users = usersQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage accounts, roles and organization membership."
        action={
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => {
              setForm(EMPTY)
              setOpen(true)
            }}
          >
            New user
          </Button>
        }
      />

      {usersQuery.isLoading ? (
        <LoadingState />
      ) : usersQuery.isError ? (
        <ErrorState subtitle={apiErrorMessage(usersQuery.error)} onRetry={() => usersQuery.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState title="No users" />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={user.role}
                      color={user.role === 'ADMIN' ? 'secondary' : user.role === 'MANAGER' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{user.organizationName ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={user.enabled ? 'Active' : 'Disabled'}
                      color={user.enabled ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => edit(user)}>
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={async () => {
                          if (await confirm({ title: 'Delete user?', message: `${user.fullName} (${user.email}) will be removed. Users with bookings or vehicles cannot be deleted - disable them instead.`, confirmLabel: 'Delete' })) {
                            deleteMutation.mutate(user.id)
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
        <DialogTitle>{form.id ? 'Edit user' : 'New user'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full name"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              fullWidth
              required
              error={form.email.length > 0 && !isEmail(form.email)}
              helperText={form.email.length > 0 && !isEmail(form.email) ? 'Enter a valid email address' : ' '}
            />
            <TextField
              label={form.id ? 'New password (optional)' : 'Password'}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              fullWidth
              helperText={form.id ? 'Leave blank to keep current password' : 'At least 6 characters'}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                fullWidth
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              select
              label="Organization"
              value={form.organizationId}
              onChange={(event) => setForm({ ...form, organizationId: Number(event.target.value) })}
              fullWidth
            >
              <MenuItem value="">None</MenuItem>
              {(orgsQuery.data ?? []).map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                />
              }
              label="Account enabled"
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
            disabled={
              !form.fullName ||
              !isEmail(form.email) ||
              (!form.id && form.password.length < 6) ||
              (form.password.length > 0 && form.password.length < 6) ||
              saveMutation.isPending
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </div>
  )
}
