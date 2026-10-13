import { useTheme } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { Popover, PopoverDivider, PopoverGlyph, PopoverHeader, PopoverItem } from '../components/Popover'
import { radius, type AppearancePreference } from '../theme'
import type { TopBarUser } from './TopBar'

const APPEARANCE: Array<{ value: AppearancePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function AppearanceMenu({
  anchor,
  onClose,
  preference,
  setPreference,
}: {
  anchor: HTMLElement | null
  onClose: () => void
  preference: AppearancePreference
  setPreference: (value: AppearancePreference) => void
}) {
  const theme = useTheme()
  return (
    <Popover open={Boolean(anchor)} anchor={anchor} onClose={onClose} label="Appearance">
      {APPEARANCE.map((option) => (
        <PopoverItem
          key={option.value}
          selected={preference === option.value}
          onClick={() => {
            setPreference(option.value)
            onClose()
          }}
        >
          {option.label}
          {preference === option.value ? (
            <PopoverGlyph>
              <CheckRoundedIcon fontSize="small" style={{ color: theme.stark.holo }} />
            </PopoverGlyph>
          ) : null}
        </PopoverItem>
      ))}
    </Popover>
  )
}

export function AccountMenu({
  anchor,
  onClose,
  user,
  roleLabel,
  onLogout,
  onProfile,
}: {
  anchor: HTMLElement | null
  onClose: () => void
  user?: TopBarUser
  roleLabel: string
  onLogout: () => void
  onProfile: () => void
}) {
  return (
    <Popover open={Boolean(anchor)} anchor={anchor} onClose={onClose} label="Account" width={232}>
      <PopoverHeader>
        <AccountHeader user={user} roleLabel={roleLabel} />
      </PopoverHeader>
      <PopoverDivider />
      <PopoverItem
        onClick={() => {
          onClose()
          onProfile()
        }}
      >
        <AccountCircleRoundedIcon fontSize="small" />
        Profile &amp; payments
      </PopoverItem>
      <PopoverItem
        danger
        onClick={() => {
          onClose()
          onLogout()
        }}
      >
        <LogoutRoundedIcon fontSize="small" />
        Sign out
      </PopoverItem>
    </Popover>
  )
}

function AccountHeader({ user, roleLabel }: { user?: TopBarUser; roleLabel: string }) {
  const theme = useTheme()
  return (
    <>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{user?.fullName}</div>
      <div style={{ fontSize: 12, lineHeight: 1.4, color: theme.palette.text.secondary }}>{user?.email}</div>
      <span
        style={{
          display: 'inline-block',
          marginTop: 6,
          paddingInline: 6,
          paddingBlock: 2,
          borderRadius: radius.chip,
          border: `1px solid ${theme.stark.hairlineStrong}`,
          color: theme.palette.text.secondary,
          fontFamily: theme.stark.mono,
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {roleLabel}
      </span>
    </>
  )
}
