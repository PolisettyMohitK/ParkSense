import { useEffect, useRef } from 'react'
import { connectSocket, subscribeOccupancy } from '../websocket/socket'
import type { OccupancyChangedEvent } from '../types'

export function useOccupancyStream(handler: (event: OccupancyChangedEvent) => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    connectSocket()
    const unsubscribe = subscribeOccupancy((event) => handlerRef.current(event))
    return () => {
      unsubscribe()
    }
  }, [])
}
