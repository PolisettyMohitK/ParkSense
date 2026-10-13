import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Box, Divider, IconButton, Stack, Typography, useTheme } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import { LiveBadge } from '../components/Stark'
import { radius, timing } from '../theme'
import type { RailNavItem } from './Rail'

const RAIL = 72
const RAIL_EXPANDED = 240
const PIN_KEY = 'parksense.railPinned'

export interface RailItem extends RailNavItem {
  roles?: string[]
}

/**
 * Slim 72 px icon rail that expands to 240 px on hover or when pinned.
 * The active item is marked with a 2 px holo bar and a soft glow.
 */
export default function RailSidebar({
  items,
  connected,
}: {
  items: RailItem[]
  connected: boolean
}) {
  const theme = useTheme()
  const { pathname } = useLocation()
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(PIN_KEY) === '1'
    } catch {
      return false
    }
  })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? '1' : '0')
    } catch {
      /* private browsing */
    }
  }, [pinned])

  const expanded = pinned || hovering

  return (
    <Box
      component="nav"
      aria-label="Primary"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{
        width: expanded ? RAIL_EXPANDED : RAIL,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderRight: `1px solid ${theme.stark.hairline}`,
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.stark.surface,
        transition: `width ${timing.duration.base}ms ${timing.easing.out}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <RailMark expanded={expanded} />

      <Divider />

      <Stack spacing={0.5} sx={{ px: expanded ? 1.5 : 1, py: 2, flex: 1, overflowY: 'auto' }}>
        {items.map((item) => (
          <RailLink key={item.to} item={item} expanded={expanded} pathname={pathname} />
        ))}
      </Stack>

      <Divider />

      <RailFooter
        expanded={expanded}
        connected={connected}
        pinned={pinned}
        onTogglePin={() => setPinned((value) => !value)}
      />
    </Box>
  )
}

function RailFooter({
  expanded,
  connected,
  pinned,
  onTogglePin,
}: {
  expanded: boolean
  connected: boolean
  pinned: boolean
  onTogglePin: () => void
}) {
  const theme = useTheme()
  return (
    <Stack spacing={1} sx={{ px: expanded ? 2 : 0, py: 2, alignItems: expanded ? 'flex-start' : 'center' }}>
      <LiveBadge live={connected} />
      {expanded ? (
        <Typography variant="caption" sx={{ color: theme.palette.text.tertiary, whiteSpace: 'nowrap' }}>
          {connected ? 'Realtime connected' : 'Realtime offline'}
        </Typography>
      ) : null}
      <IconButton
        size="small"
        aria-label={pinned ? 'Collapse navigation' : 'Expand navigation'}
        aria-pressed={pinned}
        onClick={onTogglePin}
      >
        <ChevronLeftRoundedIcon
          fontSize="small"
          sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 220ms' }}
        />
      </IconButton>
    </Stack>
  )
}

function RailMark({ expanded }: { expanded: boolean }) {
  const theme = useTheme()
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.25}
      sx={{
        height: 64,
        px: expanded ? 2 : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          clipPath: theme.stark.cutCorner,
          background: theme.palette.mode === 'dark' ? theme.stark.holoSoft : theme.stark.holo,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            background: theme.palette.mode === 'dark' ? theme.stark.holo : '#FFFFFF',
          }}
        />
      </span>
      {expanded ? (
        <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          ParkSense
        </Typography>
      ) : null}
    </Stack>
  )
}

function RailLink({
  item,
  expanded,
  pathname,
}: {
  item: RailItem
  expanded: boolean
  pathname: string
}) {
  const theme = useTheme()
  const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to)

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={expanded ? undefined : item.label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 40,
        paddingLeft: expanded ? 10 : 0,
        paddingRight: expanded ? 10 : 0,
        justifyContent: expanded ? 'flex-start' : 'center',
        borderRadius: radius.control,
        color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
        textDecoration: 'none',
        transition: `background-color ${timing.duration.fast}ms ${timing.easing.out}, color ${timing.duration.fast}ms ${timing.easing.out}`,
      }}
      className="rail-link"
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: expanded ? -6 : -13,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 2,
          height: isActive ? 18 : 0,
          borderRadius: 2,
          background: theme.stark.holo,
          boxShadow: `0 0 10px ${theme.stark.holoGlow}`,
          transition: `height ${timing.duration.base}ms ${timing.easing.out}`,
        }}
      />
      <span style={{ display: 'grid', placeItems: 'center', color: isActive ? theme.stark.holo : 'inherit' }}>
        {item.icon}
      </span>
      {expanded ? (
        <span style={{ fontSize: 14, whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
      ) : null}
    </NavLink>
  )
}

