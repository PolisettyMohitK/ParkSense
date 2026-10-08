import * as FileSystem from 'expo-file-system/legacy'
import { VISION_BASE } from './client'

export interface UploadFile {
  uri: string
  name: string
  type: string
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

async function uploadMultipart<T>(
  path: string,
  file: UploadFile,
  parameters: Record<string, string>,
): Promise<T> {
  const url = `${VISION_BASE}${path}`
  const response = await FileSystem.uploadAsync(url, file.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters,
  })

  if (response.status < 200 || response.status >= 300) {
    let detail = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(response.body) as { detail?: string }
      if (parsed?.detail) {
        detail = parsed.detail
      }
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`Vision service error (${detail})`)
  }

  return JSON.parse(response.body) as T
}

export function proposeSlots(
  file: UploadFile,
  options: { mode: string; rows: number; cols: number },
): Promise<ProposeResult> {
  return uploadMultipart<ProposeResult>('/slots/propose', file, {
    mode: options.mode,
    rows: String(options.rows),
    cols: String(options.cols),
    return_overlay: 'true',
  })
}

export function detectOccupancy(
  file: UploadFile,
  slots: DetectSlot[],
  threshold?: number | null,
): Promise<DetectResult> {
  const params: Record<string, string> = {
    slots: JSON.stringify(slots),
  }
  if (threshold != null) {
    params.threshold = String(threshold)
  }
  return uploadMultipart<DetectResult>('/occupancy/detect', file, params)
}

export async function visionHealth(): Promise<{ status: string; backend: string }> {
  const response = await fetch(`${VISION_BASE}/health`)
  if (!response.ok) {
    throw new Error('Vision service unavailable')
  }
  return response.json()
}
