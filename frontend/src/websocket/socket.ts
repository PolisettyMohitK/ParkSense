import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { API_ORIGIN, TOKEN_KEY } from '../api/client'
import type { OccupancyChangedEvent } from '../types'

type Handler = (event: OccupancyChangedEvent) => void

const handlers = new Set<Handler>()
let client: Client | null = null
let connected = false

function setConnected(value: boolean) {
  if (connected === value) return
  connected = value
  window.dispatchEvent(new CustomEvent('ws:status', { detail: value }))
}

/** Opens the shared STOMP connection (idempotent). Requires a signed-in user. */
export function connectSocket() {
  if (client) {
    return
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    return
  }
  client = new Client({
    webSocketFactory: () => new SockJS(`${API_ORIGIN}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 20000,
    heartbeatOutgoing: 20000,
    onConnect: () => {
      setConnected(true)
      client?.subscribe('/topic/occupancy', (message) => {
        try {
          const event = JSON.parse(message.body) as OccupancyChangedEvent
          handlers.forEach((handler) => handler(event))
        } catch {
          /* ignore malformed frames */
        }
      })
    },
    onDisconnect: () => setConnected(false),
    onWebSocketClose: () => setConnected(false),
    onStompError: () => setConnected(false),
  })
  client.activate()
}

export function isSocketConnected() {
  return connected
}

export function subscribeOccupancy(handler: Handler) {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function disconnectSocket() {
  void client?.deactivate()
  client = null
  setConnected(false)
}
