import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Box, Button, Card, CardContent, Grid, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import ActiveStayCard from '../components/ActiveStayCard'
import { changePassword, updateProfile } from '../api/auth'
import { mySessionsApi } from '../api/sessions'
import { apiErrorMessage } from '../api/client'
import { queryKeys } from '../api/queryKeys'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setUser } from '../store/authSlice'
import { useStayActions } from '../hooks/useStayActions'
import { MIN_PASSWORD_LENGTH, passwordProblem, phoneProblem } from '../utils/validation'
import { formatMoney } from '../utils/format'

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user)
  const isDriver = user?.role === 'USER'

  return (
    <Box>
      <PageHeader title="Profile" subtitle="Your details, password and parking payments." />
      {isDriver && <ActiveStayCard />}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DetailsCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <PasswordCard />
        </Grid>
        <Grid item xs={12}>
          <DuesCard />
        </Grid>
      </Grid>
    </Box>
  )
}

function DetailsCard() {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const { enqueueSnackbar } = useSnackbar()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  useEffect(() => {
    setFullName(user?.fullName ?? '')
    setPhone(user?.phone ?? '')
  }, [user?.fullName, user?.phone])

  const phoneError = phoneProblem(phone)
  const save = useMutation({
    mutationFn: () => updateProfile({ fullName: fullName.trim(), phone: phone.trim() || null }),
    onSuccess: (updated) => {
      dispatch(setUser(updated))
      enqueueSnackbar('Profile updated', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })
  const dirty = fullName.trim() !== (user?.fullName ?? '') || phone.trim() !== (user?.phone ?? '')

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Your details
        </Typography>
        <Stack spacing={2}>
          <TextField label="Email" value={user?.email ?? ''} disabled fullWidth helperText="Contact an admin to change your email" />
          <TextField
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 120 }}
          />
          <TextField
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            fullWidth
            error={Boolean(phoneError)}
            helperText={phoneError ?? ' '}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {user?.role === 'USER' ? 'Driver account' : `${user?.role?.toLowerCase()} account`}
              {user?.organizationName ? ` · ${user.organizationName}` : ''}
            </Typography>
            <Button
              variant="contained"
              disabled={!dirty || !fullName.trim() || Boolean(phoneError) || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function PasswordCard() {
  const { enqueueSnackbar } = useSnackbar()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const problem = touched ? passwordProblem(next, confirm) : null

  const change = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: () => {
      setCurrent('')
      setNext('')
      setConfirm('')
      setTouched(false)
      enqueueSnackbar('Password changed', { variant: 'success' })
    },
    onError: (error) => enqueueSnackbar(apiErrorMessage(error), { variant: 'error' }),
  })

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Change password
        </Typography>
        <Stack
          spacing={2}
          component="form"
          onSubmit={(event) => {
            event.preventDefault()
            setTouched(true)
            if (current && !passwordProblem(next, confirm)) change.mutate()
          }}
        >
          <TextField
            label="Current password"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            fullWidth
          />
          <TextField
            label="New password"
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
            helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
            fullWidth
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            error={Boolean(problem)}
            helperText={problem ?? ' '}
            fullWidth
          />
          <Box sx={{ textAlign: 'right' }}>
            <Button type="submit" variant="contained" disabled={!current || !next || change.isPending}>
              {change.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

function DuesCard() {
  const user = useAppSelector((state) => state.auth.user)
  const query = useQuery({ queryKey: queryKeys.mySessions.all, queryFn: mySessionsApi.list, enabled: user?.role === 'USER' })
  const { openPayment, paymentDialog } = useStayActions()
  if (user?.role !== 'USER') return null

  const stays = query.data ?? []
  const due = stays.filter((stay) => stay.paymentStatus === 'PENDING')
  const paid = stays.filter((stay) => stay.paymentStatus === 'PAID')
  const totalPaid = paid.reduce((sum, stay) => sum + (stay.amount ?? 0), 0)

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
          <Typography variant="h6">Payments</Typography>
          <Typography variant="body2" color="text.secondary">
            {paid.length} paid · {formatMoney(totalPaid)} total
          </Typography>
        </Stack>
        {query.isError && <Alert severity="error">{apiErrorMessage(query.error)}</Alert>}
        {due.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You are all settled - nothing to pay.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {due.map((stay) => (
              <Stack
                key={stay.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}
              >
                <Box>
                  <Typography fontWeight={600}>{stay.siteName ?? stay.zoneName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bay {stay.spaceCode} · {stay.code}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <StatusChip kind="payment" value="PENDING" />
                  <Typography fontWeight={700}>{formatMoney(stay.amount)}</Typography>
                  <Button variant="contained" size="small" onClick={() => openPayment(stay)}>
                    Pay
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
      {paymentDialog}
    </Card>
  )
}
