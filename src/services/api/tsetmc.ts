import { cachedGet, hasApiKey } from './client.ts'
import type { AssemblyMeeting, TsetmcSymbol, MarketIndex, TsetmcSymbolDetail, BourseIndexSnapshot, IfbIndexSnapshot, IndexMeta, FundNav, OptionContractLive, TickTrade, DailyHistory, DailyCandle, CandleKind, ShareholderRow } from '@/types/market'

/**
 * TSETMC endpoints (verified against https://brsapi.ir/ on 2026-10-09).
 * Base: https://Api.BrsApi.ir/Tsetmc/<Script>.php?key=KEY
 *
 * Verified:
 *  - AllSymbols.php?key=&type=1..5   (type 1: stocks+ETF+rights, 2: IME symbols, 3: futures, 4: bonds, 5: housing)
 * Documented (same base pattern, schema per brsapi.ir sub-pages):
 *  - Index.php, Symbol.php, Nav.php, Option.php, Transaction.php,
 *    History.php, Candlestick.php, Shareholder.php
 * Never assume a response schema: each fn returns `unknown`-tolerant shapes
 * and callers fall back to mock data. See API_INTEGRATION.md.
 */

const TTL_SYMBOLS = 60_000
const TTL_DETAIL = 120_000

export type SymbolType = 1 | 2 | 3 | 4 | 5

/**
 * Numeric keys of the AllSymbols response. Verified 2026-10-09 against the
 * official sample (https://brsapi.ir/Api/Tsetmc/Sample/Api_FreeBourseWebService.json):
 * top-level JSON array, JSON numbers, `z/mv/eps/pe` nullable.
 * Normalization coerces numeric strings (defensive) and null -> undefined.
 */
const NUMERIC_KEYS = [
  'cs_id', 'z', 'bvol', 'mv', 'eps', 'pe',
  'tmin', 'tmax', 'pmin', 'pmax', 'py', 'pf', 'pl', 'plc', 'plp',
  'pc', 'pcc', 'pcp', 'tno', 'tvol', 'tval',
  'Buy_CountI', 'Buy_CountN', 'Sell_CountI', 'Sell_CountN',
  'Buy_I_Volume', 'Buy_N_Volume', 'Sell_I_Volume', 'Sell_N_Volume',
  'zd1', 'qd1', 'pd1', 'po1', 'qo1', 'zo1',
  'zd2', 'qd2', 'pd2', 'po2', 'qo2', 'zo2',
  'zd3', 'qd3', 'pd3', 'po3', 'qo3', 'zo3',
  'zd4', 'qd4', 'pd4', 'po4', 'qo4', 'zo4',
  'zd5', 'qd5', 'pd5', 'po5', 'qo5', 'zo5',
] as const

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function normalizeSymbol(raw: unknown): TsetmcSymbol {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {
    l18: String(r.l18 ?? ''),
    l30: String(r.l30 ?? ''),
    isin: String(r.isin ?? ''),
    id: String(r.id ?? ''),
    cs: r.cs == null ? undefined : String(r.cs),
    time: r.time == null ? undefined : String(r.time),
    market: r.market,
  }
  for (const k of NUMERIC_KEYS) {
    const n = toNum(r[k])
    if (n !== undefined) out[k] = n
  }
  if (typeof r.cs_id === 'string' && out.cs_id === undefined) out.cs_id = r.cs_id
  return out as unknown as TsetmcSymbol
}

export async function fetchAllSymbols(type: SymbolType = 1): Promise<TsetmcSymbol[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>(`allsymbols:${type}`, '/Tsetmc/AllSymbols.php', { type }, TTL_SYMBOLS)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (Array.isArray(list)) return (list as unknown[]).map(normalizeSymbol)
  throw new Error('قالب پاسخ AllSymbols غیرمنتظره بود.')
}

export interface SymbolQuery {
  /** TSETMC internal id (preferred) or l18 ticker */
  id?: string
  l18?: string
}

