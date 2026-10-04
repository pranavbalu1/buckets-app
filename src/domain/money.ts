/** Parse user input like "72.43", "$1,200", "5" into integer cents. Returns null if invalid. */
export function parseDollars(input: string): number | null {
  const s = input.trim().replace(/[$,\s]/g, '')
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s)
  if (!m) return null
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

/** Display only. Never use the result for math. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}