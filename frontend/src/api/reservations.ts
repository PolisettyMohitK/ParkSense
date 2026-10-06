import { client } from './client'
import type { Reservation } from '../types'

export interface ReservationPayload {
  userId: number
  vehicleId: number
  zoneId: number
  assignedSpaceId?: number | null
  startTime: string
  endTime: string
}

export const reservationsApi = {
  list: async (userId?: number) =>
    (await client.get<Reservation[]>('/reservations', { params: { userId } })).data,
  create: async (payload: ReservationPayload) =>
    (await client.post<Reservation>('/reservations', payload)).data,
  cancel: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/cancel`)).data,
  complete: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/complete`)).data,
  remove: async (id: number) => client.delete(`/reservations/${id}`),
}
