import { client } from './client'
import type { MySession, ParkingSession, PaymentMethod, SessionStatus } from '../types'

export const sessionsApi = {
  list: async (params: { status?: SessionStatus; spaceId?: number } = {}) =>
    (await client.get<ParkingSession[]>('/sessions', { params })).data,
  get: async (id: number) => (await client.get<ParkingSession>(`/sessions/${id}`)).data,
  activeForSpace: async (spaceId: number) =>
    (await client.get<ParkingSession | ''>(`/sessions/spaces/${spaceId}/active`)).data,
  /** Staff records an offline payment collected at the gate. */
  recordPayment: async (id: number, method: PaymentMethod) =>
    (await client.post<ParkingSession>(`/sessions/${id}/pay`, { method })).data,
}

export const mySessionsApi = {
  list: async () => (await client.get<MySession[]>('/me/sessions')).data,
  active: async () => {
    const { data } = await client.get<MySession | ''>('/me/sessions/active')
    return data || null
  },
  /** Simulated settlement - no card or account details are collected. */
  pay: async (id: number, method: PaymentMethod) =>
    (await client.post<MySession>(`/me/sessions/${id}/pay`, { method })).data,
}
