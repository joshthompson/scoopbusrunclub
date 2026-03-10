export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function formatDate(date: Date) {
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  return `${ordinal(day)} ${month} ${date.getFullYear()}`
}

export function formatName(name: string) {
  return name
    .toLowerCase()
    .replace(/(?<=^|[\s-])\w/g, (char) => char.toUpperCase())
}

/** Parses a time string like "23:45" or "1:23:45" into total seconds. */
export function parseTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return Infinity
}
