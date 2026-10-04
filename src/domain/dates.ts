/** Month keys look like '2026-10'. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + n
  const year = Math.floor(idx / 12)
  const mon = (idx % 12) + 1
  return `${year}-${String(mon).padStart(2, '0')}`
}

export const monthOf = (date: string): string => date.slice(0, 7)

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date in the user's local timezone, 'YYYY-MM-DD'. */
export function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const currentMonth = (): string => todayString().slice(0, 7)

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/** 'Fri, Oct 3, 2026' */
export function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}