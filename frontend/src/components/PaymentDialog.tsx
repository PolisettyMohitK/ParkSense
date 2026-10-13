import { useState, type CSSProperties } from 'react'
import { Button, Dialog, DialogContent, DialogTitle, useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import type { PaymentMethod } from '../types'
import { formatDuration, formatMoney } from '../utils/format'
import { radius } from '../theme'

const METHODS: Array<{ value: PaymentMethod; label: string; icon: JSX.Element }> = [
  { value: 'UPI', label: 'UPI', icon: <QrCode2RoundedIcon fontSize="small" /> },
  { value: 'CARD', label: 'Card', icon: <CreditCardRoundedIcon fontSize="small" /> },
  { value: 'WALLET', label: 'Wallet', icon: <AccountBalanceWalletRoundedIcon fontSize="small" /> },
  { value: 'CASH', label: 'Cash', icon: <PaymentsRoundedIcon fontSize="small" /> },
]

interface PaymentDialogProps {
  open: boolean
  title?: string
  amount: number | null | undefined
  currency?: string | null
  description?: string
  durationMinutes?: number | null
  loading?: boolean
  onPay: (method: PaymentMethod) => void
  onClose: () => void
}

/**
 * Settles a stay. This is a simulated checkout for the demo platform: the
 * backend records the method and issues a reference, but no gateway is called
 * and no card or account details are asked for.
 */
export default function PaymentDialog({
  open,
  title = 'Pay for parking',
  amount,
  currency,
  description,
  durationMinutes,
  loading,
  onPay,
  onClose,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('UPI')
  const theme = useTheme()
  const money = formatMoney(amount, currency ?? 'INR')

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <div style={amountBlock}>
          <div
            style={{
              fontFamily: theme.stark.mono,
              fontSize: 44,
              lineHeight: 1,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              color: theme.palette.text.primary,
            }}
          >
            {money}
          </div>
          {description ? <div style={descriptionStyle(theme)}>{description}</div> : null}
          {durationMinutes != null ? (
            <div style={meta}>Parked for {formatDuration(durationMinutes)}</div>
          ) : null}
        </div>

        <div style={methods}>
          {METHODS.map((option) => {
            const active = option.value === method
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setMethod(option.value)}
                style={tile(theme, active)}
              >
                <span style={{ color: active ? theme.stark.holo : theme.palette.text.secondary, display: 'grid' }}>
                  {option.icon}
                </span>
                <span style={tileLabel(active, theme)}>{option.label}</span>
              </button>
            )
          })}
        </div>

        <div style={note(theme)}>
          <LockRoundedIcon sx={{ fontSize: 14, color: 'inherit' }} />
          <span>Demo checkout — no money is charged.</span>
        </div>
      </DialogContent>

      <div style={actions}>
        <Button onClick={onClose} disabled={loading} sx={{ color: 'text.secondary' }}>
          Later
        </Button>
        <Button variant="contained" onClick={() => onPay(method)} disabled={loading}>
          {loading ? 'Processing…' : `Pay ${money}`}
        </Button>
      </div>
    </Dialog>
  )
}

const amountBlock: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  paddingTop: 8,
  paddingBottom: 24,
  textAlign: 'center',
}

const descriptionStyle = (theme: Theme): CSSProperties => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
})

const meta: CSSProperties = {
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
}

const methods: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 8,
  marginBottom: 20,
}

const tile = (theme: Theme, active: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '14px 4px',
  borderRadius: radius.control,
  border: `1px solid ${active ? theme.stark.holo : theme.stark.hairline}`,
  background: active ? theme.stark.holoSoft : 'transparent',
  cursor: 'pointer',
  font: 'inherit',
  transition: 'border-color 120ms cubic-bezier(0.2,0.8,0.2,1), background-color 120ms',
})

const tileLabel = (active: boolean, theme: Theme): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
})

const note = (theme: Theme): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: radius.chip,
  border: `1px solid ${theme.stark.hairline}`,
  background: theme.palette.action.hover,
  fontSize: 12,
  color: theme.palette.text.secondary,
})

const actions: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '8px 24px 20px',
}
