import type { CSSProperties } from 'react'

export interface DemoAccount {
  label: string
  email: string
  password: string
}

/**
 * Evaluators need a one-click way in, so the demo accounts stay — styled as
 * quiet monospace pills that fill the form on click.
 */
export default function DemoAccounts({
  label,
  accounts,
  onSelect,
}: {
  label: string
  accounts: DemoAccount[]
  onSelect?: (account: DemoAccount) => void
}) {
  return (
    <div style={wrap}>
      <span style={labelStyle}>{label}</span>
      <div style={row}>
        {accounts.map((account) => (
          <button
            key={account.email}
            type="button"
            style={pill}
            onClick={() => onSelect?.(account)}
            disabled={!onSelect}
          >
            {account.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const wrap: CSSProperties = {
  marginTop: 24,
  paddingTop: 20,
  borderTop: '1px solid var(--color-hairline)',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  marginBottom: 10,
}

const row: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const pill: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid var(--color-hairline-strong)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'border-color 120ms cubic-bezier(0.2,0.8,0.2,1), color 120ms',
}
