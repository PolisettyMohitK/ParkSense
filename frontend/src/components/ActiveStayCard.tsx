import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { formatDistanceToNowStrict, differenceInMinutes } from 'date-fns'
import { mySessionsApi } from '../api/sessions'
import { queryKeys } from '../api/queryKeys'
import { formatMoney } from '../utils/format'
import { useStayActions } from '../hooks/useStayActions'
import { NumericReadout } from './Stark'
import { useTickUp } from './StarkHooks'
import { radius } from '../theme'

/** Elapsed minutes vs booked window, drawn as a thin progress ring. */
function StayRing({ elapsed, planned, active }: { elapsed: number; planned: number; active: boolean }) {
  const theme = useTheme()
  const ratio = planned > 0 ? Math.min(elapsed / planned, 1) : 0
  const animated = useTickUp(ratio, 400)
  const size = 44
  const stroke = 3
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const tint = active ? theme.stark.status.free : theme.stark.status.reserved

  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.stark.hairline} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animated)}
          style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontFamily: theme.stark.mono,
          fontSize: 10,
          fontVariantNumeric: 'tabular-nums',
          color: theme.palette.text.secondary,
        }}
      >
        {Math.round(animated * 100)}%
      </span>
    </span>
  )
}

/**
 * "You are parked" HUD. Venue · bay · running charge · Check out. Renders
 * nothing (but keeps the payment dialog mounted) when not parked.
 */
export default function ActiveStayCard() {
  const { data: stay } = useQuery({
    queryKey: queryKeys.mySessions.active,
    queryFn: mySessionsApi.active,
    refetchInterval: 30_000,
  })
  const { checkOut, paymentDialog } = useStayActions()
  const theme = useTheme()

  // The running charge ticks forward between refetches.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const elapsedMinutes = useMemo(() => {
    if (!stay) return 0
    return Math.max(0, differenceInMinutes(new Date(now), new Date(stay.checkInAt)))
  }, [stay, now])

  if (!stay) return paymentDialog

  const rate = stay.hourlyRate != null ? Number(stay.hourlyRate) : 0
  const isPaid = rate > 0
  const running = isPaid ? (elapsedMinutes / 60) * rate : 0
  const amount = stay.amount ?? running
  const plannedMinutes = stay.reservationCode ? 120 : 180

  return (
    <section aria-label="Active stay" style={card(theme)}>
      <StayRing elapsed={elapsedMinutes} planned={plannedMinutes} active />

      <div style={body}>
        <div style={line1}>
          <span style={venue}>{stay.siteName ?? 'Your venue'}</span>
          <span style={separator} aria-hidden>
            ·
          </span>
          <span style={bay}>Bay {stay.spaceCode ?? '—'}</span>
        </div>
        <div style={line2}>
          {[
            stay.zoneName,
            stay.plateNumber,
            `since ${formatDistanceToNowStrict(new Date(stay.checkInAt))}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>

      <div style={charge}>
        {isPaid ? (
          <>
            <NumericReadout value={amount} decimals={0} prefix="₹" size={24} />
            <span style={chargeHint}>
              running · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(rate)}/h</span>
            </span>
          </>
        ) : (
          <>
            <span style={freeLabel}>Free</span>
            <span style={chargeHint}>complimentary stay</span>
          </>
        )}
      </div>

      {stay.reservationId ? (
        <Button
          variant="contained"
          disabled={checkOut.isPending}
          onClick={() => checkOut.mutate(stay.reservationId!)}
          sx={{ flexShrink: 0 }}
        >
          {checkOut.isPending ? 'Checking out…' : 'Check out'}
        </Button>
      ) : null}

      {paymentDialog}
    </section>
  )
}

const card = (theme: Theme): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  flexWrap: 'wrap',
  padding: '16px 20px',
  marginBottom: 28,
  borderRadius: radius.panel,
  border: `1px solid ${theme.stark.hairline}`,
  backgroundColor: theme.stark.surface,
  boxShadow: theme.stark.innerGlow === 'none' ? theme.stark.shadowLight : theme.stark.innerGlow,
})

const body: CSSProperties = { flex: 1, minWidth: 180 }

const line1: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  fontSize: 16,
  fontWeight: 600,
}

const venue: CSSProperties = { color: 'var(--color-text-primary)' }

const separator: CSSProperties = { color: 'var(--color-text-tertiary)' }

const bay: CSSProperties = { fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }

const line2: CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  marginTop: 3,
}

const charge: CSSProperties = { textAlign: 'right', minWidth: 96 }

const chargeHint: CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: 'var(--color-text-tertiary)',
  marginTop: 2,
}

const freeLabel: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--color-status-free)',
  display: 'block',
}
