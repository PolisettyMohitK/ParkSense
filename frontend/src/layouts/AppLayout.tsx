import { Suspense, useEffect, useState, type ReactElement } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  ListItemIcon as MenuItemIcon,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import LocalParkingRoundedIcon from '@mui/icons-material/LocalParkingRounded'
import MapRoundedIcon from '@mui/icons-material/MapRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import BrightnessAutoRoundedIcon from '@mui/icons-material/BrightnessAutoRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/authSlice'
import { connectSocket, disconnectSocket, isSocketConnected } from '../websocket/socket'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingState from '../components/LoadingState'
import { useColorMode } from '../theme/ColorModeProvider'
import type { AppearancePreference } from '../theme'

const DRAWER_WIDTH = 264

interface NavItem {
  label: string
  to: string
  icon: ReactElement
  roles?: string[]
}

const STAFF_NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <DashboardRoundedIcon /> },
      { label: 'Analytics', to: '/analytics', icon: <InsightsRoundedIcon /> },
    ],
  },
  {
    heading: 'Parking',
    items: [
      { label: 'Zones', to: '/zones', icon: <LocalParkingRoundedIcon /> },
      { label: 'Live Map', to: '/map', icon: <MapRoundedIcon /> },
      { label: 'Camera', to: '/camera', icon: <PhotoCameraRoundedIcon /> },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Reservations', to: '/reservations', icon: <EventAvailableRoundedIcon /> },
      { label: 'Vehicles', to: '/vehicles', icon: <DirectionsCarRoundedIcon /> },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Users', to: '/admin/users', icon: <PeopleRoundedIcon />, roles: ['ADMIN'] },
      { label: 'Organizations', to: '/admin/organizations', icon: <BusinessRoundedIcon />, roles: ['ADMIN'] },
      { label: 'Sites', to: '/admin/sites', icon: <ApartmentRoundedIcon />, roles: ['ADMIN', 'MANAGER'] },
      { label: 'Devices', to: '/admin/devices', icon: <VideocamRoundedIcon />, roles: ['ADMIN', 'MANAGER'] },
    ],
  },
]

const ACCOUNT_NAV: { heading: string; items: NavItem[] } = {
  heading: 'Account',
  items: [{ label: 'Profile & payments', to: '/profile', icon: <AccountCircleRoundedIcon /> }],
}

const DRIVER_NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Discover',
    items: [
      { label: 'Explore', to: '/explore', icon: <ExploreRoundedIcon /> },
    ],
  },
  {
    heading: 'My Activity',
    items: [
      { label: 'Bookings & Sessions', to: '/reservations', icon: <EventAvailableRoundedIcon /> },
      { label: 'My Vehicles', to: '/vehicles', icon: <DirectionsCarRoundedIcon /> },
    ],
  },
]

export default function AppLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [appearanceAnchor, setAppearanceAnchor] = useState<null | HTMLElement>(null)
  const [connected, setConnected] = useState(isSocketConnected)
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { preference, setPreference } = useColorMode()

  const isDriver = user?.role === 'USER'
  const navSections = [...(isDriver ? DRIVER_NAV : STAFF_NAV), ACCOUNT_NAV]

  // One realtime connection for the whole signed-in session.
  useEffect(() => {
    connectSocket()
  }, [])

  useEffect(() => {
    const handleStatus = (event: Event) => setConnected((event as CustomEvent<boolean>).detail)
    window.addEventListener('ws:status', handleStatus)
    return () => window.removeEventListener('ws:status', handleStatus)
  }, [])

  const queryClient = useQueryClient()

  const handleLogout = () => {
    disconnectSocket()
    queryClient.clear()
    dispatch(logout())
    navigate('/login')
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5, gap: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 800,
          }}
        >
          P
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>
            ParkSense
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isDriver ? 'Find parking' : 'Operations'}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {navSections.map((section) => {
          const items = section.items.filter(
            (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
          )
          if (items.length === 0) return null
          return (
            <Box key={section.heading} sx={{ px: 1.5, mb: 1 }}>
              <Typography variant="overline" sx={{ px: 1.5, color: 'text.secondary', letterSpacing: 1.2, fontSize: 11 }}>
                {section.heading}
              </Typography>
              <List disablePadding>
                {items.map((item, index) => (
                  <ListItemButton
                    key={`${item.to}-${index}`}
                    component={NavLink}
                    to={item.to}
                    end={item.to === '/explore'}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      borderRadius: 2,
                      my: 0.25,
                      '&.active': { bgcolor: 'action.selected' },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14.5 }} />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )
        })}
      </Box>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Chip
          size="small"
          color={connected ? 'success' : 'default'}
          variant="outlined"
          label={connected ? 'Realtime connected' : 'Realtime offline'}
          sx={{ width: '100%' }}
        />
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
              {titleForPath(location.pathname)}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Tooltip title="Appearance">
                <IconButton onClick={(event) => setAppearanceAnchor(event.currentTarget)}>
                  {preference === 'system' ? (
                    <BrightnessAutoRoundedIcon />
                  ) : preference === 'light' ? (
                    <LightModeRoundedIcon />
                  ) : (
                    <DarkModeRoundedIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Chip
                size="small"
                label={user?.role === 'USER' ? 'Driver' : user?.role === 'ADMIN' ? 'Admin' : 'Manager'}
                variant="outlined"
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              />
              <IconButton onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 15 }}>
                  {initials(user?.fullName)}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={appearanceAnchor}
                open={Boolean(appearanceAnchor)}
                onClose={() => setAppearanceAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {(
                  [
                    { value: 'system' as AppearancePreference, label: 'System', icon: <BrightnessAutoRoundedIcon fontSize="small" /> },
                    { value: 'light' as AppearancePreference, label: 'Light', icon: <LightModeRoundedIcon fontSize="small" /> },
                    { value: 'dark' as AppearancePreference, label: 'Dark', icon: <DarkModeRoundedIcon fontSize="small" /> },
                  ]
                ).map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={preference === option.value}
                    onClick={() => {
                      setPreference(option.value)
                      setAppearanceAnchor(null)
                    }}
                  >
                    <MenuItemIcon>{option.icon}</MenuItemIcon>
                    {option.label}
                    {preference === option.value ? <CheckRoundedIcon fontSize="small" sx={{ ml: 'auto' }} /> : null}
                  </MenuItem>
                ))}
              </Menu>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2">{user?.fullName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null)
                    navigate('/profile')
                  }}
                >
                  <AccountCircleRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                  Profile & payments
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                  Sign out
                </MenuItem>
              </Menu>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3.5 }, overflowX: 'hidden' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<LoadingState minHeight={360} />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </Box>
      </Box>
    </Box>
  )
}

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function titleForPath(path: string) {
  if (path.startsWith('/places/')) return 'Place'
  if (path.startsWith('/zones/')) return 'Zone detail'
  if (path.startsWith('/admin/sites/')) return 'Site survey'
  const map: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/analytics': 'Analytics',
    '/explore': 'Explore',
    '/zones': 'Parking zones',
    '/map': 'Live parking map',
    '/camera': 'Camera capture',
    '/reservations': 'Parking',
    '/vehicles': 'Vehicles',
    '/admin/users': 'Users',
    '/admin/organizations': 'Organizations',
    '/admin/sites': 'Parking sites',
    '/admin/devices': 'Monitoring devices',
    '/profile': 'Profile',
  }
  return map[path] ?? 'ParkSense'
}
