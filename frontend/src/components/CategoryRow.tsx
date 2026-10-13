import type { CSSProperties } from 'react'
import { useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'

/** One horizontally scrollable row of quiet category chips. */
export default function CategoryRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  const theme = useTheme()
  return (
    <div role="group" aria-label="Category" style={row}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            style={chip(theme, active)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const row: CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  paddingBottom: 2,
  marginInline: -2,
  paddingInline: 2,
}

const chip = (theme: Theme, active: boolean): CSSProperties => ({
  flexShrink: 0,
  padding: '6px 12px',
  borderRadius: 999,
  border: `1px solid ${active ? theme.stark.holo : theme.stark.hairline}`,
  background: active ? theme.stark.holoSoft : 'transparent',
  color: active ? theme.stark.holo : theme.palette.text.secondary,
  font: 'inherit',
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'border-color 120ms cubic-bezier(0.2,0.8,0.2,1), color 120ms, background-color 120ms',
})
