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
import { setCredentials } from '../store/authSlice'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await register(form)
      dispatch(setCredentials({ token: result.token, user: result.user }))
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
            Join ParkSense and start managing parking.
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.2}>
              <TextField label="Full name" value={form.fullName} onChange={update('fullName')} required fullWidth />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                fullWidth
                helperText="At least 6 characters"
              />
              <TextField label="Phone (optional)" value={form.phone} onChange={update('phone')} fullWidth />
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
