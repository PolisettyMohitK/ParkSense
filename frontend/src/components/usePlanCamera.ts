import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { clamp } from '../three/hololit'

/** Pointer drag + wheel zoom for the 2D renderer. */
export function usePlanCamera(initial = { yaw: -30, zoom: 1 }) {
  const [yaw, setYaw] = useState(initial.yaw)
  const [zoom, setZoom] = useState(initial.zoom)
  const dragRef = useRef<{ x: number; yaw: number } | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, yaw }
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
  }, [yaw])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = event.clientX - dragRef.current.x
    setYaw(clamp(dragRef.current.yaw + dx * 0.4, -180, 180))
  }, [])

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null
    ;(event.target as Element).releasePointerCapture?.(event.pointerId)
  }, [])

  useEffect(() => {
    const node = document.body
    const onWheel = (event: WheelEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest('[data-hololit-2d]')) return
      setZoom((z) => clamp(z - event.deltaY * 0.0012, 0.6, 2.4))
    }
    node.addEventListener('wheel', onWheel, { passive: true })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  return { yaw, zoom, setZoom, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp } }
}
