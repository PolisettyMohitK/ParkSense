import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { coverUrl } from '../api/endpoints'

export function getMobilePlaceGallery(coverImageUrl?: string | null): string[] {
  if (!coverImageUrl) {
    const fallback = coverUrl('/places/campus-banjara.jpg')
    return fallback ? [fallback] : []
  }
  const base = coverImageUrl.replace(/\.jpg$/, '')
  let paths: string[] = []
  if (coverImageUrl.includes('cafe-1') || coverImageUrl.includes('restaurant')) {
    paths = [coverImageUrl, `${base}-b.jpg`, `${base}-c.jpg`]
  } else {
    paths = [coverImageUrl, `${base}-b.jpg`]
  }
  return paths.map((p) => coverUrl(p)).filter(Boolean) as string[]
}

interface PlacePhotoSlideshowProps {
  coverImageUrl?: string | null
  height?: number
  autoPlayIntervalMs?: number
}

export default function PlacePhotoSlideshow({
  coverImageUrl,
  height = 160,
  autoPlayIntervalMs = 4200,
}: PlacePhotoSlideshowProps) {
  const photos = getMobilePlaceGallery(coverImageUrl)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length)
    }, autoPlayIntervalMs)

    return () => clearInterval(interval)
  }, [photos.length, autoPlayIntervalMs])

  const currentUri = photos[index] ?? photos[0]

  return (
    <View style={[styles.container, { height }]}>
      {currentUri ? (
        <Image
          source={{ uri: currentUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={750}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#16181B' }]} />
      )}

      {/* Subtle vignette for contrast */}
      <View style={styles.vignette} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#16181B',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
})
