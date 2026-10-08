import { client } from './client'
import type { PlaceCategory, PlaceDetail, PlaceSummary, PublicSpace, PublicZone } from '../types'

export const placesApi = {
  search: async (params: { lat?: number; lng?: number; q?: string; category?: PlaceCategory }) =>
    (await client.get<PlaceSummary[]>('/places', { params })).data,
  get: async (siteId: number, params: { lat?: number; lng?: number } = {}) =>
    (await client.get<PlaceDetail>(`/places/${siteId}`, { params })).data,
  zones: async (siteId: number) =>
    (await client.get<PublicZone[]>(`/places/${siteId}/zones`)).data,
  spaces: async (siteId: number, zoneId: number) =>
    (await client.get<PublicSpace[]>(`/places/${siteId}/zones/${zoneId}/spaces`)).data,
}

export const AMENITY_LABEL: Record<string, string> = {
  EV_CHARGING: 'EV charging',
  COVERED: 'Covered',
  CCTV: 'CCTV',
  VALET: 'Valet',
}

export const CATEGORY_LABEL: Record<string, string> = {
  CAFE: 'Café',
  RESTAURANT: 'Restaurant',
  MALL: 'Mall',
  OFFICE: 'Office',
  HOTEL: 'Hotel',
  HOSPITAL: 'Hospital',
  EVENT_VENUE: 'Event venue',
  OTHER: 'Parking',
}
