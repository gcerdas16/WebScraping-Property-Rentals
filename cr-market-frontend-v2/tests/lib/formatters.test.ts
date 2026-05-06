import { describe, it, expect } from 'vitest'
import { formatPrice, formatTimeSince } from '@/lib/formatters'

describe('formatPrice', () => {
  it('formats CRC with thousand separators (dots) and ₡ prefix', () => {
    expect(formatPrice({ crc: 320000, usd: null })).toBe('₡320.000')
  })

  it('formats USD with $ prefix when only USD available', () => {
    expect(formatPrice({ crc: null, usd: 650 })).toBe('$650')
  })

  it('prefers CRC when both available', () => {
    expect(formatPrice({ crc: 320000, usd: 650 })).toBe('₡320.000')
  })

  it('returns "Consultar" when both null', () => {
    expect(formatPrice({ crc: null, usd: null })).toBe('Consultar')
  })
})

describe('formatTimeSince', () => {
  const now = new Date('2026-05-06T12:00:00Z')

  it('returns "Hace Xh" for hours', () => {
    const past = new Date('2026-05-06T10:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 2h')
  })

  it('returns "Hace Xm" for minutes (< 1h)', () => {
    const past = new Date('2026-05-06T11:30:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 30m')
  })

  it('returns "Hoy" for same-calendar-day older than 6h', () => {
    const past = new Date('2026-05-06T00:30:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hoy')
  })

  it('returns "Hace 1 día" singular', () => {
    const past = new Date('2026-05-05T12:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 1 día')
  })

  it('returns "Hace X días" plural', () => {
    const past = new Date('2026-05-04T12:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 2 días')
  })
})
