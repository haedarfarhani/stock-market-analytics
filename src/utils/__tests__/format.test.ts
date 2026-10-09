import { describe, expect, it } from 'vitest'
import { formatTimeAxisTick } from '../format.ts'

// 2024-03-20 (Gregorian) == 1403-01-01 (Jalali, Nowruz)
describe('formatTimeAxisTick (Jalali time-axis labels)', () => {
  it('formats a daily ISO string as day/month/year Jalali parts', () => {
    expect(formatTimeAxisTick('2024-03-20', 2)).toBe('۱ فروردین')
    expect(formatTimeAxisTick('2024-03-20', 1)).toBe('فروردین ۰۳')
    expect(formatTimeAxisTick('2024-03-20', 0)).toBe('۱۴۰۳')
  })

  it('accepts BusinessDay objects like daily strings', () => {
    expect(formatTimeAxisTick({ year: 2024, month: 3, day: 20 }, 2)).toBe('۱ فروردین')
    expect(formatTimeAxisTick({ year: 2024, month: 3, day: 20 }, 0)).toBe('۱۴۰۳')
  })

  it('formats intraday UTCTimestamp seconds as Tehran wall-clock time', () => {
    // 10:00 Tehran wall clock on 1403-01-01 (encoded like chart/data.ts)
    const ts = Math.floor(Date.UTC(2024, 2, 20, 10, 0) / 1000) - (3 * 3600 + 30 * 60)
    expect(formatTimeAxisTick(ts, 3)).toBe('۱۰:۰۰')
    expect(formatTimeAxisTick(ts, 4)).toBe('۱۰:۰۰:۰۰')
  })

  it('maps a timestamp to its Jalali day for day-level ticks', () => {
    const ts = Math.floor(Date.UTC(2024, 2, 20, 10, 0) / 1000) - (3 * 3600 + 30 * 60)
    expect(formatTimeAxisTick(ts, 2)).toBe('۱ فروردین')
  })

  it('returns null for invalid input so the chart falls back to defaults', () => {
    expect(formatTimeAxisTick('not-a-date', 2)).toBeNull()
    expect(formatTimeAxisTick(Number.NaN, 3)).toBeNull()
    expect(formatTimeAxisTick(null, 2)).toBeNull()
    expect(formatTimeAxisTick(undefined, 2)).toBeNull()
    expect(formatTimeAxisTick({ year: 'x' }, 2)).toBeNull()
  })
})
