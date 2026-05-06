type PriceInput = {
  crc: number | null
  usd: number | null
}

export function formatPrice({ crc, usd }: PriceInput): string {
  if (crc != null) {
    // Manual thousand-separator formatting with dots (de-DE style); avoids locale variance.
    const formatted = String(crc).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `₡${formatted}`
  }
  if (usd != null) {
    return `$${usd}`
  }
  return 'Consultar'
}

export function formatTimeSince(isoDate: string, now: Date = new Date()): string {
  const past = new Date(isoDate)
  const diffMs = now.getTime() - past.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffHour < 1) return `Hace ${diffMin}m`
  if (diffHour < 6) return `Hace ${diffHour}h`
  if (diffDay < 1) return 'Hoy'
  if (diffDay === 1) return 'Hace 1 día'
  return `Hace ${diffDay} días`
}
