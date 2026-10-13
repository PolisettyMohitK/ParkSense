import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Live-tracked `prefers-reduced-motion`. Every animated surface in Stark
 * Minimal asks this first: reduced motion collapses to fades and drops camera
 * drift, scan sweeps and parallax entirely.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Animates a number from its previous value to the next one. This is the only
 * "celebratory" motion in the system and it exists to answer "what changed?".
 */
export function useTickUp(target: number, duration = 300): number {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduced || duration <= 0 || fromRef.current === target) {
      fromRef.current = target
      setDisplay(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      fromRef.current = target
    }
  }, [target, duration, reduced])

  return display
}

/**
 * Roving-tabindex keyboard model: one item is tabbable, arrows move between
 * items in the given 2D arrangement. Used by the HoloLot's accessible bay list
 * so the scene is fully operable without a pointer.
 */
export function useRovingGrid(options: {
  rowCount: number
  columnCount: number
  activeIndex: number
  onChange: (index: number) => void
  onActivate: (index: number) => void
}): { onKeyDown: (event: React.KeyboardEvent) => void; activeIndex: number } {
  const { rowCount, columnCount, activeIndex, onChange, onActivate } = options

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const total = rowCount * columnCount
      if (total === 0) return
      const row = Math.floor(activeIndex / columnCount)
      const column = activeIndex % columnCount
      let next = activeIndex
      switch (event.key) {
        case 'ArrowRight':
          next = column === columnCount - 1 ? activeIndex : activeIndex + 1
          break
        case 'ArrowLeft':
          next = column === 0 ? activeIndex : activeIndex - 1
          break
        case 'ArrowDown':
          next = row === rowCount - 1 ? activeIndex : activeIndex + columnCount
          break
        case 'ArrowUp':
          next = row === 0 ? activeIndex : activeIndex - columnCount
          break
        case 'Home':
          next = 0
          break
        case 'End':
          next = total - 1
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          onActivate(activeIndex)
          return
        default:
          return
      }
      event.preventDefault()
      onChange(Math.max(0, Math.min(total - 1, next)))
    },
    [rowCount, columnCount, activeIndex, onChange, onActivate],
  )

  return useMemo(() => ({ onKeyDown, activeIndex }), [onKeyDown, activeIndex])
}
