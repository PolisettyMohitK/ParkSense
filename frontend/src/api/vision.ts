import axios from 'axios'
import { TOKEN_KEY } from './client'

const VISION_BASE =
  import.meta.env.VITE_VISION_URL ?? (import.meta.env.DEV ? 'http://localhost:8001' : '/vision')

/** The vision service verifies the same JWT as the API and only serves staff accounts. */
const vision = axios.create({ baseURL: VISION_BASE, timeout: 120000 })
vision.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ProposedSlot {
  id: string
  label: string
  confidence: number
  polygon: number[][]
  normalizedPolygon: number[][]
}

export interface ProposeResult {
  method: string
  note: string
  imageWidth: number
  imageHeight: number
  count: number
  slots: ProposedSlot[]
  overlay?: string
}

export interface Detection {
  slotId: string
  spaceId: number | null
  state: 'OCCUPIED' | 'VACANT'
  score: number
  confidence: number
  method: string
}

export interface DetectResult {
  threshold: number
  occupied: number
  vacant: number
  detections: Detection[]
  overlay: string
}

export interface DetectSlot {
  id: string
  space_id: number
  polygon: number[][]
}

export async function proposeSlots(
  file: File,
  options: { mode: string; rows: number; cols: number; roi?: string },
): Promise<ProposeResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('mode', options.mode)
  form.append('rows', String(options.rows))
  form.append('cols', String(options.cols))
  form.append('return_overlay', 'true')
  if (options.roi) {
    form.append('roi', options.roi)
  }
  const { data } = await vision.post<ProposeResult>('/slots/propose', form)
  return data
}

export async function detectOccupancy(
  file: File,
  slots: DetectSlot[],
  reference?: File | null,
  threshold?: number | null,
): Promise<DetectResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('slots', JSON.stringify(slots))
  if (reference) {
    form.append('reference', reference)
  }
  if (threshold != null) {
    form.append('threshold', String(threshold))
  }
  const { data } = await vision.post<DetectResult>('/occupancy/detect', form)
  return data
}

export async function visionHealth(): Promise<{ status: string; backend: string }> {
  const { data } = await vision.get<{ status: string; backend: string }>('/health')
  return data
}

export interface SurveyProfile {
  key: string
  label: string
  bay_width_m: number
  bay_length_m: number
  aisle_width_m: number
  angles_deg: number[]
  max_slope_pct: number
}

export const surveyVisionApi = {
  profiles: async () =>
    (await vision.get<SurveyProfile[]>('/survey/profiles')).data,
  uploadBundle: async (file: File, profile?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (profile) form.append('profile', profile)
    return (await vision.post('/surveys', form)).data
  },
  getSurvey: async (jobId: string) =>
    (await vision.get(`/surveys/${jobId}`)).data,
  /** Used in <img>/<a> tags, which cannot send headers, so the token rides in the query string. */
  artifactUrl: (jobId: string, name: string) =>
    `${VISION_BASE}/surveys/${jobId}/artifacts/${name}?access_token=${encodeURIComponent(
      localStorage.getItem(TOKEN_KEY) ?? '',
    )}`,
  relayout: async (jobId: string, profile: string) => {
    const form = new FormData()
    form.append('profile', profile)
    return (await vision.post(`/surveys/${jobId}/layout`, form)).data
  },
}

