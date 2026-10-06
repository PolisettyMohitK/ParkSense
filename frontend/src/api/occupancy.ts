import { client } from './client'
import type { EventSource, OccupancyEvent, OccupancyState } from '../types'

export interface OccupancyEventPayload {
  spaceId: number
  state: OccupancyState
  source: EventSource
  confidence?: number
  note?: string
  externalId?: string
  occurredAt?: string
}

export const occupancyApi = {
  record: async (payload: OccupancyEventPayload) =>
    (await client.post<OccupancyEvent>('/occupancy/events', payload)).data,
  latest: async (spaceId: number) =>
    (await client.get<OccupancyEvent | ''>(`/occupancy/spaces/${spaceId}/latest`)).data,
  history: async (spaceId: number) =>
    (await client.get<OccupancyEvent[]>(`/occupancy/spaces/${spaceId}/history`)).data,
  zoneEvents: async (zoneId: number, from?: string, to?: string) =>
    (await client.get<OccupancyEvent[]>(`/occupancy/zones/${zoneId}`, { params: { from, to } })).data,
}
