import type { PlaceCategory } from '../types'

export const queryKeys = {
  places: {
    all: ['places'] as const,
    list: (params?: { lat?: number; lng?: number; q?: string; category?: PlaceCategory }) =>
      ['places', 'list', params] as const,
    detail: (siteId: number, params?: { lat?: number; lng?: number }) =>
      ['places', 'detail', siteId, params] as const,
    zones: (siteId: number) => ['places', siteId, 'zones'] as const,
    spaces: (siteId: number, zoneId: number) => ['places', siteId, 'zones', zoneId, 'spaces'] as const,
  },
  mySessions: {
    all: ['mySessions'] as const,
    active: ['mySessions', 'active'] as const,
  },
  zones: {
    all: ['zones'] as const,
    list: (siteId?: number) => ['zones', 'list', siteId] as const,
    detail: (id: number) => ['zones', 'detail', id] as const,
    occupancy: (id: number) => ['zones', 'occupancy', id] as const,
  },
  spaces: {
    all: ['spaces'] as const,
    list: (zoneId?: number) => ['spaces', 'list', zoneId] as const,
  },
  reservations: {
    all: ['reservations'] as const,
    list: (userId?: number) => ['reservations', 'list', userId] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (params?: { status?: string; spaceId?: number }) => ['sessions', 'list', params] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: ['analytics', 'summary'] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (ownerId?: number) => ['vehicles', 'list', ownerId] as const,
  },
} as const
