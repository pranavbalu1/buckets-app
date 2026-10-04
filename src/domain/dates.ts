/** Month keys look like '2026-10'. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  const year = Math.floor(idx / 12)
  const mon = (idx % 12) + 1
  return `${year}-${String(mon).padStart(2, '0')}`
}

export const monthOf = (date: string): string => date.slice(0, 7)