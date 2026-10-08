import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'

export function getPlaceGallery(coverImageUrl?: string | null): string[] {
  if (!coverImageUrl) return ['/places/campus-banjara.jpg']
  const base = coverImageUrl.replace(/\.jpg$/, '')
  if (coverImageUrl.includes('cafe-1') || coverImageUrl.includes('restaurant')) {
    return [coverImageUrl, `${base}-b.jpg`, `${base}-c.jpg`]
  }
  return [coverImageUrl, `${base}-b.jpg`]
}

interface PlacePhotoSlideshowProps {
  coverImageUrl?: string | null
  height?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string }
  autoPlayIntervalMs?: number
  isHovered?: boolean
}

export default function PlacePhotoSlideshow({
  coverImageUrl,
  height = 170,
  autoPlayIntervalMs = 4200,
  isHovered = false,
}: PlacePhotoSlideshowProps) {
  const photos = getPlaceGallery(coverImageUrl)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length)
    }, isHovered ? 2600 : autoPlayIntervalMs)

    return () => clearInterval(interval)
  }, [photos.length, autoPlayIntervalMs, isHovered])

  return (
    <Box
      sx={{
        width: '100%',
        height,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#16181B',
      }}
    >
      <AnimatePresence>
        <motion.div
          key={photos[index]}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${photos[index]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>

      {/* Gentle vignette for contrast without obscuring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}
