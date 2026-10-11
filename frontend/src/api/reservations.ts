import { client } from './client'
import type { MySession, Reservation } from '../types'

export interface ReservationPayload {
  /** Staff only: book on behalf of this driver. Drivers always book for themselves. */
  userId?: number | null
  vehicleId: number
  zoneId: number
  assignedSpaceId?: number | null
  startTime: string
  endTime: string
}

export const reservationsApi = {
  list: async (userId?: number) =>
    (await client.get<Reservation[]>('/reservations', { params: { userId } })).data,
  get: async (id: number) => (await client.get<Reservation>(`/reservations/${id}`)).data,
  create: async (payload: ReservationPayload) =>
    (await client.post<Reservation>('/reservations', payload)).data,
  cancel: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/cancel`)).data,
  complete: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/complete`)).data,
  checkIn: async (id: number) => (await client.post<Reservation>(`/reservations/${id}/check-in`)).data,
  checkOut: async (id: number) => (await client.post<MySession>(`/reservations/${id}/check-out`)).data,
  remove: async (id: number) => client.delete(`/reservations/${id}`),
}
