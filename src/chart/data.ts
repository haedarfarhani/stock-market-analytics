import { fetchDailyCandles, fetchIntradayCandles } from '@/services/api/tsetmc.ts'
import { jalaliToGregorianIso } from '@/utils/format.ts'
import type { CandleSet, CandleTime, WorkspaceCandle } from './types.ts'
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
  /** True when served from the persistent cache (API limited or failed). */
  stale?: boolean
}

/* ---------- persistent candle cache (localStorage, compact, LRU-evicted) ----------
 * Candle payloads stay memory-only in the HTTP layer (persist:false) to protect
 * the ~5MB localStorage budget, so after a reload a quota error left charts
 * with nothing but mock data. This layer persists the *normalized* candles in
 * compact tuple form, so real data survives reloads and is served stale when
 * the API is rate-limited (402/429) or unreachable. */

const DS_PREFIX = 'isa-candles-v1:'
const DS_VERSION = 1
const MAX_ROWS = 3000

type CompactCandle = [CandleTime, number, number, number, number, number?]

const dsKey = (symbol: string, set: CandleSet): string => `${DS_PREFIX}${set}:${symbol}`

function isCandleTime(v: unknown): v is CandleTime {
  if (typeof v === 'string') return v.length > 0
  return typeof v === 'number' && Number.isFinite(v)
}

/** WorkspaceCandle[] -> compact tuples (drops invalid rows, caps length). */
export function compactCandles(candles: WorkspaceCandle[]): CompactCandle[] {
  const out: CompactCandle[] = []
  for (const c of candles) {
    if (!c || !isCandleTime(c.time)) continue
    if (![c.open, c.high, c.low, c.close].every(Number.isFinite)) continue
    const row: CompactCandle = [c.time, c.open, c.high, c.low, c.close]
    if (c.volume !== undefined && Number.isFinite(c.volume)) row.push(c.volume)
    out.push(row)
    if (out.length >= MAX_ROWS) break
  }
  return out
}

/** Compact tuples -> WorkspaceCandle[] (validates untrusted storage input). */
export function expandCandles(rows: unknown): WorkspaceCandle[] {
  if (!Array.isArray(rows)) return []
  const out: WorkspaceCandle[] = []
  for (const r of rows.slice(0, MAX_ROWS)) {
    if (!Array.isArray(r) || r.length < 5) continue
    const [t, o, h, l, c, v] = r as unknown[]
    if (!isCandleTime(t)) continue
    if (![o, h, l, c].every((x) => typeof x === 'number' && Number.isFinite(x))) continue
    if (v !== undefined && !(typeof v === 'number' && Number.isFinite(v))) continue
    out.push({ time: t, open: o as number, high: h as number, low: l as number, close: c as number, volume: v as number | undefined })
  }
  return out
}

function evictOldestDataset(exceptKey: string): void {
  try {
    let oldestKey: string | null = null
    let oldestTs = Infinity
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(DS_PREFIX) || k === exceptKey) continue
      try {
        const e = JSON.parse(localStorage.getItem(k) ?? '') as { fetchedAt?: unknown }
        const ts = typeof e.fetchedAt === 'number' ? e.fetchedAt : 0
        if (ts < oldestTs) {
          oldestTs = ts
          oldestKey = k
        }
      } catch {
        oldestKey = k
        break
      }
    }
    if (oldestKey) localStorage.removeItem(oldestKey)
  } catch {
    /* storage unavailable — memory path still works */
  }
}

/** Persist a successfully fetched dataset (quota-safe: evicts oldest on overflow). */
export function saveDatasetCache(symbol: string, set: CandleSet, ds: Dataset): void {
  const key = dsKey(symbol, set)
  let payload = ''
  try {
    payload = JSON.stringify({ version: DS_VERSION, candles: compactCandles(ds.candles), source: ds.source, fetchedAt: ds.fetchedAt })
  } catch {
    return
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      localStorage.setItem(key, payload)
      return
    } catch {
      evictOldestDataset(key)
    }
  }
}

/** Load the last-known dataset for a symbol (any age — caller labels it stale). */
export function loadDatasetCache(symbol: string, set: CandleSet): Dataset | null {
  try {
    const raw = localStorage.getItem(dsKey(symbol, set))
    if (!raw) return null
    const s = JSON.parse(raw) as { version?: unknown; candles?: unknown; source?: unknown; fetchedAt?: unknown }
    if (!s || s.version !== DS_VERSION) return null
    const candles = expandCandles(s.candles)
    if (!candles.length) return null
    return {
      candles,
      source: typeof s.source === 'string' ? s.source : 'cached',
      fetchedAt: typeof s.fetchedAt === 'number' ? s.fetchedAt : Date.now(),
      stale: true,
    }
  } catch {
    return null
  }
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
      let ds: Dataset
      if (set === 'intraday') {
        const rows = await fetchIntradayCandles(symbol)
        ds = { candles: toWorkspaceIntraday(rows, sessionDate), source: 'candlestick-intraday', fetchedAt: Date.now() }
      } else {
        const rows = await fetchDailyCandles(symbol, set === 'adjusted' ? 'adjusted' : 'unadjusted')
        ds = { candles: toWorkspaceDaily(rows), source: `candlestick-${set}`, fetchedAt: Date.now() }
      }
      // Real data won: persist it so quota errors / reloads can serve it stale.
      if (ds.candles.length) saveDatasetCache(symbol, set, ds)
      return ds
    } catch {
      // Limited or unreachable: serve the last-known real dataset, if any.
      // Only when nothing was ever cached do callers fall back to mock data.
      const cached = loadDatasetCache(symbol, set)
      if (cached) return cached
      return { candles: [], source: 'unavailable', fetchedAt: Date.now() }
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, job)
  return job
}
