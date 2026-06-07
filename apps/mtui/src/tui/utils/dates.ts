/** Returns Monday of the week at `offset` weeks from the base date. */
export function getWeekStart(base: Date, offset = 0): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day // offset to Monday
  d.setDate(d.getDate() + diff + offset * 7)
  return d
}

/** Returns the 7 dates (Mon–Sun) for the given weekStart. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

/** Returns { from, to } as Date objects for the week at `offset`. */
export function getWeekRange(offset: number): { from: Date; to: Date } {
  const from = getWeekStart(new Date(), offset)
  const to = new Date(from)
  to.setDate(to.getDate() + 6)
  return { from, to }
}

/** Format as YYYY-MM-DD for the API (local time, not UTC). */
export function toApiDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format as "Mon 14 Apr" for column headers. */
export function formatDayHeader(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

/** Format as "14 Apr" (short). */
export function formatDayShort(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

/** Format as "14 Apr 2026" for display. */
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

/** Format as "14:32". */
export function formatTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Returns ISO week number. */
export function getISOWeek(d: Date): number {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

/** Returns true if two dates are the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

/** Returns true if a date is today. */
export function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

/** Parse an ISO datetime string, return null on failure. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Format a deadline relative to now: "in 2 days", "2 days ago", "today". */
export function formatRelativeDeadline(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'in 1 day'
  if (diffDays > 1) return `in ${diffDays} days`
  if (diffDays === -1) return '1 day ago'
  return `${Math.abs(diffDays)} days ago`
}
