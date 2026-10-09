import type { CandlePoint, DailyCandle, DailyHistory } from '@/types/market'
import { jalaliToGregorianIso } from './format.ts'

/**
 * Newest-first History.php rows -> oldest-first chart candles.
 * open=pf (اولین), high=pmax, low=pmin, close=pc (پایانی).
 */
export function historyToCandles(rows: DailyHistory[], limit = 365): CandlePoint[] {
  return [...rows]
    .filter((r) => r.date && r.pc != null)
    .slice(0, limit)
    .reverse()
    .map((r) => ({
      time: jalaliToGregorianIso(r.date),
      open: r.pf ?? r.pc ?? 0,
      high: r.pmax ?? r.pc ?? 0,
      low: r.pmin ?? r.pc ?? 0,
      close: r.pc ?? 0,
      volume: r.tvol,
    }))
}

/** Period return % between oldest and newest close in a (newest-first) slice. */
export function historyPeriodReturn(rows: DailyHistory[]): number | null {
  if (rows.length < 2) return null
  const newest = rows[0]?.pc
  const oldest = rows[rows.length - 1]?.pc
  if (newest == null || oldest == null || oldest === 0) return null
  return Math.round(((newest - oldest) / oldest) * 10000) / 100
}

/** Newest-first DailyCandle rows -> oldest-first chart candles (daily, Gregorian axis). */
export function dailyCandlesToPoints(rows: DailyCandle[], limit = 365): CandlePoint[] {
  return [...rows]
    .filter((r) => r.date && Number.isFinite(r.close))
    .slice(0, limit)
    .reverse()
    .map((r) => ({
      time: jalaliToGregorianIso(r.date as string),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }))
}

/**
 * Intraday 2-min candles -> chart points with UTCTimestamp axis.
 * Times are Tehran wall-clock (UTC+3:30, no DST since 2022).
 */
export function intradayToPoints(rows: DailyCandle[], jalaliDate: string): CandlePoint[] {
  const g = jalaliToGregorianIso(jalaliDate).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!g) return []
  const [y, mo, d] = [Number(g[1]), Number(g[2]), Number(g[3])]
  const TEHRAN_OFFSET_S = 3 * 3600 + 30 * 60
  return [...rows]
    .filter((r) => r.time && /^\d{2}:\d{2}/.test(r.time))
    .reverse()
    .map((r) => {
      const mm = (r.time as string).match(/(\d{2}):(\d{2})/) as RegExpMatchArray
      const ts = Math.floor(Date.UTC(y, mo - 1, d, Number(mm[1]), Number(mm[2])) / 1000) - TEHRAN_OFFSET_S
      return { time: ts, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }
    })
}
