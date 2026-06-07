/** Truncate a string to maxLen characters, appending "…" if truncated. */
export function truncate(s: string | null | undefined, maxLen: number): string {
  if (!s) return ''
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen - 1) + '…'
}

/** Pad a string to exactly `len` characters (truncate or pad with spaces). */
export function pad(s: string | null | undefined, len: number): string {
  const str = s ?? ''
  if (str.length >= len) return str.slice(0, len)
  return str + ' '.repeat(len - str.length)
}

/** Center a string within a fixed width. */
export function center(s: string, width: number): string {
  if (s.length >= width) return s.slice(0, width)
  const total = width - s.length
  const left = Math.floor(total / 2)
  const right = total - left
  return ' '.repeat(left) + s + ' '.repeat(right)
}

/** Strip HTML tags from a string (basic). Re-exports magister's htmlToText-like behavior. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
