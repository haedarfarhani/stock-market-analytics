import { cachedGet, hasApiKey } from './client.ts'
import { normalizeSymbol } from './tsetmc.ts'
import type {
  CodalAnnouncement,
  CodalPage,
  CodalQuery,
  ImeCertificate,
  ImeFuture,
  ImeOptionLeg,
  ImeOptionPair,
  ImePhysicalResult,
  ImePhysicalTrade,
  MarketGroup,
  MarketQuote,
  TsetmcSymbol,
} from '@/types/market'

// ---------------- CODAL ----------------

const boolStr = (v: boolean | undefined): string | undefined => (v === undefined ? undefined : v ? 'true' : 'false')

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s === '' ? undefined : s
}

export function normalizeCodalAnnouncement(raw: unknown): CodalAnnouncement {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    symbol: String(r.l18 ?? ''),
    company: String(r.l30 ?? ''),
    title: String(r.title ?? ''),
    code: str(r.code),
    date_title: str(r.date_title),
    date_send: str(r.date_send),
    time_send: str(r.time_send),
    date_publish: str(r.date_publish),
    time_publish: str(r.time_publish),
    link: str(r.link),
    link_pdf: str(r.link_pdf),
    link_excel: str(r.link_excel),
    link_attachment: str(r.link_attachment),
  }
}

/**
 * CODAL announcements. Verified live 2026-10-09:
 * base path is /Codal/ (NOT /Tsetmc/), ALL params optional (defaults: page=1,
 * audited/unaudited/main/subsidiaries=true). Response wrapper
 * {count_announcement, count_page, announcement: [...~20/page]}.
 * Persian-digit Jalali dates; direct codal.ir links (page/pdf/excel/attachment).
 */
export async function fetchCodalPage(q: CodalQuery = {}): Promise<CodalPage> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const params: Record<string, unknown> = {}
  if (q.l18?.trim()) params.l18 = q.l18.trim()
  if (q.category) params.category = q.category
  if (q.period) params.period = q.period
  const a = boolStr(q.audited)
  const u = boolStr(q.unaudited)
  const m = boolStr(q.only_main_company)
  const s = boolStr(q.only_subsidiaries)
  if (a !== undefined) params.audited = a
  if (u !== undefined) params.unaudited = u
  if (m !== undefined) params.only_main_company = m
  if (s !== undefined) params.only_subsidiaries = s
  if (q.date_start?.trim()) params.date_start = q.date_start.trim()
  if (q.date_end?.trim()) params.date_end = q.date_end.trim()
  params.page = q.page && q.page > 0 ? q.page : 1
  const data = await cachedGet<unknown>(`codal:${JSON.stringify(params)}`, '/Codal/Announcement.php', params, 5 * 60_000)
  const obj = (Array.isArray(data) ? (data as unknown[])[0] : data) as Record<string, unknown> | null
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ کدال غیرمنتظره بود.')
  const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const list = obj.announcement
  return {
    total: num(obj.count_announcement),
    pages: num(obj.count_page),
    page: params.page as number,
    items: Array.isArray(list) ? (list as unknown[]).map(normalizeCodalAnnouncement) : [],
  }
}

/** @deprecated use fetchCodalPage (correct /Codal/ path + typed wrapper) */
export async function fetchCodalAnnouncements(q: CodalQuery = {}): Promise<CodalPage> {
  return fetchCodalPage(q)
}

// ---------------- IME ----------------

function inum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function istr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s === '' || s === '0000-00-00' ? undefined : s
}

export function normalizeImeFuture(raw: unknown): ImeFuture {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {
    contract_code: String(r.contract_code ?? ''),
    contract_description: String(r.contract_description ?? ''),
  }
  for (const k of ['contract_size_unit', 'contract_currency', 'date_end', 'date_end_text', 'date_update', 'date_y', 'date_order', 'time_update', 'tval_unit'] as const) {
    const s = istr(r[k])
    if (s !== undefined) out[k] = s
  }
  for (const k of ['contract_size', 'day_remain', 'margin_initial', 'margin_maintenance', 'interest_open', 'py', 'pl', 'plp', 'pls', 'tvol', 'tval', 'tno'] as const) {
    const n = inum(r[k])
    if (n !== undefined) out[k] = n
  }
  return out as unknown as ImeFuture
}

