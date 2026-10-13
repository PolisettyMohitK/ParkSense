import type { CSSProperties, ReactNode } from 'react'
import { Button, useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { WireframeMark } from './Stark'

const titleStyle = (theme: Theme): CSSProperties => ({
  fontSize: 16,
  fontWeight: 600,
  color: theme.palette.text.primary,
})

const subtitleStyle = (theme: Theme): CSSProperties => ({
  fontSize: 15,
  lineHeight: 1.5,
  color: theme.palette.text.secondary,
  maxWidth: 400,
})

interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
}

/**
 * One line, one action, and a wireframe mark drawn in the same visual language
 * as the HoloLot so empty never looks broken — it looks like an empty lot.
 */
export default function EmptyState({ title, subtitle, action, icon }: EmptyStateProps) {
  const theme = useTheme()
  const mark = icon ?? <WireframeMark size={104} />
  return (
    <div style={wrap}>
      <div style={{ display: 'grid', placeItems: 'center', opacity: icon ? 1 : 0.9 }}>{mark}</div>
      <div style={titleStyle(theme)}>{title}</div>
      {subtitle ? <div style={subtitleStyle(theme)}>{subtitle}</div> : null}
      {action ? (
        <Button variant="outlined" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

const wrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 'clamp(48px, 8vw, 80px) 0',
  textAlign: 'center',
}
