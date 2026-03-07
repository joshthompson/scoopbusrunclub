export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function formatDate(date: Date) {
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  return `${ordinal(day)} ${month}`
}

export function formatName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase()).join(' ')
}