const DETAIL_STR_KEYS = [
  'date_update', 'date', 'time', 'state', 'l30_en',
  'code_12', 'code_5', 'code_4', 'm', 'm_board', 'm_board_code', 'cs_sub',
] as const

const DETAIL_NUM_KEYS = [
  'm_board_id', 'cs_sub_id', 'z_issued', 'ff', 'g_pe', 'ps',
  'pmin_1w', 'pmax_1w', 'pmin_1y', 'pmax_1y', 'tvol_avg_1m',
] as const

function toStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s === '' ? undefined : s
}

/**
 * Normalize a full Symbol.php object. Verified live 2026-10-09:
 * Symbol.php returns ONE object (not an array), Jalali date strings,
 * real JSON numbers, nullable z_issued, assembly[] meetings.
 */
export function normalizeSymbolDetail(raw: unknown): TsetmcSymbolDetail {
  const base = normalizeSymbol(raw)
  const r = (raw ?? {}) as Record<string, unknown>
  const out = base as unknown as Record<string, unknown>
  for (const k of DETAIL_STR_KEYS) {
    const s = toStr(r[k])
    if (s !== undefined) out[k] = s
  }
  for (const k of DETAIL_NUM_KEYS) {
    const n = toNum(r[k])
    if (n !== undefined) out[k] = n
  }
  const asm = r.assembly
  if (Array.isArray(asm)) {
    out.assembly = (asm as Record<string, unknown>[]).map(
      (a): AssemblyMeeting => ({
        title: String(a.title ?? ''),
        date_title: toStr(a.date_title),
        date_send: toStr(a.date_send),
        time_send: toStr(a.time_send),
        date_publish: toStr(a.date_publish),
        time_publish: toStr(a.time_publish),
        content: toStr(a.content),
      }),
    )
  }
  return out as unknown as TsetmcSymbolDetail
}

export async function fetchSymbolDetail(q: SymbolQuery): Promise<TsetmcSymbolDetail> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const params: Record<string, unknown> = {}
  if (q.id) params.id = q.id
  else if (q.l18) params.l18 = q.l18
  const data = await cachedGet<unknown>(`symbol:${q.id ?? q.l18}`, '/Tsetmc/Symbol.php', params, TTL_DETAIL)
  if (Array.isArray(data)) {
    const first = (data as unknown[])[0]
    if (first) return normalizeSymbolDetail(first)
    throw new Error('نماد یافت نشد.')
  }
  return normalizeSymbolDetail(data)
}

export type IndexType = 1 | 2 | 3

/** type=1/2 responses carry no percent — derive it: change / (value - change). */
export function indexChangePercent(change: number, value: number): number {
  const base = value - change
  if (!Number.isFinite(base) || base === 0) return 0
  return Math.round((change / base) * 10000) / 100
}

export function normalizeBourseIndex(raw: unknown): BourseIndexSnapshot {
  const r = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown): number => toNum(v) ?? 0
  return {
    date: toStr(r.date),
    time: toStr(r.time),
    state: toStr(r.state),
    index: num(r.index),
    index_change: num(r.index_change),
    equalWeight: num(r.index_equalWeight),
    equalWeight_change: num(r.index_equalWeight_change),
    mv: toNum(r.mv),
    tno: toNum(r.tno),
    tvol: toNum(r.tvol),
    tval: toNum(r.tval),
  }
}

export function normalizeIfbIndex(raw: unknown): IfbIndexSnapshot {
  const r = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown): number => toNum(v) ?? 0
  return {
    date: toStr(r.date),
    time: toStr(r.time),
    state: toStr(r.state),
    index: num(r.index),
    index_change: num(r.index_change),
    mv_main: toNum(r.mv_main),
    mv_base: toNum(r.mv_base),
    tno: toNum(r.tno),
    tvol: toNum(r.tvol),
    tval: toNum(r.tval),
  }
}

