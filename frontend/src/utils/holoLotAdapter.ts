import type { ParkingSpace, PublicSpace } from '../types'
import type { HoloLotBay } from '../three/HoloLotTypes'

export interface ChangedBay {
  /** Bumped once per live event; drives the single scanline sweep. */
  trigger: number
  /** The bay that changed, so the scene can animate just that one. */
  bayId: number | null
}

/**
 * `PublicSpace` (driver payload) and `ParkingSpace` (staff payload) both carry
 * the fields the scene needs, so they collapse to `HoloLotBay` here rather than
 * at every call site. The overloads keep each payload assignable without casts.
 */
export function toHoloLotBays(spaces: PublicSpace[]): HoloLotBay[]
export function toHoloLotBays(spaces: ParkingSpace[]): HoloLotBay[]
export function toHoloLotBays(spaces: Array<PublicSpace | ParkingSpace>): HoloLotBay[]
export function toHoloLotBays(spaces: Array<PublicSpace | ParkingSpace>): HoloLotBay[] {
  return spaces.map((space) => ({
    id: space.id,
    code: space.code ?? `#${space.id}`,
    status: space.status,
    proposed: 'verificationStatus' in space ? space.verificationStatus === 'PROPOSED' : false,
    positionX: space.positionX,
    positionY: space.positionY,
    polygon: space.polygon,
  }))
}