/** IME futures (verified live: 19 contracts). 2-min cache. */
export async function fetchImeFutures(): Promise<ImeFuture[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('ime:futures', '/Ime/Futures.php', {}, 2 * 60_000)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ آتی بورس کالا غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeImeFuture)
}

function imeLeg(r: Record<string, unknown>, p: 'call' | 'put'): ImeOptionLeg {
  const g = (k: string): unknown => r[`${p}_${k}`]
  const leg: ImeOptionLeg = {}
  const code = g('contract_code')
  if (code != null && String(code) !== '') leg.code = String(code)
  const de = g('date_end')
  if (de != null && String(de) !== '' && String(de) !== '0000-00-00') leg.date_end = String(de)
  const rawKeys = ['day_remain', 'pl', 'plp', 'interest_open', 'tvol', 'tval', 'margin_initial'] as const
  for (const rk of rawKeys) {
    const n = inum(g(rk))
    if (n !== undefined) (leg as Record<string, unknown>)[rk] = n
  }
  return leg
}

export function normalizeImeOptionPair(raw: unknown): ImeOptionPair {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    category: String(r.contract_category ?? '').replace(/\s+/g, ' ').trim(),
    commodity: istr(r.contract_category_commodity),
    strike: inum(r.price_strike) ?? 0,
    level: istr(r.level_strike),
    date_update: istr(r.date_update),
    call: imeLeg(r, 'call'),
    put: imeLeg(r, 'put'),
  }
}

/** Paired call+put strikes (verified live: 151 rows). 2-min cache. */
export async function fetchImeOptions(): Promise<ImeOptionPair[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('ime:option', '/Ime/Option.php', {}, 2 * 60_000)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ آپشن بورس کالا غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeImeOptionPair)
}

export function normalizeImeCertificate(raw: unknown): ImeCertificate {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {
    commodity: String(r.commodity ?? ''),
    contract_code: String(r.contract_code ?? ''),
    contract_description: String(r.contract_description ?? ''),
  }
  for (const k of ['contract_size_unit', 'contract_currency', 'date_y', 'date_order', 'date_update', 'tval_unit'] as const) {
    const s = istr(r[k])
    if (s !== undefined) out[k] = s
  }
  for (const k of ['contract_size', 'py', 'pf', 'pfp', 'pmax', 'pmin', 'pl', 'plp', 'tno', 'tvol', 'tval'] as const) {
    const n = inum(r[k])
    if (n !== undefined) out[k] = n
  }
  return out as unknown as ImeCertificate
}

/** Deposit certificates (verified live: 11 rows). 2-min cache. */
export async function fetchImeCertificates(): Promise<ImeCertificate[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('ime:certificate', '/Ime/Certificate.php', {}, 2 * 60_000)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ گواهی سپرده غیرمنتظره بود.')
  return (list as unknown[]).map(normalizeImeCertificate)
}

export function normalizeImePhysical(raw: unknown): ImePhysicalTrade {
  const r = (raw ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = {
    l18: String(r.l18 ?? ''),
    l30: String(r.l30 ?? ''),
  }
  for (const k of ['market_hall', 'producer', 'supplier', 'broker', 'type_contract', 'type_settlement', 'date_trade', 'date_delivery', 'location_delivery', 'unit', 'currency', 'method_offer', 'method_purchase'] as const) {
    const s = istr(r[k])
    if (s !== undefined) out[k] = s
  }
  for (const k of ['pl', 'pc', 'pmin', 'pmax', 'price_base_offer', 'volume_contract', 'volume_offer', 'demand', 'tval'] as const) {
    const n = inum(r[k])
    if (n !== undefined) out[k] = n
  }
  return out as unknown as ImePhysicalTrade
}

/**
 * Physical trades. DUAL SHAPE: holidays -> {successful:true, status:'no_data'}
 * (no data key); trading days -> bare array. tval in هزار ریال.
 */
export async function fetchImePhysical(date_start?: string, date_end?: string): Promise<ImePhysicalResult> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const params: Record<string, unknown> = {}
  if (date_start?.trim()) params.date_start = date_start.trim()
  if (date_end?.trim()) params.date_end = date_end.trim()
  const key = `ime:physical:${date_start ?? 'today'}:${date_end ?? 'today'}`
  const data = await cachedGet<unknown>(key, '/Ime/Physical.php', params, 5 * 60_000)
  if (!Array.isArray(data)) {
    const obj = data as { status?: unknown; data?: unknown }
    if (obj && typeof obj === 'object' && obj.status === 'no_data') {
      return { trades: [], noData: true }
    }
    const list = obj?.data
    if (!Array.isArray(list)) throw new Error('قالب پاسخ معاملات فیزیکی غیرمنتظره بود.')
    return { trades: (list as unknown[]).map(normalizeImePhysical), noData: false }
  }
  return { trades: (data as unknown[]).map(normalizeImePhysical), noData: data.length === 0 }
}

