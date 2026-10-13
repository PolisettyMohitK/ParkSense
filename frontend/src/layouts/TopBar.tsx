import { useState, type CSSProperties } from 'react'
import { Avatar, IconButton, Stack, Tooltip, useTheme } from '@mui/material'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import BrightnessAutoRoundedIcon from '@mui/icons-material/BrightnessAutoRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import { glass } from '../theme'
import { useColorMode } from '../theme/ColorModeProvider'
import { AppearanceMenu, AccountMenu } from './TopBarMenus'
import { useNavigate } from 'react-router-dom'

export interface TopBarUser {
  fullName?: string
  email?: string
  role?: string
}

/**
 * Transparent glass bar that gains a hairline on scroll. The role chip moved
 * into the account menu so the bar itself stays quiet.
 */
export default function TopBar({
  title,
  scrolled,
  isDesktop,
  user,
  onOpenNav,
  onLogout,
}: {
  title: string
  scrolled: boolean
  isDesktop: boolean
  user?: TopBarUser
  onOpenNav: () => void
  onLogout: () => void
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { preference, setPreference } = useColorMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [appearanceAnchor, setAppearanceAnchor] = useState<null | HTMLElement>(null)

  const surfaces = glass(theme)
  const barStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backgroundColor: scrolled ? theme.stark.glass : 'transparent',
    backdropFilter: scrolled ? surfaces.backdropFilter : 'none',
    WebkitBackdropFilter: scrolled ? surfaces.WebkitBackdropFilter : 'none',
    borderBottom: `1px solid ${scrolled ? theme.stark.hairline : 'transparent'}`,
    transition: 'background-color 220ms cubic-bezier(0.2,0.8,0.2,1), border-color 220ms cubic-bezier(0.2,0.8,0.2,1)',
  }
  const roleLabel = user?.role === 'USER' ? 'Driver' : user?.role === 'ADMIN' ? 'Admin' : 'Manager'

  return (
    <header style={barStyle}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ height: 64, px: { xs: 2, md: 4 } }}>
        {!isDesktop ? (
          <IconButton size="small" aria-label="Open navigation" onClick={onOpenNav}>
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}

        <span
          style={{
            fontSize: 11,
            lineHeight: 1.27,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: theme.palette.text.secondary,
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        <Tooltip title="Appearance">
          <IconButton
            size="small"
            aria-label="Appearance"
            onClick={(event) => setAppearanceAnchor(event.currentTarget)}
          >
            <AppearanceIcon preference={preference} />
          </IconButton>
        </Tooltip>

        <IconButton size="small" aria-label="Account menu" onClick={(event) => setAnchorEl(event.currentTarget)}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{initials(user?.fullName)}</Avatar>
        </IconButton>

        <AppearanceMenu anchor={appearanceAnchor} onClose={() => setAppearanceAnchor(null)} preference={preference} setPreference={setPreference} />
        <AccountMenu
          anchor={anchorEl}
          onClose={() => setAnchorEl(null)}
          user={user}
          roleLabel={roleLabel}
          onLogout={onLogout}
          onProfile={() => {
            setAnchorEl(null)
            navigate('/profile')
          }}
        />
      </Stack>
    </header>
  )
}

function AppearanceIcon({ preference }: { preference: string }) {
  if (preference === 'light') return <LightModeRoundedIcon fontSize="small" />
  if (preference === 'dark') return <DarkModeRoundedIcon fontSize="small" />
  return <BrightnessAutoRoundedIcon fontSize="small" />
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

