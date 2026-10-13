import type { SurveyTerrain } from './hololit'

export type HoloLotStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'

export interface HoloLotBay {
  id: number
  code: string
  status: HoloLotStatus
  /** Staff-only: unverified bays render violet and dashed. */
  proposed?: boolean
  positionX?: number | null
  positionY?: number | null
  polygon?: string | null
}

/** Colours the scene reads out of the theme. Never hardcode hex at the call site. */
export interface HoloLotPalette {
  holo: string
  holoSoft: string
  arc: string
  hairline: string
  hairlineStrong: string
  canvas: string
  surface: string
  surfaceRaised: string
  textPrimary: string
  textSecondary: string
  status: {
    free: string
    occupied: string
    reserved: string
    offline: string
    proposed: string
  }
  /** Raised when the scene runs in light ("Blueprint") mode. */
  light: boolean
}

export type HoloLotMode = '3d' | '2d'

export interface HoloLotSceneInput {
  siteId: number
  zoneId: number
  bays: HoloLotBay[]
  seed?: string
  survey?: SurveyTerrain | null
  palette: HoloLotPalette
}

export { type SurveyTerrain }
