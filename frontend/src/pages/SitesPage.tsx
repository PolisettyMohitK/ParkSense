import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
  InputAdornment,
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
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { organizationsApi, sitesApi } from '../api/parking'
import { AMENITY_LABEL, CATEGORY_LABEL } from '../api/places'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAppSelector } from '../store/hooks'
import { useConfirm } from '../hooks/useConfirm'
import { coordinateProblem } from '../utils/validation'
import { formatMoney } from '../utils/format'
import type { ParkingSite, PlaceCategory } from '../types'

interface SiteForm {
  id?: number
  organizationId: number | ''
  name: string
  code: string
  address: string
  city: string
  latitude: string
  longitude: string
  category: PlaceCategory | ''
  hourlyRate: string
  openingHours: string
  amenities: string[]
  description: string
  coverImageUrl: string
  active: boolean
}

const EMPTY: SiteForm = {
  organizationId: '',
  name: '',
  code: '',
  address: '',
  city: 'Hyderabad',
  latitude: '',
  longitude: '',
  category: '',
  hourlyRate: '',
  openingHours: '',
  amenities: [],
  description: '',
  coverImageUrl: '',
  active: true,
}

const AMENITIES = Object.keys(AMENITY_LABEL)

function toForm(site: ParkingSite): SiteForm {
  return {
    id: site.id,
    organizationId: site.organizationId,
    name: site.name,
    code: site.code,
    address: site.address ?? '',
    city: site.city ?? '',
    latitude: site.latitude != null ? String(site.latitude) : '',
    longitude: site.longitude != null ? String(site.longitude) : '',
    category: site.category ?? '',
    hourlyRate: site.hourlyRate != null && Number(site.hourlyRate) > 0 ? String(site.hourlyRate) : '',
    openingHours: site.openingHours ?? '',
    amenities: (site.amenities ?? '').split(',').map((value) => value.trim()).filter(Boolean),
    description: site.description ?? '',
    coverImageUrl: site.coverImageUrl ?? '',
    active: site.active,
  }
}

