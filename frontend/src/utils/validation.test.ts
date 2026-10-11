import { describe, expect, it } from 'vitest'
import { bookingWindowProblem, coordinateProblem, isEmail, passwordProblem, plateProblem } from './validation'

const NOW = new Date('2026-10-11T10:00:00Z')
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000)

describe('bookingWindowProblem', () => {
  it('accepts a normal two hour booking', () => {
    expect(bookingWindowProblem({ start: hours(1), end: hours(3), now: NOW })).toBeNull()
  })

  it('rejects an end before the start', () => {
    expect(bookingWindowProblem({ start: hours(3), end: hours(1), now: NOW })).toMatch(/after start/)
  })

  it('rejects a start in the past but tolerates a few minutes of clock skew', () => {
    expect(bookingWindowProblem({ start: hours(-1), end: hours(1), now: NOW })).toMatch(/past/)
    expect(bookingWindowProblem({ start: hours(-0.05), end: hours(1), now: NOW })).toBeNull()
  })

  it('caps bookings at 24 hours and 30 days ahead', () => {
    expect(bookingWindowProblem({ start: hours(1), end: hours(26), now: NOW })).toMatch(/24 hours/)
    expect(bookingWindowProblem({ start: hours(24 * 31), end: hours(24 * 31 + 1), now: NOW })).toMatch(/30 days/)
  })

  it('flags unparseable dates', () => {
    expect(bookingWindowProblem({ start: new Date('nope'), end: hours(1), now: NOW })).toMatch(/Pick/)
  })
})

describe('field checks', () => {
  it('validates emails', () => {
    expect(isEmail('driver@parksense.dev')).toBe(true)
    expect(isEmail('not-an-email')).toBe(false)
  })

  it('requires 8+ character passwords that match their confirmation', () => {
    expect(passwordProblem('short')).toMatch(/8 characters/)
    expect(passwordProblem('longenough', 'different')).toMatch(/do not match/)
    expect(passwordProblem('longenough', 'longenough')).toBeNull()
  })

  it('validates Indian-style plates', () => {
    expect(plateProblem('TS09 AB 1234')).toBeNull()
    expect(plateProblem('TS09@AB')).toMatch(/letters, digits/)
    expect(plateProblem('   ')).toMatch(/required/)
  })

  it('range-checks coordinates and allows blanks', () => {
    expect(coordinateProblem('', 'lat')).toBeNull()
    expect(coordinateProblem('17.43', 'lat')).toBeNull()
    expect(coordinateProblem('95', 'lat')).toMatch(/Latitude/)
    expect(coordinateProblem('-181', 'lng')).toMatch(/Longitude/)
  })
})
