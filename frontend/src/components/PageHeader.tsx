import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@mui/material'

interface PageHeaderProps {
  /** Overline section label, e.g. "Operations". */
  overline?: string
  title: string
  /** Only add a subtitle when it carries information the title does not. */
  subtitle?: string
  action?: ReactNode
}

/**
 * Overline + title. Nothing else. Subtitles are opt-in, and at most one primary
 * action is ever passed in.
 */
export default function PageHeader({ overline, title, subtitle, action }: PageHeaderProps) {
  const theme = useTheme()
  void theme
  return (
    <header style={wrap}>
      <div style={titles}>
        {overline ? <div style={overlineStyle}>{overline}</div> : null}
        <h1 style={titleStyle}>{title}</h1>
        {subtitle ? <div style={subtitleText}>{subtitle}</div> : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </header>
  )
}

const wrap: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 16,
  marginBottom: 32,
}

const titles: CSSProperties = { minWidth: 0 }

const overlineStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.27,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-holo)',
  marginBottom: 6,
}

const titleStyle: CSSProperties = {
  fontSize: 'clamp(22px, 2.6vw, 28px)',
  lineHeight: 1.14,
  fontWeight: 600,
  letterSpacing: '-0.015em',
  margin: 0,
}

const subtitleText: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.5,
  color: 'var(--color-text-secondary)',
  marginTop: 6,
  maxWidth: 560,
}