export function normalizeSelectedIndex(raw: unknown, i: number): MarketIndex {
  const r = (raw ?? {}) as Record<string, unknown>
  const value = toNum(r.index) ?? 0
  const change = toNum(r.index_change) ?? 0
  return {
    code: `SEL-${i + 1}`,
    name: String(r.name ?? `شاخص منتخب ${i + 1}`),
    value,
    change,
    changePercent: toNum(r.index_change_percent) ?? indexChangePercent(change, value),
    time: toStr(r.time),
    min: toNum(r.min),
    max: toNum(r.max),
  }
}

export async function fetchBourseIndex(): Promise<BourseIndexSnapshot> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('index:1', '/Tsetmc/Index.php', { type: 1 }, TTL_SYMBOLS)
  const obj = Array.isArray(data) ? (data as unknown[])[0] : data
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ شاخص بورس غیرمنتظره بود.')
  return normalizeBourseIndex(obj)
}

export async function fetchIfbIndex(): Promise<IfbIndexSnapshot> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('index:2', '/Tsetmc/Index.php', { type: 2 }, TTL_SYMBOLS)
  const obj = Array.isArray(data) ? (data as unknown[])[0] : data
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ شاخص فرابورس غیرمنتظره بود.')
  return normalizeIfbIndex(obj)
}

export async function fetchSelectedIndices(): Promise<MarketIndex[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('index:3', '/Tsetmc/Index.php', { type: 3 }, TTL_SYMBOLS)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ شاخص‌های منتخب غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeSelectedIndex)
}

export interface MarketIndicesResult {
  indices: MarketIndex[]
  bourse: BourseIndexSnapshot | null
  ifb: IfbIndexSnapshot | null
  meta: IndexMeta
}

/** Combine all three Index types; tolerates partial failure (needs ≥1 success). */
export async function fetchMarketIndices(): Promise<MarketIndicesResult> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const [b, f, s] = await Promise.allSettled([fetchBourseIndex(), fetchIfbIndex(), fetchSelectedIndices()])
  const bourse = b.status === 'fulfilled' ? b.value : null
  const ifb = f.status === 'fulfilled' ? f.value : null
  const selected = s.status === 'fulfilled' ? s.value : []
  const indices: MarketIndex[] = []
  if (bourse) {
    indices.push(
      { code: 'TEDPIX', name: 'شاخص کل', value: bourse.index, change: bourse.index_change, changePercent: indexChangePercent(bourse.index_change, bourse.index), time: bourse.time },
      { code: 'TEDPIX_EQ', name: 'شاخص هم‌وزن', value: bourse.equalWeight, change: bourse.equalWeight_change, changePercent: indexChangePercent(bourse.equalWeight_change, bourse.equalWeight), time: bourse.time },
    )
  }
  if (ifb) {
    indices.push({ code: 'IFX', name: 'شاخص فرابورس', value: ifb.index, change: ifb.index_change, changePercent: indexChangePercent(ifb.index_change, ifb.index), time: ifb.time })
  }
  indices.push(...selected)
  if (!indices.length) throw new Error('دریافت هر سه نوع شاخص ناموفق بود.')
  const meta: IndexMeta = {
    date: bourse?.date ?? ifb?.date,
    time: bourse?.time ?? ifb?.time,
    state: bourse?.state ?? ifb?.state,
    tno: bourse?.tno,
    tvol: bourse?.tvol,
    tval: bourse?.tval,
    mv: bourse?.mv,
    mv_main: ifb?.mv_main,
    mv_base: ifb?.mv_base,
  }
  return { indices, bourse, ifb, meta }
}

export function normalizeFundNav(l18: string, raw: unknown): FundNav {
  const r = (raw ?? {}) as Record<string, unknown>
  const err = r as { successful?: boolean; message_error?: unknown }
  if (err.successful === false) {
    throw new Error(typeof err.message_error === 'string' ? err.message_error : 'خطای سرویس NAV.')
  }
  const psubtran = toNum(r.psubtran)
  const predtran = toNum(r.predtran)
  if (psubtran === undefined || predtran === undefined) {
    throw new Error('قالب پاسخ NAV غیرمنتظره بود.')
  }
  return { l18, date: toStr(r.date), time: toStr(r.time), psubtran, predtran }
}

