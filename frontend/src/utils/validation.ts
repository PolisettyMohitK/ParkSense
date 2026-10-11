/** Client-side checks that mirror the backend's bean validation, so users see problems before submitting. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PLATE_PATTERN = /^[A-Za-z0-9 -]+$/

export const MIN_PASSWORD_LENGTH = 8

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (confirm !== undefined && confirm !== password) {
    return 'Passwords do not match'
  }
  return null
}

export function plateProblem(plate: string): string | null {
  const trimmed = plate.trim()
  if (!trimmed) return 'Plate number is required'
  if (trimmed.length > 30) return 'Too long'
  if (!PLATE_PATTERN.test(trimmed)) return 'Use letters, digits, spaces or hyphens only'
  return null
}

export function phoneProblem(phone: string): string | null {
  if (!phone.trim()) return null
  return /^[+()\d\s-]{6,30}$/.test(phone.trim()) ? null : 'Enter a valid phone number'
}

export function coordinateProblem(value: string, kind: 'lat' | 'lng'): string | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  const limit = kind === 'lat' ? 90 : 180
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) {
    return kind === 'lat' ? 'Latitude must be between -90 and 90' : 'Longitude must be between -180 and 180'
  }
  return null
}

export interface BookingWindowCheck {
  start: Date
  end: Date
  now?: Date
}

/** Same rules the server enforces: end after start, not in the past, at most 24h, within 30 days. */
export function bookingWindowProblem({ start, end, now = new Date() }: BookingWindowCheck): string | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Pick a start and end time'
  if (end <= start) return 'End time must be after start time'
  if (start.getTime() < now.getTime() - 5 * 60_000) return 'Start time cannot be in the past'
  if (end.getTime() - start.getTime() > 24 * 3_600_000) return 'A booking can last at most 24 hours'
  if (start.getTime() - now.getTime() > 30 * 24 * 3_600_000) return 'Bookings open 30 days in advance'
  return null
}
