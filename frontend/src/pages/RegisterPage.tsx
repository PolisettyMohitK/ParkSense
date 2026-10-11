import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { motion } from 'framer-motion'
import { register } from '../api/auth'
import { apiErrorMessage } from '../api/client'
import { useAppDispatch } from '../store/hooks'
import { MIN_PASSWORD_LENGTH, isEmail, passwordProblem, phoneProblem } from '../utils/validation'
import { setCredentials } from '../store/authSlice'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', phone: '' })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const emailError = touched && !isEmail(form.email) ? 'Enter a valid email address' : null
  const passwordError = touched ? passwordProblem(form.password, form.confirm) : null
  const phoneError = touched ? phoneProblem(form.phone) : null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!form.fullName.trim() || !isEmail(form.email) || passwordProblem(form.password, form.confirm) || phoneProblem(form.phone)) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      })
      dispatch(setCredentials({ token: result.token, user: result.user, expiresInMs: result.expiresInMs }))
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 460 }}>
          <Typography variant="h4" fontWeight={700}>
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find and book parking across Hyderabad in seconds.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.2}>
              <TextField label="Full name" value={form.fullName} onChange={update('fullName')} required fullWidth />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                fullWidth
                autoComplete="email"
                error={Boolean(emailError)}
                helperText={emailError ?? ' '}
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                fullWidth
                autoComplete="new-password"
                helperText={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
              <TextField
                label="Confirm password"
                type="password"
                value={form.confirm}
                onChange={update('confirm')}
                required
                fullWidth
                autoComplete="new-password"
                error={Boolean(passwordError)}
                helperText={passwordError ?? ' '}
              />
              <TextField
                label="Phone (optional)"
                value={form.phone}
                onChange={update('phone')}
                fullWidth
                autoComplete="tel"
                error={Boolean(phoneError)}
                helperText={phoneError ?? ' '}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                {loading ? 'Creating…' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Already registered?{' '}
            <Link component={RouterLink} to="/login" fontWeight={600}>
              Sign in
            </Link>
          </Typography>
        </Paper>
      </motion.div>
    </Box>
  )
}
