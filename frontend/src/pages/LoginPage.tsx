import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import { motion } from 'framer-motion'
import { login } from '../api/auth'
import { apiErrorMessage } from '../api/client'
import { useAppDispatch } from '../store/hooks'
import { setCredentials } from '../store/authSlice'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@parking.dev', password: 'admin123' },
  { label: 'Manager', email: 'manager@parking.dev', password: 'manager123' },
  { label: 'User', email: 'user@parking.dev', password: 'user123' },
]

export default function LoginPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@parking.dev' : '')
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin123' : '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await login({ email, password })
      dispatch(setCredentials({ token: result.token, user: result.user }))
      const fallback = result.user.role === 'USER' ? '/explore' : '/dashboard'
      navigate(location.state?.from ?? fallback, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: isDark ? '#111113' : '#F5F5F7',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              bgcolor: isDark ? '#FAFAFA' : '#0A0A0A',
              color: isDark ? '#0A0A0A' : '#FAFAFA',
            }}
          >
            <LocalParkingRoundedIcon />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            ParkSense
          </Typography>
        </Stack>

        <Box>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Typography variant="h3" fontWeight={700} sx={{ mb: 2, maxWidth: 480 }}>
              Real-time parking management, digitized.
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 460, mb: 3 }}>
              Map structured and unstructured parking, track occupancy from any source, and
              monitor every zone live — all from one platform.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label="Live occupancy" variant="outlined" />
              <Chip label="Image-assisted mapping" variant="outlined" />
              <Chip label="Analytics & heatmaps" variant="outlined" />
              <Chip label="Multi-source events" variant="outlined" />
            </Stack>
          </motion.div>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Configurable Real-Time Parking Management & Analytics Platform
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 3, md: 6 } }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Paper sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 440 }}>
            <Typography variant="h4" fontWeight={700}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Welcome back to your parking control center.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  fullWidth
                  autoComplete="current-password"
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>

            {import.meta.env.DEV ? (
              <>
                <Divider sx={{ my: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Demo accounts (dev only)
                  </Typography>
                </Divider>

                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                  {DEMO_ACCOUNTS.map((account) => (
                    <Chip
                      key={account.email}
                      label={account.label}
                      onClick={() => {
                        setEmail(account.email)
                        setPassword(account.password)
                      }}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </>
            ) : null}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
              No account?{' '}
              <Link component={RouterLink} to="/register" fontWeight={600}>
                Create one
              </Link>
            </Typography>
          </Paper>
        </motion.div>
      </Box>
    </Box>
  )
}
