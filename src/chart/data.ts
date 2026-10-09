import { fetchDailyCandles, fetchIntradayCandles } from '@/services/api/tsetmc.ts'
import { jalaliToGregorianIso } from '@/utils/format.ts'
import type { CandleSet, WorkspaceCandle } from './types.ts'
import type { DailyCandle } from '@/types/market'

/**
 * ChartDataService: normalized OHLCV for the workspace.
 *  - daily (adjusted/unadjusted): Candlestick.php type 3/2, newest-first ->
 *    oldest-first WorkspaceCandle with Gregorian ISO time axis.
 *  - intraday: Candlestick.php type 1 (today's 2-min candles) -> UTCTimestamp.
 *  - weekly/monthly: resampled client-side from daily (labeled as such in UI).
 * Validation: ordering, duplicates, invalid OHLC (high<low etc.) are dropped.
 * Request dedup via in-flight map; callers pass a token and ignore stale
 * resolutions when symbols/timeframes change rapidly.
 */

export interface Dataset {
  candles: WorkspaceCandle[]
  source: string
  fetchedAt: number
}

const inflight = new Map<string, Promise<Dataset>>()

function validDaily(c: DailyCandle): boolean {
  if (!c.date || !Number.isFinite(c.open) || !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close)) return false
  if (c.high < c.low || c.high < Math.max(c.open, c.close) || c.low > Math.min(c.open, c.close)) return false
  return true
}

function toWorkspaceDaily(rows: DailyCandle[]): WorkspaceCandle[] {
  const seen = new Set<string>()
  const out: WorkspaceCandle[] = []
  for (const r of [...rows].reverse()) {
    if (!validDaily(r)) continue
    const t = jalaliToGregorianIso((r.date as string).replace(/\//g, '-'))
    if (seen.has(t)) continue
    seen.add(t)
    out.push({ time: t, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume })
  }
  return out
}

const TEHRAN_OFFSET_S = 3 * 3600 + 30 * 60

function toWorkspaceIntraday(rows: DailyCandle[], jalaliDate: string): WorkspaceCandle[] {
  const g = jalaliToGregorianIso(jalaliDate).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!g) return []
  const [y, mo, d] = [Number(g[1]), Number(g[2]), Number(g[3])]
  const seen = new Set<number>()
  const out: WorkspaceCandle[] = []
  for (const r of [...rows].reverse()) {
    if (!r.time || !/^\d{2}:\d{2}/.test(r.time)) continue
    if (![r.open, r.high, r.low, r.close].every(Number.isFinite)) continue
    const mm = (r.time as string).match(/(\d{2}):(\d{2})/) as RegExpMatchArray
    const ts = Math.floor(Date.UTC(y, mo - 1, d, Number(mm[1]), Number(mm[2])) / 1000) - TEHRAN_OFFSET_S
    if (seen.has(ts)) continue
    seen.add(ts)
    out.push({ time: ts, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume })
  }
  return out
}

export type Aggregate = 'daily' | 'weekly' | 'monthly'

/** Resample oldest-first daily candles (labeled client-side aggregation in UI). */
export function resample(candles: WorkspaceCandle[], agg: Aggregate): WorkspaceCandle[] {
  if (agg === 'daily') return candles
  const out: WorkspaceCandle[] = []
  let cur: WorkspaceCandle | null = null
  const keyOf = (t: WorkspaceCandle['time']): string => {
    const s = String(t)
    if (agg === 'weekly') {
      const d = new Date(`${s}T00:00:00Z`)
      // ISO week key
      const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7)
      return `${d.getUTCFullYear()}-W${week}`
    }
    return s.slice(0, 7)
  }
  let curKey = ''
  const push = (): void => {
    if (cur) out.push(cur)
    cur = null
  }
  for (const c of candles) {
    const k = keyOf(c.time)
    if (k !== curKey) {
      push()
      curKey = k
      cur = { ...c }
    } else if (cur) {
      cur.high = Math.max(cur.high, c.high)
      cur.low = Math.min(cur.low, c.low)
      cur.close = c.close
      cur.volume = (cur.volume ?? 0) + (c.volume ?? 0)
    }
  }
  push()
  return out
}

export function fetchDataset(symbol: string, set: CandleSet, sessionDate: string): Promise<Dataset> {
  const key = `${set}:${symbol}:${set === 'intraday' ? sessionDate : ''}`
  const running = inflight.get(key)
  if (running) return running
  const job = (async (): Promise<Dataset> => {
    try {
      if (set === 'intraday') {
        const rows = await fetchIntradayCandles(symbol)
        return { candles: toWorkspaceIntraday(rows, sessionDate), source: 'candlestick-intraday', fetchedAt: Date.now() }
      }
      const rows = await fetchDailyCandles(symbol, set === 'adjusted' ? 'adjusted' : 'unadjusted')
      return { candles: toWorkspaceDaily(rows), source: `candlestick-${set}`, fetchedAt: Date.now() }
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, job)
  return job
}
