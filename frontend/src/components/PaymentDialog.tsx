import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import type { PaymentMethod } from '../types'
import { formatDuration, formatMoney } from '../utils/format'

const METHODS: { value: PaymentMethod; label: string; icon: JSX.Element }[] = [
  { value: 'UPI', label: 'UPI', icon: <QrCode2RoundedIcon /> },
  { value: 'CARD', label: 'Card', icon: <CreditCardRoundedIcon /> },
  { value: 'WALLET', label: 'Wallet', icon: <AccountBalanceWalletRoundedIcon /> },
  { value: 'CASH', label: 'Cash', icon: <PaymentsRoundedIcon /> },
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
 * Settles a stay. This is a simulated checkout for the demo platform: the backend records the
 * method and issues a reference, but no gateway is called and no card or account details are asked for.
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

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="h3" fontWeight={800}>
              {formatMoney(amount, currency ?? 'INR')}
            </Typography>
            {description && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {description}
              </Typography>
            )}
            {durationMinutes != null && (
              <Typography variant="caption" color="text.secondary">
                Parked for {formatDuration(durationMinutes)}
              </Typography>
            )}
          </Stack>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={method}
            onChange={(_, value: PaymentMethod | null) => value && setMethod(value)}
            aria-label="Payment method"
          >
            {METHODS.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ flexDirection: 'column', gap: 0.5, py: 1.5 }}>
                {option.icon}
                <Typography variant="caption" fontWeight={600}>
                  {option.label}
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Alert severity="info" variant="outlined">
            Demo checkout: no money is charged and no card or bank details are collected.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Later
        </Button>
        <Button variant="contained" onClick={() => onPay(method)} disabled={loading}>
          {loading ? 'Processing…' : `Pay ${formatMoney(amount, currency ?? 'INR')}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
