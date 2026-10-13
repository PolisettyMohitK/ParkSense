import { useTheme } from '@mui/material'
import { Button } from '@mui/material'
import DirectionsRoundedIcon from '@mui/icons-material/DirectionsRounded'
import { radius } from '../theme'

/**
 * Title, price pill, hours, distance, directions. One column, generous space,
 * nothing that duplicates what the HoloLot already says out loud.
 */
export default function PlaceFacts({
  name,
  category,
  rateLabel,
  isPaid,
  address,
  distanceKm,
  precise,
  openingHours,
  amenities,
  mapsUrl,
}: {
  name: string
  category?: string
  rateLabel: string
  isPaid: boolean
  address?: string
  distanceKm?: number | null
  precise?: boolean
  openingHours?: string | null
  amenities: string[]
  mapsUrl?: string | null
}) {
  const theme = useTheme()

  return (
    <header style={{ padding: '24px 0 28px', maxWidth: 720 }}>
      {category ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: theme.stark.holo,
            marginBottom: 8,
          }}
        >
          {category}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            fontWeight: 600,
            margin: 0,
            color: theme.palette.text.primary,
          }}
        >
          {name}
        </h1>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: radius.chip,
            border: `1px solid ${theme.stark.hairlineStrong}`,
            color: isPaid ? theme.palette.text.primary : theme.stark.status.free,
            background: isPaid ? 'transparent' : theme.stark.statusDim.free,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {rateLabel}
        </span>
      </div>

      {address ? (
        <div style={{ fontSize: 15, color: theme.palette.text.secondary, marginTop: 8 }}>{address}</div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 20,
          marginTop: 14,
          color: theme.palette.text.secondary,
          fontSize: 13,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {distanceKm != null ? (
          <span>
            <span style={{ fontFamily: theme.stark.mono, fontVariantNumeric: 'tabular-nums' }}>
              {distanceKm.toFixed(1)}
            </span>{' '}
            km {precise ? 'away' : 'from city centre'}
          </span>
        ) : null}
        {openingHours ? <span>{openingHours}</span> : null}
        {amenities.length > 0 ? (
          <span style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap' }}>
            {amenities.map((amenity) => (
              <span key={amenity} style={{ color: theme.palette.text.tertiary }}>
                {amenity}
              </span>
            ))}
          </span>
        ) : null}
        {mapsUrl ? (
          <Button
            size="small"
            startIcon={<DirectionsRoundedIcon />}
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            sx={{ minHeight: 28, py: 0 }}
          >
            Directions
          </Button>
        ) : null}
      </div>
    </header>
  )
}
