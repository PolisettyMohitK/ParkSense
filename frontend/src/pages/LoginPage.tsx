import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Link, Stack, TextField } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { login } from '../api/auth'
import { apiErrorMessage } from '../api/client'
import { useAppDispatch } from '../store/hooks'
import { setCredentials } from '../store/authSlice'
import AuthLayout from '../components/AuthLayout'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@parking.dev', password: 'admin123' },
  { label: 'Manager', email: 'manager@parking.dev', password: 'manager123' },
  { label: 'Driver', email: 'user@parking.dev', password: 'user123' },
]

export default function LoginPage() {
  const theme = useTheme()
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
      dispatch(setCredentials({ token: result.token, user: result.user, expiresInMs: result.expiresInMs }))
      const fallback = result.user.role === 'USER' ? '/explore' : '/dashboard'
      navigate(location.state?.from ?? fallback, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      overline="Operations console"
      headline="Every bay, live."
      blurb="Book, find and operate parking across Hyderabad venues from one calm surface."
      form={
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
              autoComplete="email"
              autoFocus
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
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>
      }
      footer={
        <>
          No account?{' '}
          <Link component={RouterLink} to="/register" fontWeight={600} underline="hover">
            Create one
          </Link>
        </>
      }
      demo={{ label: 'Demo accounts', accounts: DEMO_ACCOUNTS }}
      accent={theme.stark.holo}
    />
  )
}
