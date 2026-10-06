import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { logout } from './store/authSlice'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ExplorePage from './pages/ExplorePage'
import PlaceDetailPage from './pages/PlaceDetailPage'
import DashboardPage from './pages/DashboardPage'
import ZonesPage from './pages/ZonesPage'
import ZoneDetailPage from './pages/ZoneDetailPage'
import ParkingMapPage from './pages/ParkingMapPage'
import CameraPage from './pages/CameraPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ReservationsPage from './pages/ReservationsPage'
import VehiclesPage from './pages/VehiclesPage'
import UsersPage from './pages/UsersPage'
import OrganizationsPage from './pages/OrganizationsPage'
import SitesPage from './pages/SitesPage'
import DevicesPage from './pages/DevicesPage'

export default function App() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const token = useAppSelector((state) => state.auth.token)

  useEffect(() => {
    const handleLogout = () => {
      dispatch(logout())
      navigate('/login')
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [dispatch, navigate])

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/zones/:zoneId" element={<ZoneDetailPage />} />
          <Route path="/map" element={<ParkingMapPage />} />
          <Route
            path="/camera"
            element={
              <RoleRoute roles={['ADMIN', 'MANAGER']}>
                <CameraPage />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <RoleRoute roles={['ADMIN', 'MANAGER']}>
                <AnalyticsPage />
              </RoleRoute>
            }
          />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route
            path="/admin/users"
            element={
              <RoleRoute roles={['ADMIN']}>
                <UsersPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/organizations"
            element={
              <RoleRoute roles={['ADMIN']}>
                <OrganizationsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/sites"
            element={
              <RoleRoute roles={['ADMIN', 'MANAGER']}>
                <SitesPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/devices"
            element={
              <RoleRoute roles={['ADMIN', 'MANAGER']}>
                <DevicesPage />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </AnimatePresence>
  )
}

function HomeRedirect() {
  const user = useAppSelector((state) => state.auth.user)
  return <Navigate to={user?.role === 'USER' ? '/explore' : '/dashboard'} replace />
}
