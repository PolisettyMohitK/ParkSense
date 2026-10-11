const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function formatMoney(amount: number | null | undefined, currency = 'INR'): string {
  if (amount === null || amount === undefined) return '—'
  if (currency === 'INR') return rupees.format(amount)
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** Value for an <input type="datetime-local"> in the browser's zone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`
}

/** Next quarter hour from now, and two hours after it - a sensible default booking window. */
export function defaultBookingWindow(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(now)
  start.setSeconds(0, 0)
  start.setMinutes(Math.ceil((start.getMinutes() + 1) / 15) * 15)
  const end = new Date(start.getTime() + 2 * 3_600_000)
  return { start: toLocalInputValue(start), end: toLocalInputValue(end) }
}

export function parsePositiveInt(value: string | undefined | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return parsed > 0 && Number.isSafeInteger(parsed) ? parsed : null
}
