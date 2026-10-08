import { useEffect, useRef } from 'react'
import { connectSocket, subscribeOccupancy } from '../websocket/socket'
import type { OccupancyChangedEvent } from '../types'

interface StreamOptions {
  debounceMs?: number
}

export function useOccupancyStream(
  handler: (event: OccupancyChangedEvent) => void,
  options?: StreamOptions
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceMs = options?.debounceMs ?? 0

  useEffect(() => {
    connectSocket()
    const unsubscribe = subscribeOccupancy((event) => {
      if (debounceMs > 0) {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
        timerRef.current = setTimeout(() => {
          handlerRef.current(event)
        }, debounceMs)
      } else {
        handlerRef.current(event)
      }
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      unsubscribe()
    }
  }, [debounceMs])
}
