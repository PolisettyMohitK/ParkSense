export type Role = 'ADMIN' | 'MANAGER' | 'USER'
export type ZoneType = 'STRUCTURED' | 'UNSTRUCTURED'
export type SpaceStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'
export type OperationalState = 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'MAINTENANCE'
export type VerificationStatus = 'PROPOSED' | 'VERIFIED' | 'REJECTED'
export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
export type EventSource = 'CAMERA' | 'SENSOR' | 'MANUAL' | 'QR' | 'PHOTO'
export type OccupancyState = 'OCCUPIED' | 'VACANT' | 'UNKNOWN'
export type DeviceType = 'CAMERA' | 'SENSOR' | 'MANUAL'
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
export type VehicleType = 'CAR' | 'BIKE' | 'SUV' | 'TRUCK' | 'EV' | 'OTHER'
export type SessionStatus = 'ACTIVE' | 'COMPLETED'

export interface Organization {
  id: number
  name: string
  code: string
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  fullName: string
  email: string
  role: Role
  phone?: string | null
  enabled: boolean
  organizationId?: number | null
  organizationName?: string | null
  createdAt: string
}

export interface Vehicle {
  id: number
  ownerId: number
  ownerName: string
  plateNumber: string
  make?: string | null
  model?: string | null
  color?: string | null
  type: VehicleType
  active: boolean
  createdAt: string
}

export interface ParkingSite {
  id: number
  organizationId: number
  organizationName: string
  name: string
  code: string
  address?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  category?: PlaceCategory | null
  description?: string | null
  coverImageUrl?: string | null
  hourlyRate?: number | null
  openingHours?: string | null
  amenities?: string | null
  active: boolean
  createdAt: string
}

export interface ParkingZone {
  id: number
  siteId: number
  siteName: string
  name: string
  code: string
  type: ZoneType
  floor?: string | null
  capacity?: number | null
  mapImageUrl?: string | null
  description?: string | null
  active: boolean
  totalSpaces: number
  occupiedSpaces: number
  availableSpaces: number
  createdAt: string
}

export interface ParkingSpace {
  id: number
  zoneId: number
  zoneName: string
  code?: string | null
  status: SpaceStatus
  occupancyState: OccupancyState
  operationalState: OperationalState
  reserved: boolean
  verificationStatus: VerificationStatus
  positionX?: number | null
  positionY?: number | null
  polygon?: string | null
  label?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface OccupancyEvent {
  id: number
  spaceId: number
  spaceCode?: string | null
  zoneId: number
  zoneName: string
  state: OccupancyState
  source: EventSource
  confidence?: number | null
  actorName?: string | null
  deviceName?: string | null
  externalId?: string | null
  note?: string | null
  occurredAt: string
  createdAt: string
}

export interface Reservation {
  id: number
  code: string
  userId: number
  userName: string
  vehicleId: number
  plateNumber: string
  zoneId: number
  zoneName: string
  assignedSpaceId?: number | null
  assignedSpaceCode?: string | null
  status: ReservationStatus
  startTime: string
  endTime: string
  createdAt: string
}

export interface ParkingSession {
  id: number
  code: string
  spaceId: number
  spaceCode?: string | null
  zoneId: number
  zoneName: string
  vehicleId?: number | null
  plateNumber?: string | null
  userId?: number | null
  userName?: string | null
  reservationId?: number | null
  reservationCode?: string | null
  status: SessionStatus
  source: EventSource
  checkInAt: string
  checkOutAt?: string | null
  durationMinutes?: number | null
  note?: string | null
}

export interface MonitoringDevice {
  id: number
  zoneId: number
  zoneName: string
  name: string
  code: string
  type: DeviceType
  status: DeviceStatus
  identifier?: string | null
  streamUrl?: string | null
  lastSeenAt?: string | null
  active: boolean
  createdAt: string
}

export interface ZoneOccupancy {
  zoneId: number
  zoneName: string
  zoneCode: string
  totalSpaces: number
  occupied: number
  available: number
  reserved: number
  outOfService: number
  occupancyRate: number
}

export interface AuthResponse {
  token: string
  tokenType: string
  expiresInMs: number
  user: User
}

export interface AnalyticsSummary {
  zones: number
  spaces: number
  occupied: number
  available: number
  reserved: number
  outOfService: number
  utilizationRate: number
  occupancyEvents: number
  activeReservations: number
  activeSessions: number
  averageSessionMinutes: number
  devices: number
}

export interface ApiError {
  status: number
  error: string
  message: string
  path?: string
  fieldErrors?: Record<string, string> | null
}

export type PlaceCategory =
  | 'CAFE'
  | 'RESTAURANT'
  | 'MALL'
  | 'OFFICE'
  | 'HOTEL'
  | 'HOSPITAL'
  | 'EVENT_VENUE'
  | 'OTHER'

export interface PlaceSummary {
  siteId: number
  name: string
  organizationName?: string | null
  category?: PlaceCategory | null
  address?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
  distanceKm?: number | null
  coverImageUrl?: string | null
  hourlyRate?: number | null
  openingHours?: string | null
  amenities: string[]
  zoneCount: number
  totalSpaces: number
  availableSpaces: number
  occupiedSpaces: number
}

export interface PlaceDetail {
  summary: PlaceSummary
  description?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  zones: ParkingZone[]
}

export interface OccupancyChangedEvent {
  spaceId: number
  spaceCode?: string | null
  zoneId: number
  zoneName: string
  state: OccupancyState
  source: EventSource
  occurredAt: string
}
