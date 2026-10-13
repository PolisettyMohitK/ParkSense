import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@mui/material'
import IdleLotScene from './IdleLotScene'
import DemoAccounts, { type DemoAccount } from './DemoAccounts'

export interface AuthLayoutProps {
  overline: string
  headline: string
  blurb?: string
  form: ReactNode
  footer?: ReactNode
  demo?: { label: string; accounts: DemoAccount[]; onSelect?: (account: DemoAccount) => void }
  accent?: string
}

/**
 * Split layout: an idle HoloLot slab on the left, a minimal form on glass at the
 * right. On mobile the scene becomes a dimmed backdrop behind the form.
 */
export default function AuthLayout({
  overline,
  headline,
  blurb,
  form,
  footer,
  demo,
  accent,
}: AuthLayoutProps) {
  const theme = useTheme()

  return (
    <div className="auth-shell">
      <div className="auth-scene" aria-hidden>
        <IdleLotScene height="100%" seed="parksense-auth" />
      </div>

      <div className="auth-form">
        <div className="auth-form-inner">
          <Wordmark accent={accent ?? theme.stark.holo} />
          <div className="auth-hero">
            <div style={overlineStyle}>{overline}</div>
            <h1 style={headlineStyle}>{headline}</h1>
            {blurb ? <p style={blurbStyle}>{blurb}</p> : null}
          </div>
          {form}
          {demo ? <DemoAccounts label={demo.label} accounts={demo.accounts} onSelect={demo.onSelect} /> : null}
          {footer ? <div style={footerStyle}>{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}




/**
 * Below 900px the scene collapses to a short dimmed band above the form rather
 * than disappearing — the product's signature should be visible even on a
 * phone, just quiet.
 */





const overlineStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--color-holo)',
  marginBottom: 10,
}

const headlineStyle: CSSProperties = {
  fontSize: 'clamp(28px, 3.2vw, 38px)',
  lineHeight: 1.12,
  letterSpacing: '-0.02em',
  fontWeight: 600,
  margin: '0 0 10px',
}

const blurbStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.55,
  color: 'var(--color-text-secondary)',
  margin: '0 0 28px',
  maxWidth: 380,
}

const footerStyle: CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: '1px solid var(--color-hairline)',
  fontSize: 14,
  color: 'var(--color-text-secondary)',
  textAlign: 'center',
}


/** Mark + wordmark, cut-corner like the HUD panels. */
function Wordmark({ accent }: { accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          display: 'grid',
          placeItems: 'center',
          clipPath: 'polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%)',
          background: accent,
        }}
      >
        <span style={{ width: 6, height: 6, background: '#fff' }} />
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>ParkSense</span>
    </div>
  )
}
