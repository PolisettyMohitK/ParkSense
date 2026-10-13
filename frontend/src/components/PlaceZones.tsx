import { useTheme } from '@mui/material'
import type { ParkingZone } from '../types'
import { radius } from '../theme'

/**
 * Floating segmented control for switching parking areas, rendered over the
 * HoloLot's top-left corner. Hairline container, holo pill on the active item.
 */
export default function ZoneSwitcher({
  zones,
  activeZoneId,
  onChange,
}: {
  zones: ParkingZone[]
  activeZoneId: number | null
  onChange: (zoneId: number) => void
}) {
  const theme = useTheme()

  return (
    <div
      role="tablist"
      aria-label="Parking area"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        borderRadius: radius.control,
        border: `1px solid ${theme.stark.hairlineStrong}`,
        backgroundColor: theme.stark.glass,
        backdropFilter: `blur(${theme.stark.glassBlur})`,
        WebkitBackdropFilter: `blur(${theme.stark.glassBlur})`,
        maxWidth: 'min(60vw, 420px)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {zones.map((zone) => {
        const active = zone.id === activeZoneId
        return (
          <button
            key={zone.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(zone.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
              padding: '6px 12px',
              border: 0,
              borderRadius: radius.chip,
              background: active ? theme.stark.holoSoft : 'transparent',
              color: active ? theme.stark.holo : theme.palette.text.secondary,
              font: 'inherit',
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 120ms cubic-bezier(0.2,0.8,0.2,1), color 120ms',
            }}
          >
            <span>{zone.name}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{zone.availableSpaces}</span>
          </button>
        )
      })}
    </div>
  )
}
