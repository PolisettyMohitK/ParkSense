import { File } from 'expo-file-system'
import { VISION_BASE } from './client'

export interface UploadFile {
  uri: string
  name: string
  type: string
}

/**
 * Expo SDK's global fetch encodes multipart bodies itself and rejects React
 * Native's legacy `{ uri, name, type }` parts with "Unsupported FormDataPart".
 * `expo-file-system`'s File exposes name/type/bytes(), which it does accept.
 */
function toFilePart(file: UploadFile): Blob {
  return new File(file.uri) as unknown as Blob
}

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

async function postForm<T>(path: string, build: (form: FormData) => void): Promise<T> {
  const form = new FormData()
  build(form)
  const response = await fetch(`${VISION_BASE}${path}`, { method: 'POST', body: form })
  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) {
        detail = body.detail
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Vision service error (${detail})`)
  }
  return (await response.json()) as T
}

export function proposeSlots(
  file: UploadFile,
  options: { mode: string; rows: number; cols: number },
): Promise<ProposeResult> {
  return postForm<ProposeResult>('/slots/propose', (form) => {
    form.append('file', toFilePart(file))
    form.append('mode', options.mode)
    form.append('rows', String(options.rows))
    form.append('cols', String(options.cols))
    form.append('return_overlay', 'true')
  })
}

export function detectOccupancy(
  file: UploadFile,
  slots: DetectSlot[],
  threshold?: number | null,
): Promise<DetectResult> {
  return postForm<DetectResult>('/occupancy/detect', (form) => {
    form.append('file', toFilePart(file))
    form.append('slots', JSON.stringify(slots))
    if (threshold != null) {
      form.append('threshold', String(threshold))
    }
  })
}

export async function visionHealth(): Promise<{ status: string; backend: string }> {
  const response = await fetch(`${VISION_BASE}/health`)
  if (!response.ok) {
    throw new Error('Vision service unavailable')
  }
  return response.json()
}
