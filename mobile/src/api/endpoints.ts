import { client, API_BASE } from './client'
import type {
  AnalyticsSummary,
  AuthResponse,
  PaymentMethod,
  PriceQuote,
  MonitoringDevice,
  OccupancyEvent,
  Organization,
  MySession,
  ParkingSession,
  ParkingSite,
  ParkingSpace,
  ParkingZone,
  PlaceCategory,
  PlaceDetail,
  PlaceSummary,
  PublicSpace,
  PublicZone,
  Reservation,
  User,
  Vehicle,
  ZoneOccupancy,
} from '../types'

export const authApi = {
  login: async (email: string, password: string) =>
    (await client.post<AuthResponse>('/auth/login', { email, password })).data,
  register: async (payload: { fullName: string; email: string; password: string; phone?: string }) =>
    (await client.post<AuthResponse>('/auth/register', payload)).data,
  me: async () => (await client.get<User>('/auth/me')).data,
  updateProfile: async (payload: { fullName: string; phone?: string | null }) =>
    (await client.put<User>('/me', payload)).data,
  changePassword: async (currentPassword: string, newPassword: string) =>
    client.post('/me/password', { currentPassword, newPassword }),
}

export const zonesApi = {
  list: async (siteId?: number) =>
    (await client.get<ParkingZone[]>('/parking/zones', { params: { siteId } })).data,
  get: async (id: number) => (await client.get<ParkingZone>(`/parking/zones/${id}`)).data,
  occupancy: async (id: number) =>
    (await client.get<ZoneOccupancy>(`/parking/zones/${id}/occupancy`)).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<ParkingZone>('/parking/zones', payload)).data,
  remove: async (id: number) => client.delete(`/parking/zones/${id}`),
}

export const spacesApi = {
  list: async (zoneId?: number) =>
    (await client.get<ParkingSpace[]>('/parking/spaces', { params: { zoneId } })).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<ParkingSpace>('/parking/spaces', payload)).data,
  verify: async (id: number, status: string) =>
    (await client.patch<ParkingSpace>(`/parking/spaces/${id}/verify`, null, { params: { status } })).data,
  changeOperationalState: async (id: number, state: string) =>
    (await client.patch<ParkingSpace>(`/parking/spaces/${id}/operational-state`, null, { params: { state } }))
      .data,
  remove: async (id: number) => client.delete(`/parking/spaces/${id}`),
}

export const sitesApi = {
  list: async (organizationId?: number) =>
    (await client.get<ParkingSite[]>('/parking/sites', { params: { organizationId } })).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<ParkingSite>('/parking/sites', payload)).data,
}

export const organizationsApi = {
  list: async () => (await client.get<Organization[]>('/organizations')).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<Organization>('/organizations', payload)).data,
}

export const usersApi = {
  list: async () => (await client.get<User[]>('/users')).data,
  create: async (payload: Record<string, unknown>) => (await client.post<User>('/users', payload)).data,
}

export const vehiclesApi = {
  list: async (ownerId?: number) =>
    (await client.get<Vehicle[]>('/vehicles', { params: { ownerId } })).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<Vehicle>('/vehicles', payload)).data,
  update: async (id: number, payload: Record<string, unknown>) =>
    (await client.put<Vehicle>(`/vehicles/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/vehicles/${id}`),
}

export const devicesApi = {
  list: async (zoneId?: number) =>
    (await client.get<MonitoringDevice[]>('/devices', { params: { zoneId } })).data,
  create: async (payload: Record<string, unknown>) =>
    (await client.post<MonitoringDevice>('/devices', payload)).data,
}

export const reservationsApi = {
  list: async (userId?: number) =>
    (await client.get<Reservation[]>('/reservations', { params: { userId } })).data,
  get: async (id: number) => (await client.get<Reservation>(`/reservations/${id}`)).data,
  create: async (payload: {
    /** Staff only: book on behalf of this driver. */
    userId?: number | null
    vehicleId: number
    zoneId: number
    assignedSpaceId?: number | null
    startTime: string
    endTime: string
  }) => (await client.post<Reservation>('/reservations', payload)).data,
  cancel: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/cancel`)).data,
  complete: async (id: number) => (await client.patch<Reservation>(`/reservations/${id}/complete`)).data,
  checkIn: async (id: number) => (await client.post<Reservation>(`/reservations/${id}/check-in`)).data,
  checkOut: async (id: number) => (await client.post<MySession>(`/reservations/${id}/check-out`)).data,
}

export const occupancyApi = {
  record: async (payload: {
    spaceId: number
    state: 'OCCUPIED' | 'VACANT'
    source: string
    confidence?: number
    externalId?: string
    note?: string
  }) => (await client.post<OccupancyEvent>('/occupancy/events', payload)).data,
}

export const sessionsApi = {
  list: async (params: { status?: string; spaceId?: number } = {}) =>
    (await client.get<ParkingSession[]>('/sessions', { params })).data,
  activeForSpace: async (spaceId: number) =>
    (await client.get<ParkingSession | ''>(`/sessions/spaces/${spaceId}/active`)).data,
}

export const analyticsApi = {
  summary: async () => (await client.get<AnalyticsSummary>('/analytics/summary')).data,
}

export const placesApi = {
  search: async (params: { lat?: number; lng?: number; q?: string; category?: PlaceCategory }) =>
    (await client.get<PlaceSummary[]>('/places', { params })).data,
  get: async (siteId: number, params: { lat?: number; lng?: number } = {}) =>
    (await client.get<PlaceDetail>(`/places/${siteId}`, { params })).data,
  zones: async (siteId: number) =>
    (await client.get<PublicZone[]>(`/places/${siteId}/zones`)).data,
  spaces: async (siteId: number, zoneId: number) =>
    (await client.get<PublicSpace[]>(`/places/${siteId}/zones/${zoneId}/spaces`)).data,
  quote: async (siteId: number, start: string, end: string) =>
    (await client.get<PriceQuote>(`/places/${siteId}/quote`, { params: { start, end } })).data,
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

/** Resolve a server-relative image path (e.g. `/places/inorbit.jpg`) against the API host. */
export function coverUrl(path?: string | null) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}
