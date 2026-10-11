import { lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { logout, setUser } from './store/authSlice'
import { me } from './api/auth'
import { disconnectSocket } from './websocket/socket'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import type { Role } from './types'

// Pages are code-split so drivers never download the staff tooling (three.js, charts, camera).
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const PlaceDetailPage = lazy(() => import('./pages/PlaceDetailPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ZonesPage = lazy(() => import('./pages/ZonesPage'))
const ZoneDetailPage = lazy(() => import('./pages/ZoneDetailPage'))
const ParkingMapPage = lazy(() => import('./pages/ParkingMapPage'))
const CameraPage = lazy(() => import('./pages/CameraPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'))
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'))
const SitesPage = lazy(() => import('./pages/SitesPage'))
const DevicesPage = lazy(() => import('./pages/DevicesPage'))
const SurveyReviewPage = lazy(() => import('./pages/SurveyReviewPage'))

const STAFF: Role[] = ['ADMIN', 'MANAGER']
const ADMIN: Role[] = ['ADMIN']

function only(roles: Role[], page: ReactNode) {
  return <RoleRoute roles={roles}>{page}</RoleRoute>
}

export default function App() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const token = useAppSelector((state) => state.auth.token)
  const expiresAt = useAppSelector((state) => state.auth.expiresAt)

  useEffect(() => {
    const handleLogout = (event: Event) => {
      disconnectSocket()
      queryClient.clear()
      dispatch(logout())
      if ((event as CustomEvent<{ reason?: string }>).detail?.reason === 'expired') {
        enqueueSnackbar('Your session has expired. Please sign in again.', { variant: 'info' })
      }
      navigate('/login')
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [dispatch, navigate, queryClient, enqueueSnackbar])

  // Sign out exactly when the token lapses instead of waiting for the next failing request.
  useEffect(() => {
    if (!token || !expiresAt) return
    const timer = window.setTimeout(
      () => window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'expired' } })),
      Math.max(0, expiresAt - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [token, expiresAt])

  // Refresh the cached profile once per session so role or name changes made by an admin apply.
  const profile = useQuery({ queryKey: ['auth', 'me', token], queryFn: me, enabled: Boolean(token), staleTime: Infinity })
  useEffect(() => {
    if (profile.data) dispatch(setUser(profile.data))
  }, [profile.data, dispatch])

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/places/:siteId" element={<PlaceDetailPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/dashboard" element={only(STAFF, <DashboardPage />)} />
        <Route path="/zones" element={only(STAFF, <ZonesPage />)} />
        <Route path="/zones/:zoneId" element={only(STAFF, <ZoneDetailPage />)} />
        <Route path="/map" element={only(STAFF, <ParkingMapPage />)} />
        <Route path="/camera" element={only(STAFF, <CameraPage />)} />
        <Route path="/analytics" element={only(STAFF, <AnalyticsPage />)} />
        <Route path="/admin/users" element={only(ADMIN, <UsersPage />)} />
        <Route path="/admin/organizations" element={only(ADMIN, <OrganizationsPage />)} />
        <Route path="/admin/sites" element={only(STAFF, <SitesPage />)} />
        <Route path="/admin/sites/:siteId/surveys" element={only(STAFF, <SurveyReviewPage />)} />
        <Route path="/admin/sites/:siteId/surveys/:surveyId" element={only(STAFF, <SurveyReviewPage />)} />
        <Route path="/admin/devices" element={only(STAFF, <DevicesPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function HomeRedirect() {
  const user = useAppSelector((state) => state.auth.user)
  return <Navigate to={user?.role === 'USER' ? '/explore' : '/dashboard'} replace />
}
