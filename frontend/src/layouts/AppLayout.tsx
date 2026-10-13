import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMediaQuery, useTheme } from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import { motion as framer } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/authSlice'
import { connectSocket, disconnectSocket, isSocketConnected } from '../websocket/socket'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingState from '../components/LoadingState'
import RailSidebar, { type RailItem } from './RailSidebar'
import Rail from './Rail'
import TopBar from './TopBar'

const STAFF_NAV: RailItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardRoundedIcon fontSize="small" /> },
  { label: 'Analytics', to: '/analytics', icon: <InsightsRoundedIcon fontSize="small" /> },
  { label: 'Zones', to: '/zones', icon: <LocalParkingRoundedIcon fontSize="small" /> },
  { label: 'Live map', to: '/map', icon: <MapRoundedIcon fontSize="small" /> },
  { label: 'Camera', to: '/camera', icon: <PhotoCameraRoundedIcon fontSize="small" /> },
  { label: 'Reservations', to: '/reservations', icon: <EventAvailableRoundedIcon fontSize="small" /> },
  { label: 'Vehicles', to: '/vehicles', icon: <DirectionsCarRoundedIcon fontSize="small" /> },
  { label: 'Users', to: '/admin/users', icon: <PeopleRoundedIcon fontSize="small" />, roles: ['ADMIN'] },
  {
    label: 'Organizations',
    to: '/admin/organizations',
    icon: <BusinessRoundedIcon fontSize="small" />,
    roles: ['ADMIN'],
  },
  { label: 'Sites', to: '/admin/sites', icon: <ApartmentRoundedIcon fontSize="small" />, roles: ['ADMIN', 'MANAGER'] },
  {
    label: 'Devices',
    to: '/admin/devices',
    icon: <VideocamRoundedIcon fontSize="small" />,
    roles: ['ADMIN', 'MANAGER'],
  },
]

const DRIVER_NAV: RailItem[] = [
  { label: 'Explore', to: '/explore', icon: <ExploreRoundedIcon fontSize="small" />, end: true },
  { label: 'My parking', to: '/reservations', icon: <EventAvailableRoundedIcon fontSize="small" /> },
  { label: 'My vehicles', to: '/vehicles', icon: <DirectionsCarRoundedIcon fontSize="small" /> },
]

const ACCOUNT_NAV: RailItem[] = [
  { label: 'Profile & payments', to: '/profile', icon: <AccountCircleRoundedIcon fontSize="small" /> },
]

export default function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [connected, setConnected] = useState(isSocketConnected)
  const [scrolled, setScrolled] = useState(false)
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const mainRef = useRef<HTMLElement>(null)

  // One realtime connection for the whole signed-in session.
  useEffect(() => {
    connectSocket()
  }, [])

  useEffect(() => {
    const handleStatus = (event: Event) => setConnected((event as CustomEvent<boolean>).detail)
    window.addEventListener('ws:status', handleStatus)
    return () => window.removeEventListener('ws:status', handleStatus)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const handleLogout = () => {
    disconnectSocket()
    queryClient.clear()
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      {isDesktop ? <RailSidebar items={navItems(user?.role === 'USER')} connected={connected} /> : null}
      {!isDesktop ? <Rail open={mobileOpen} onClose={() => setMobileOpen(false)} items={navItems(user?.role === 'USER')} /> : null}

      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <TopBar
          title={titleForPath(location.pathname)}
          scrolled={scrolled}
          isDesktop={isDesktop}
          user={user ?? undefined}
          onOpenNav={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />

        <main ref={mainRef} style={MAIN_STYLE}>
          <framer.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<LoadingState minHeight={360} />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </framer.div>
        </main>
      </div>
    </div>
  )
}

const MAIN_STYLE: CSSProperties = {
  flex: 1,
  width: '100%',
  maxWidth: 1560,
  minWidth: 0,
  marginInline: 'auto',
  paddingInline: 'clamp(16px, 3vw, 40px)',
  paddingBlock: 'clamp(24px, 3vw, 36px)',
}

function navItems(isDriver: boolean): RailItem[] {
  const base = isDriver ? DRIVER_NAV : STAFF_NAV
  return [...base, ...ACCOUNT_NAV]
}

function titleForPath(path: string) {
  if (path.startsWith('/places/')) return 'Place'
  if (path.startsWith('/zones/')) return 'Zone detail'
  if (path.startsWith('/admin/sites/')) return 'Site survey'
  const map: Record<string, string> = {
    '/dashboard': 'Operations · Dashboard',
    '/analytics': 'Operations · Analytics',
    '/explore': 'Explore',
    '/zones': 'Parking zones',
    '/map': 'Live parking map',
    '/camera': 'Camera capture',
    '/reservations': 'My parking',
    '/vehicles': 'Vehicles',
    '/admin/users': 'Administration · Users',
    '/admin/organizations': 'Administration · Organizations',
    '/admin/sites': 'Administration · Parking sites',
    '/admin/devices': 'Administration · Monitoring devices',
    '/profile': 'Profile',
  }
  return map[path] ?? 'ParkSense'
}