/**
 * Commodity funds (TSETMC-style quotes). Verified live:
 * 66 rows = 52 active + 14 «2»-suffixed ghosts (filtered).
 */
export async function fetchImeFunds(): Promise<TsetmcSymbol[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('ime:funds', '/Ime/Fund.php', {}, 2 * 60_000)
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ صندوق‌های کالایی غیرمنتظره بود.')
  return (list as unknown[])
    .map(normalizeSymbol)
    .filter((s) => (s.pc ?? 0) > 1 && !(s.l18.endsWith('2') && (s.pc ?? 0) <= 1))
}

// ---------------- Market quotes ----------------

/**
 * Market quotes (gold / currency / crypto / commodity).
 * Verified live 2026-10-09 — NOTE the exact script paths:
 *  - Commodity.php, Gold_Currency.php (underscore!), Cryptocurrency.php
 * Free tier: ~1500 req/day. TTL 5min.
 */
function mnum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function mstr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v)
  return s === '' ? undefined : s
}

export function normalizeMarketQuote(raw: unknown, group: MarketGroup): MarketQuote {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    symbol: mstr(r.symbol) ?? mstr(r.name_en) ?? '',
    name: mstr(r.name) ?? mstr(r.name_en) ?? '',
    name_en: mstr(r.name_en),
    price: mnum(r.price) ?? 0,
    change_value: mnum(r.change_value),
    change_percent: mnum(r.change_percent) ?? 0,
    unit: mstr(r.unit),
    date: mstr(r.date),
    time: mstr(r.time),
    price_toman: mnum(r.price_toman),
    market_cap: mnum(r.market_cap),
    link_icon: mstr(r.link_icon),
    group,
  }
}

function quoteList(data: unknown, key: string): MarketQuote[] {
  const obj = (Array.isArray(data) ? (data as unknown[])[0] : data) as Record<string, unknown> | null
  if (!obj || typeof obj !== 'object') throw new Error('قالب پاسخ بازار غیرمنتظره بود.')
  const list = obj[key]
  if (!Array.isArray(list)) throw new Error('قالب پاسخ بازار غیرمنتظره بود.')
  return (list as unknown[]).map((r) => normalizeMarketQuote(r, key as MarketGroup))
}

export interface CommodityMarket {
  precious: MarketQuote[]
  base: MarketQuote[]
  energy: MarketQuote[]
}

export async function fetchCommodityMarket(): Promise<CommodityMarket> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('market:commodity', '/Market/Commodity.php', {}, 5 * 60_000)
  return {
    precious: quoteList(data, 'metal_precious'),
    base: quoteList(data, 'metal_base'),
    energy: quoteList(data, 'energy'),
  }
}

export interface GoldCurrencyMarket {
  gold: MarketQuote[]
  currency: MarketQuote[]
  crypto: MarketQuote[]
}

export async function fetchGoldCurrencyMarket(): Promise<GoldCurrencyMarket> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('market:goldcurrency', '/Market/Gold_Currency.php', {}, 5 * 60_000)
  return {
    gold: quoteList(data, 'gold'),
    currency: quoteList(data, 'currency'),
    crypto: quoteList(data, 'cryptocurrency'),
  }
}

/** Full 2,999-coin list sorted by market cap desc (~1MB — memory-only cache). */
export async function fetchCryptoMarket(): Promise<MarketQuote[]> {
  if (!hasApiKey()) throw new Error('NO_API_KEY')
  const data = await cachedGet<unknown>('market:crypto', '/Market/Cryptocurrency.php', {}, 5 * 60_000, { persist: false })
  const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data
  if (!Array.isArray(list)) throw new Error('قالب پاسخ رمزارز غیرمنتظره بود.')
  return (list as unknown[])
    .map((r) => normalizeMarketQuote(r, 'crypto'))
    .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
}
