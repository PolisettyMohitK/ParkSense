import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { Stack, useTheme } from '@mui/material'
import { radius } from '../theme'

export interface RailNavItem {
  label: string
  to: string
  icon: ReactElement
  roles?: string[]
  end?: boolean
}

/**
 * Mobile navigation. Deliberately not a MUI `Dialog`: the sheet is a plain
 * scrim plus a Stack, which keeps the type graph small and the focus trap to
 * the browser's.
 */
export default function Rail({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: RailNavItem[]
}) {
  const theme = useTheme()
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 60,
        backgroundColor: theme.palette.background.default,
        opacity: 0.94,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack
        onClick={(event) => event.stopPropagation()}
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          bottom: { xs: 12, sm: 16 },
          left: { xs: 12, sm: 16 },
          p: 2,
          borderRadius: radius.panel,
          border: `1px solid ${theme.stark.hairline}`,
          backgroundColor: theme.stark.surface,
          overflowY: 'auto',
        }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingInline: 12,
              height: 44,
              borderRadius: radius.control,
              color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
              backgroundColor: isActive ? theme.palette.action.hover : 'transparent',
              textDecoration: 'none',
            })}
          >
            {item.icon}
            <span style={{ fontSize: 15 }}>{item.label}</span>
          </NavLink>
        ))}
      </Stack>
    </div>
  )
}