export default function SitesPage() {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<SiteForm>(EMPTY)
  const [confirm, confirmDialog] = useConfirm()

  const sitesQuery = useQuery({ queryKey: queryKeys.sites.list(), queryFn: () => sitesApi.list() })
  const orgsQuery = useQuery({ queryKey: queryKeys.organizations.all, queryFn: () => organizationsApi.list() })

  const latError = coordinateProblem(form.latitude, 'lat')
  const lngError = coordinateProblem(form.longitude, 'lng')
  const rateError =
    form.hourlyRate.trim() !== '' && !(Number(form.hourlyRate) >= 0 && Number(form.hourlyRate) < 1_000_000)
      ? 'Enter a valid amount'
      : null

  const saveMutation = useMutation({
    mutationFn: (payload: SiteForm) => {
      const body = {
        organizationId: Number(payload.organizationId),
        name: payload.name.trim(),
        code: payload.code.trim(),
        address: payload.address.trim(),
        city: payload.city.trim(),
        latitude: payload.latitude ? Number(payload.latitude) : null,
        longitude: payload.longitude ? Number(payload.longitude) : null,
        category: payload.category || null,
        // 0 means complimentary; sending it (rather than null) lets an edit switch a paid site to free.
        hourlyRate: payload.hourlyRate.trim() === '' ? 0 : Number(payload.hourlyRate),
        openingHours: payload.openingHours.trim(),
        amenities: payload.amenities.join(','),
        description: payload.description.trim(),
        coverImageUrl: payload.coverImageUrl.trim(),
        active: payload.active,
      }
      return payload.id ? sitesApi.update(payload.id, body) : sitesApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      enqueueSnackbar('Site saved', { variant: 'success' })
      setOpen(false)
      setForm(EMPTY)
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sitesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all })
      enqueueSnackbar('Site deleted', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  const sites = sitesQuery.data ?? []
  const canSave =
    Boolean(form.name.trim() && form.code.trim() && form.organizationId) &&
    !latError &&
    !lngError &&
    !rateError &&
    !saveMutation.isPending

  return (
    <div>
      <PageHeader
        title="Parking sites"
        subtitle="Venues drivers can find on Explore: location, tariff and amenities."
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
      ) : sitesQuery.isError ? (
        <ErrorState subtitle={apiErrorMessage(sitesQuery.error)} onRetry={() => sitesQuery.refetch()} />
      ) : sites.length === 0 ? (
        <EmptyState title="No parking sites" subtitle="Create a site to start mapping zones and spaces." />
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Tariff</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {site.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {site.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{site.category ? CATEGORY_LABEL[site.category] : '—'}</TableCell>
                  <TableCell>{site.organizationName}</TableCell>
                  <TableCell>{site.city ?? '—'}</TableCell>
                  <TableCell>
                    {site.hourlyRate && Number(site.hourlyRate) > 0 ? `${formatMoney(Number(site.hourlyRate))}/h` : 'Free'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={site.active ? 'success' : 'default'}
                      label={site.active ? 'Listed' : 'Hidden'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="2.5D surveys">
                      <IconButton size="small" component={RouterLink} to={`/admin/sites/${site.id}/surveys`}>
                        <ViewInArRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setForm(toForm(site))
                          setOpen(true)
                        }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {isAdmin && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Delete ${site.name}?`,
                                message:
                                  'The site is removed permanently. Sites that still have zones cannot be deleted - hide them instead by switching off "Listed".',
                                confirmLabel: 'Delete site',
                              })
                            ) {
                              deleteMutation.mutate(site.id)
                            }
                          }}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={fullScreen}>
        <DialogTitle>{form.id ? 'Edit site' : 'New parking site'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
              <TextField
                select
                label="Category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as PlaceCategory })}
                fullWidth
              >
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                fullWidth
                required
                inputProps={{ maxLength: 150 }}
              />
              <TextField
                label="Code"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                fullWidth
                required
                inputProps={{ maxLength: 50 }}
                helperText="Unique within the organization"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Address"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                fullWidth
                inputProps={{ maxLength: 255 }}
              />
              <TextField
                label="City"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
                fullWidth
                inputProps={{ maxLength: 100 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Latitude"
                value={form.latitude}
                onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                fullWidth
                error={Boolean(latError)}
                helperText={latError ?? 'e.g. 17.4325'}
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                label="Longitude"
                value={form.longitude}
                onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                fullWidth
                error={Boolean(lngError)}
                helperText={lngError ?? 'e.g. 78.4072'}
                inputProps={{ inputMode: 'decimal' }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Hourly rate"
                value={form.hourlyRate}
                onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })}
                fullWidth
                error={Boolean(rateError)}
                helperText={rateError ?? 'Leave empty for complimentary parking'}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                label="Opening hours"
                value={form.openingHours}
                onChange={(event) => setForm({ ...form, openingHours: event.target.value })}
                fullWidth
                placeholder="10:00 AM – 11:00 PM"
                inputProps={{ maxLength: 60 }}
              />
            </Stack>
            <TextField
              select
              label="Amenities"
              value={form.amenities}
              onChange={(event) => {
                const value = event.target.value as unknown as string[] | string
                setForm({ ...form, amenities: typeof value === 'string' ? value.split(',') : value })
              }}
              SelectProps={{
                multiple: true,
                renderValue: (selected) => (selected as string[]).map((key) => AMENITY_LABEL[key] ?? key).join(', '),
              }}
              fullWidth
            >
              {AMENITIES.map((key) => (
                <MenuItem key={key} value={key}>
                  {AMENITY_LABEL[key]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
              helperText={`${form.description.length}/500`}
            />
            <TextField
              label="Cover image URL"
              value={form.coverImageUrl}
              onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
              fullWidth
              placeholder="/places/inorbit.jpg or https://…"
              inputProps={{ maxLength: 255 }}
            />
            <FormControlLabel
              control={
                <Switch checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              }
              label="Listed on Explore and open for bookings"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)} disabled={!canSave}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      {confirmDialog}
    </div>
  )
}
