import axios from 'axios'

const VISION_BASE =
  import.meta.env.VITE_VISION_URL ?? (import.meta.env.DEV ? 'http://localhost:8001' : '/vision')

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
  const { data } = await axios.post<ProposeResult>(`${VISION_BASE}/slots/propose`, form)
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
  const { data } = await axios.post<DetectResult>(`${VISION_BASE}/occupancy/detect`, form)
  return data
}

export async function visionHealth(): Promise<{ status: string; backend: string }> {
  const { data } = await axios.get<{ status: string; backend: string }>(`${VISION_BASE}/health`)
  return data
}
