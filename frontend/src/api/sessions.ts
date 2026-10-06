import { client } from './client'
import type { ParkingSession, SessionStatus } from '../types'

export const sessionsApi = {
  list: async (params: { status?: SessionStatus; spaceId?: number } = {}) =>
    (await client.get<ParkingSession[]>('/sessions', { params })).data,
  get: async (id: number) => (await client.get<ParkingSession>(`/sessions/${id}`)).data,
  activeForSpace: async (spaceId: number) =>
    (await client.get<ParkingSession | ''>(`/sessions/spaces/${spaceId}/active`)).data,
}
