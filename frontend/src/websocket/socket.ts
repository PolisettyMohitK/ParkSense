import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { OccupancyChangedEvent } from '../types'

type Handler = (event: OccupancyChangedEvent) => void

const handlers = new Set<Handler>()
let client: Client | null = null
let connected = false

export function connectSocket() {
  if (client) {
    return
  }
  client = new Client({
    webSocketFactory: () => new SockJS('/ws'),
    reconnectDelay: 5000,
    onConnect: () => {
      connected = true
      window.dispatchEvent(new CustomEvent('ws:status', { detail: true }))
      client?.subscribe('/topic/occupancy', (message) => {
        try {
          const event = JSON.parse(message.body) as OccupancyChangedEvent
          handlers.forEach((handler) => handler(event))
        } catch {
          /* ignore malformed frames */
        }
      })
    },
    onDisconnect: () => {
      connected = false
      window.dispatchEvent(new CustomEvent('ws:status', { detail: false }))
    },
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
  client?.deactivate()
  client = null
  connected = false
  window.dispatchEvent(new CustomEvent('ws:status', { detail: false }))
}