/**
 * NAV صدور/ابطال یک صندوق. `l18` اجباری است (بدون آن: 400 missing_param).
 * اندپوینت bulk ندارد — هر صندوق = یک درخواست؛ فقط on-demand صدا بزنید
 * (کش ۲ دقیقه‌ای + localStorage در cachedGet).
 */
export async function fetchFundNav(l18: string): Promise<FundNav> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد صندوق (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>(`nav:${sym}`, '/Tsetmc/Nav.php', { l18: sym }, TTL_DETAIL)
  const obj = Array.isArray(data) ? (data as unknown[])[0] : data
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ NAV غیرمنتظره بود.')
  return normalizeFundNav(sym, obj)
}

const OPTION_NUM_KEYS = [
  'day_remain', 'size_contract', 'price_strike', 'interest_open',
  'base_py', 'base_pl', 'base_plp', 'base_pc', 'base_pcp',
  'tmin', 'tmax', 'pmin', 'pmax', 'py', 'pf', 'pl', 'plc', 'plp',
  'pc', 'pcc', 'pcp', 'tno', 'tvol', 'tval', 'nval',
] as const

export function normalizeOptionContract(raw: unknown): OptionContractLive {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {
    l18: String(r.l18 ?? ''),
    l30: String(r.l30 ?? ''),
    isin: String(r.isin ?? ''),
    id: String(r.id ?? ''),
    base_l18: String(r.base_l18 ?? ''),
    base_id: String(r.base_id ?? ''),
    type: r.type === 'put' ? 'put' : 'call',
    date_begin: toStr(r.date_begin),
    date_end: toStr(r.date_end),
    time: toStr(r.time),
    price_strike: toNum(r.price_strike) ?? 0,
  }
  for (const k of OPTION_NUM_KEYS) {
    if (k === 'price_strike') continue
    const n = toNum(r[k])
    if (n !== undefined) out[k] = n
  }
  return out as unknown as OptionContractLive
}

/**
 * Whole TSE option market in ONE call (verified: 1,625 rows, no params).
 * Quota-friendly: 60s cache. IME options stay in extended.ts (Ime/Option.php).
 */
export async function fetchOptionContracts(): Promise<OptionContractLive[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('option:tse', '/Tsetmc/Option.php', {}, TTL_SYMBOLS, { persist: false })
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ بازار آپشن غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeOptionContract)
}

const TTL_TICKS = 5 * 60_000 // tick payloads are heavy (~1.2MB for اهرم) — cache longer

export function normalizeTickTrade(raw: unknown): TickTrade {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    row: toNum(r.row) ?? 0,
    time: toStr(r.time) ?? '',
    volume: toNum(r.volume) ?? 0,
    price: toNum(r.price) ?? 0,
    canceled: toNum(r.canceled) === 1,
  }
}

/**
 * Tick-by-tick trades for one symbol-day. `l18` required; `date` is Jalali
 * YYYY-MM-DD and optional (omitted -> latest trading day).
 */
export async function fetchTransactions(l18: string, date?: string): Promise<TickTrade[]> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const params: Record<string, unknown> = { l18: sym }
  if (date?.trim()) params.date = date.trim()
  const data = await cachedGet<unknown>(`tx:${sym}:${date ?? 'latest'}`, '/Tsetmc/Transaction.php', params, TTL_TICKS, { persist: false })
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ ریزمعاملات غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeTickTrade)
}

export async function fetchHistory(id: string): Promise<unknown> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  return cachedGet(`history:${id}`, '/Tsetmc/History.php', { id }, TTL_DETAIL)
}

const TTL_HISTORY = 30 * 60_000 // full multi-year history per symbol — cache long

const HISTORY_NUM_KEYS = [
  'tno', 'tvol', 'tval', 'pmin', 'pmax', 'py', 'pf',
  'pl', 'plc', 'plp', 'pc', 'pcc', 'pcp',
] as const

