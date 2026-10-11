import { describe, expect, it } from 'vitest'
import { defaultBookingWindow, formatDuration, formatMoney, parsePositiveInt } from './format'

describe('format helpers', () => {
  it('formats rupees without decimals', () => {
    expect(formatMoney(120)).toBe('₹120')
    expect(formatMoney(null)).toBe('—')
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(135)).toBe('2 h 15 min')
  })

  it('suggests a two hour slot starting on the next quarter hour', () => {
    const { start, end } = defaultBookingWindow(new Date(2026, 9, 11, 10, 7))
    expect(start).toBe('2026-10-11T10:15')
    expect(end).toBe('2026-10-11T12:15')
  })

  it('only accepts positive integer ids', () => {
    expect(parsePositiveInt('42')).toBe(42)
    expect(parsePositiveInt('abc')).toBeNull()
    expect(parsePositiveInt('0')).toBeNull()
    expect(parsePositiveInt(undefined)).toBeNull()
  })
})
