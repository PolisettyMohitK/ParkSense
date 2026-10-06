import { client } from './client'
import type { MonitoringDevice, User, Vehicle } from '../types'

export const vehiclesApi = {
  list: async (ownerId?: number) =>
    (await client.get<Vehicle[]>('/vehicles', { params: { ownerId } })).data,
  create: async (payload: Partial<Vehicle>) =>
    (await client.post<Vehicle>('/vehicles', payload)).data,
  update: async (id: number, payload: Partial<Vehicle>) =>
    (await client.put<Vehicle>(`/vehicles/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/vehicles/${id}`),
}

export const usersApi = {
  list: async () => (await client.get<User[]>('/users')).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<User>('/users', payload)).data,
  update: async (id: number, payload: Record<string, unknown>) =>
    (await client.put<User>(`/users/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/users/${id}`),
}

export const devicesApi = {
  list: async (zoneId?: number) =>
    (await client.get<MonitoringDevice[]>('/devices', { params: { zoneId } })).data,
  create: async (payload: Partial<MonitoringDevice>) =>
    (await client.post<MonitoringDevice>('/devices', payload)).data,
  update: async (id: number, payload: Partial<MonitoringDevice>) =>
    (await client.put<MonitoringDevice>(`/devices/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/devices/${id}`),
}
