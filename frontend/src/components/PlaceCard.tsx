import { useState, type CSSProperties } from 'react'
import { useTheme } from '@mui/material'
import type { Theme } from '@mui/material/styles'
import { motion as framer } from 'framer-motion'
import PlacePhotoSlideshow from './PlacePhotoSlideshow'
import { AvailabilityDot } from './StatusChip'
import { radius } from '../theme'
import type { PlaceSummary } from '../types'

/**
 * 16:10 photo, gradient scrim, one status capsule, name, one meta line.
 * Address and totals are deliberately absent — they live on the detail page.
 */
export default function PlaceCard({
  place,
  index,
  hovered,
  onHover,
  onOpen,
  summary,
}: {
  place: PlaceSummary
  index: number
  hovered: boolean
  onHover: (siteId: number | null) => void
  onOpen: () => void
  summary: string
}) {
  const theme = useTheme()
  const [expanded, setExpanded] = useState(false)
  const full = place.totalSpaces > 0 && place.availableSpaces === 0

  return (
    <framer.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.26, delay: Math.min(index * 0.03, 0.2), ease: [0.2, 0.8, 0.2, 1] }}
      onMouseEnter={() => {
        onHover(place.siteId)
        setExpanded(true)
      }}
      onMouseLeave={() => {
        onHover(null)
        setExpanded(false)
      }}
      onFocus={() => onHover(place.siteId)}
      style={{ height: '100%' }}
    >
      <a
        href={`/places/${place.siteId}`}
        onClick={(event) => {
          event.preventDefault()
          onOpen()
        }}
        aria-label={`${place.name}, ${full ? 'currently full' : `${place.availableSpaces} bays free`}`}
        style={card(theme, hovered)}
      >
        <span style={media}>
          <PlacePhotoSlideshow
            photos={place.photoUrls}
            coverImageUrl={place.coverImageUrl}
            height="100%"
            autoPlay={false}
            isHovered={hovered}
          />
          <span style={capsule(theme, full ? 'occupied' : 'free')}>
            <AvailabilityDot free={full ? 0 : place.availableSpaces} total={place.totalSpaces} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {full ? 'Full' : `${place.availableSpaces} free`}
            </span>
          </span>
        </span>

        <span style={body}>
          <span style={name}>{place.name}</span>
          <span style={meta(theme)}>{summary}</span>
          <span
            style={{
              ...detail(theme),
              maxHeight: expanded ? 40 : 0,
              opacity: expanded ? 1 : 0,
            }}
          >
            {[place.address, place.city].filter(Boolean).join(', ') || 'Hyderabad'} · {place.totalSpaces} bays
          </span>
        </span>
      </a>
    </framer.div>
  )
}

const card = (theme: Theme, hovered: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  borderRadius: radius.panel,
  border: `1px solid ${hovered ? theme.stark.hairlineStrong : theme.stark.hairline}`,
  backgroundColor: theme.stark.surface,
  textDecoration: 'none',
  boxShadow: hovered ? theme.stark.shadowLight : 'none',
  transition: 'border-color 120ms cubic-bezier(0.2,0.8,0.2,1)',
})

const media: CSSProperties = {
  position: 'relative',
  display: 'block',
  aspectRatio: '16 / 10',
  overflow: 'hidden',
}

const capsule = (theme: Theme, tone: 'free' | 'occupied'): CSSProperties => ({
  position: 'absolute',
  left: 12,
  bottom: 12,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '4px 10px',
  borderRadius: 999,
  background: 'var(--color-surface-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${tone === 'free' ? theme.stark.status.free : theme.stark.status.occupied}`,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontWeight: 500,
})

const body: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 16,
  flex: 1,
}

const name: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.01em',
  color: 'var(--color-text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const meta = (theme: Theme): CSSProperties => ({
  fontSize: 13,
  color: theme.palette.text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const detail = (theme: Theme): CSSProperties => ({
  fontSize: 12,
  color: theme.palette.text.tertiary,
  overflow: 'hidden',
  transition: 'max-height 220ms cubic-bezier(0.2,0.8,0.2,1), opacity 220ms',
})
