import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { coverUrl } from '../api/endpoints'

const FALLBACK = '/places/campus-banjara.jpg'

interface PlacePhotoSlideshowProps {
  /** Gallery from the API (`photoUrls`); falls back to the cover alone. */
  photos?: string[] | null
  coverImageUrl?: string | null
  height?: number
  autoPlayIntervalMs?: number
  /** List cards pass false so a long list does not run a timer per card. */
  autoPlay?: boolean
}

export default function PlacePhotoSlideshow({
  photos,
  coverImageUrl,
  height = 160,
  autoPlayIntervalMs = 4200,
  autoPlay = true,
}: PlacePhotoSlideshowProps) {
  const gallery = (photos && photos.length > 0 ? photos : [coverImageUrl ?? FALLBACK])
    .map((path) => coverUrl(path))
    .filter(Boolean) as string[]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!autoPlay || gallery.length <= 1) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % gallery.length)
    }, autoPlayIntervalMs)
    return () => clearInterval(interval)
  }, [autoPlay, gallery.length, autoPlayIntervalMs])

  const currentUri = gallery[index % Math.max(1, gallery.length)]

  return (
    <View style={[styles.container, { height }]}>
      {currentUri ? (
        <Image source={{ uri: currentUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={750} />
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
