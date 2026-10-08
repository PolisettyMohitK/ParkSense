import { client } from './client'
import type { Organization, ParkingSite, ParkingSpace, ParkingZone, ZoneOccupancy } from '../types'

export const organizationsApi = {
  list: async () => (await client.get<Organization[]>('/organizations')).data,
  get: async (id: number) => (await client.get<Organization>(`/organizations/${id}`)).data,
  create: async (payload: Partial<Organization>) =>
    (await client.post<Organization>('/organizations', payload)).data,
  update: async (id: number, payload: Partial<Organization>) =>
    (await client.put<Organization>(`/organizations/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/organizations/${id}`),
}

export const sitesApi = {
  list: async (organizationId?: number) =>
    (await client.get<ParkingSite[]>('/parking/sites', { params: { organizationId } })).data,
  create: async (payload: Partial<ParkingSite>) =>
    (await client.post<ParkingSite>('/parking/sites', payload)).data,
  update: async (id: number, payload: Partial<ParkingSite>) =>
    (await client.put<ParkingSite>(`/parking/sites/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/parking/sites/${id}`),
}

export const zonesApi = {
  list: async (siteId?: number) =>
    (await client.get<ParkingZone[]>('/parking/zones', { params: { siteId } })).data,
  get: async (id: number) => (await client.get<ParkingZone>(`/parking/zones/${id}`)).data,
  occupancy: async (id: number) =>
    (await client.get<ZoneOccupancy>(`/parking/zones/${id}/occupancy`)).data,
  create: async (payload: Partial<ParkingZone>) =>
    (await client.post<ParkingZone>('/parking/zones', payload)).data,
  update: async (id: number, payload: Partial<ParkingZone>) =>
    (await client.put<ParkingZone>(`/parking/zones/${id}`, payload)).data,
  remove: async (id: number) => client.delete(`/parking/zones/${id}`),
}

export const spacesApi = {
  list: async (zoneId?: number) =>
    (await client.get<ParkingSpace[]>('/parking/spaces', { params: { zoneId } })).data,
  create: async (payload: Partial<ParkingSpace>) =>
    (await client.post<ParkingSpace>('/parking/spaces', payload)).data,
  update: async (id: number, payload: Partial<ParkingSpace>) =>
    (await client.put<ParkingSpace>(`/parking/spaces/${id}`, payload)).data,
  verify: async (id: number, status: string) =>
    (await client.patch<ParkingSpace>(`/parking/spaces/${id}/verify`, null, { params: { status } })).data,
  changeOperationalState: async (id: number, state: string) =>
    (await client.patch<ParkingSpace>(`/parking/spaces/${id}/operational-state`, null, { params: { state } })).data,
  remove: async (id: number) => client.delete(`/parking/spaces/${id}`),
}

export interface SiteSurvey {
  id: number
  siteId: number
  siteName: string
  surveyJobId: string
  profile: string
  status: string
  imported: boolean
  importedSpaceCount?: number | null
  importedAt?: string | null
  layoutJson?: string | null
  reportJson?: string | null
  createdAt: string
}

export interface SurveyImportResult {
  surveyId: number
  zoneId: number
  zoneName: string
  spacesCreated: number
}

export const surveysApi = {
  listBySite: async (siteId: number) =>
    (await client.get<SiteSurvey[]>(`/parking/sites/${siteId}/surveys`)).data,
  get: async (siteId: number, surveyId: number) =>
    (await client.get<SiteSurvey>(`/parking/sites/${siteId}/surveys/${surveyId}`)).data,
  create: async (siteId: number, payload: { surveyJobId: string; profile: string; layoutJson?: string; reportJson?: string }) =>
    (await client.post<SiteSurvey>(`/parking/sites/${siteId}/surveys`, payload)).data,
  importSpaces: async (siteId: number, surveyId: number) =>
    (await client.post<SurveyImportResult>(`/parking/sites/${siteId}/surveys/${surveyId}/import`)).data,
}

