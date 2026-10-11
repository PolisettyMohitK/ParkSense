import { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { assetUrl } from '../api/client'

const FALLBACK = '/places/campus-banjara.jpg'

interface PlacePhotoSlideshowProps {
  /** Gallery from the API (`photoUrls`); falls back to the cover alone. */
  photos?: string[] | null
  coverImageUrl?: string | null
  height?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string }
  autoPlayIntervalMs?: number
  /** Cycle photos automatically. Cards pass `isHovered` so only the hovered card animates. */
  autoPlay?: boolean
  isHovered?: boolean
  alt?: string
}

export default function PlacePhotoSlideshow({
  photos,
  coverImageUrl,
  height = 170,
  autoPlayIntervalMs = 4200,
  autoPlay = true,
  isHovered = false,
  alt = '',
}: PlacePhotoSlideshowProps) {
  const gallery = (photos && photos.length > 0 ? photos : [coverImageUrl ?? FALLBACK]).map(
    (photo) => assetUrl(photo) ?? FALLBACK,
  )
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  // Only animate while on screen.
  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const playing = gallery.length > 1 && visible && !reduceMotion && (autoPlay || isHovered)

  useEffect(() => {
    if (!playing) return
    const interval = window.setInterval(
      () => setIndex((previous) => (previous + 1) % gallery.length),
      isHovered ? 2600 : autoPlayIntervalMs,
    )
    return () => window.clearInterval(interval)
  }, [playing, gallery.length, autoPlayIntervalMs, isHovered])

  // Warm the cache for the next photo so the crossfade never flashes.
  useEffect(() => {
    if (!playing) return
    const next = new Image()
    next.src = gallery[(index + 1) % gallery.length]
  }, [playing, index, gallery])

  const current = gallery[index % gallery.length]

  return (
    <Box
      ref={containerRef}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      sx={{ width: '100%', height, position: 'relative', overflow: 'hidden', bgcolor: '#16181B' }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${current})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}