export function normalizeDailyHistory(raw: unknown): DailyHistory {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = { date: String(r.date ?? '') }
  const t = toStr(r.time)
  if (t !== undefined) out.time = t
  for (const k of HISTORY_NUM_KEYS) {
    const n = toNum(r[k])
    if (n !== undefined) out[k] = n
  }
  return out as unknown as DailyHistory
}

/**
 * Daily price/volume history, newest-first (type=0 = معاملات و قیمت).
 * `l18` required. Heavy (~0.9MB for فملی) — 30min cache.
 */
export async function fetchPriceHistory(l18: string): Promise<DailyHistory[]> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>(`history0:${sym}`, '/Tsetmc/History.php', { type: 0, l18: sym }, TTL_HISTORY, { persist: false })
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ تاریخچه قیمت غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeDailyHistory)
}

export async function fetchCandles(id: string): Promise<unknown> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  return cachedGet(`candles:${id}`, '/Tsetmc/Candlestick.php', { id }, TTL_DETAIL)
}

const CANDLE_TYPE: Record<Exclude<CandleKind, 'intraday'>, 2 | 3> = { adjusted: 3, unadjusted: 2 }
const CANDLE_KEY: Record<number, string> = { 1: 'candle_intraday', 2: 'candle_daily', 3: 'candle_daily_adjusted' }

export function normalizeDailyCandle(raw: unknown): DailyCandle {
  const r = (raw ?? {}) as Record<string, unknown>
  const num = (v: unknown): number => toNum(v) ?? 0
  const date = toStr(r.date)?.replace(/\//g, '-')
  return {
    date,
    time: toStr(r.time),
    open: num(r.open),
    high: num(r.high),
    low: num(r.low),
    close: num(r.close),
    volume: toNum(r.volume),
  }
}

export function extractCandles(data: unknown, type: number): DailyCandle[] {
  const obj = (Array.isArray(data) ? (data as unknown[])[0] : data) as Record<string, unknown> | null
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ کندل غیرمنتظره بود.')
  const key = CANDLE_KEY[type] ?? CANDLE_KEY[3]
  const list = obj[key] ?? obj.candle_daily ?? obj.candle_daily_adjusted ?? obj.candle_intraday
  if (!Array.isArray(list)) throw new Error('قالب پاسخ کندل غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeDailyCandle)
}

/** Daily candles (adjusted corporate actions, or raw). 30min cache. */
export async function fetchDailyCandles(l18: string, kind: Exclude<CandleKind, 'intraday'> = 'adjusted'): Promise<DailyCandle[]> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const type = CANDLE_TYPE[kind]
  const data = await cachedGet<unknown>(`candles:${type}:${sym}`, '/Tsetmc/Candlestick.php', { type, l18: sym }, TTL_HISTORY, { persist: false })
  return extractCandles(data, type)
}

/** Today's 2-minute intraday candles. 60s cache. */
export async function fetchIntradayCandles(l18: string): Promise<DailyCandle[]> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>(`candles:1:${sym}`, '/Tsetmc/Candlestick.php', { type: 1, l18: sym }, TTL_SYMBOLS, { persist: false })
  return extractCandles(data, 1)
}

export function normalizeShareholder(raw: unknown): ShareholderRow {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    id: typeof r.id === 'number' || typeof r.id === 'string' ? r.id : undefined,
    name: String(r.name ?? ''),
    shares: toNum(r.volume) ?? 0,
    percent: toNum(r.percent) ?? 0,
    change: toNum(r.change),
  }
}

export async function fetchShareholders(l18: string, date?: string): Promise<ShareholderRow[]> {
  const sym = l18.trim()
  if (!sym) throw new Error('نام نماد (l18) اجباری است.')
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const params: Record<string, unknown> = { l18: sym }
  if (date?.trim()) params.date = date.trim()
  const data = await cachedGet<unknown>(`shareholders:${sym}:${date ?? 'latest'}`, '/Tsetmc/Shareholder.php', params, TTL_DETAIL)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ سهامداران غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeShareholder)
}
