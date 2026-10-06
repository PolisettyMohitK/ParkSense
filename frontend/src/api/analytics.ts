import { client } from './client'
import type { AnalyticsSummary, HeatmapCell, UtilizationPoint } from '../types'

export interface AnalyticsParams {
  zoneId?: number
  from?: string
  to?: string
}

export const analyticsApi = {
  summary: async () => (await client.get<AnalyticsSummary>('/analytics/summary')).data,
  utilization: async (params: AnalyticsParams = {}) =>
    (await client.get<UtilizationPoint[]>('/analytics/utilization', { params })).data,
  heatmap: async (params: AnalyticsParams = {}) =>
    (await client.get<HeatmapCell[]>('/analytics/heatmap', { params })).data,
}
