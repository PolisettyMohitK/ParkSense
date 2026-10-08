import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { API_BASE } from '../api/client'
import type { OccupancyChangedEvent } from '../types'

type Handler = (event: OccupancyChangedEvent) => void

const handlers = new Set<Handler>()
const statusListeners = new Set<(connected: boolean) => void>()
let client: Client | null = null
let connected = false

function emitStatus() {
  statusListeners.forEach((listener) => listener(connected))
}

export function connectSocket() {
  if (client) {
    return
  }
  client = new Client({
    brokerURL: `${API_BASE.replace(/^http/, 'ws')}/ws/websocket`,
    reconnectDelay: 5000,
    onConnect: () => {
      connected = true
      emitStatus()
      client?.subscribe('/topic/occupancy', (message) => {
        try {
          const event = JSON.parse(message.body) as OccupancyChangedEvent
          handlers.forEach((handler) => handler(event))
        } catch {
          /* ignore malformed frames */
        }
      })
    },
    onWebSocketClose: () => {
      connected = false
      emitStatus()
    },
    onDisconnect: () => {
      connected = false
      emitStatus()
    },
  })
  client.activate()
}

export function disconnectSocket() {
  client?.deactivate()
  client = null
  connected = false
  emitStatus()
}

export function useOccupancyStream(handler: Handler, options?: { debounceMs?: number }) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceMs = options?.debounceMs ?? 0

  useEffect(() => {
    connectSocket()
    const wrapped: Handler = (event) => {
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
    }
    handlers.add(wrapped)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      handlers.delete(wrapped)
    }
  }, [debounceMs])
}

export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(connected)
  useEffect(() => {
    const listener = (value: boolean) => setIsConnected(value)
    statusListeners.add(listener)
    return () => {
      statusListeners.delete(listener)
    }
  }, [])
  return isConnected
}
