/** Parse user input like "72.43", "$1,200", "5" into integer cents. Returns null if invalid. */
export function parseDollars(input: string): number | null {
  const s = input.trim()
  const normalized = s.startsWith('$') ? s.slice(1) : s
  const m = /^((?:\d{1,3}(?:,\d{3})+)|\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!m) return null
  const wholeDollars = Number(m[1]?.replaceAll(',', ''))
  const cents = wholeDollars * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

/** Like parseDollars, but allows a leading + or -. Returns null if invalid or zero. */
export function parseSignedDollars(input: string): number | null {
  const s = input.trim().replace(/\s+/g, '')
  const negative = s.startsWith('-')
  const cents = parseDollars(s.replace(/^[+-]/, ''))
  if (cents === null || cents === 0) return null
  return negative ? -cents : cents
}

/** Cents as an editable number like "12.50" (no currency symbol). */
export const centsToInput = (cents: number): string => (cents / 100).toFixed(2)

/** Display only. Never use the result for math. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}
