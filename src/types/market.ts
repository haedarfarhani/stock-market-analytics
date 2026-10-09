/**
 * Shared domain types. Field names mirror BrsApi/TSETMC naming (l18, pl, pc, …)
 * so mapping code stays obvious. See API_INTEGRATION.md for full schema refs.
 */

export interface TsetmcSymbol {
  /** Persian ticker, e.g. "شتران" */
  l18: string
  /** Company name */
  l30: string
  isin: string
  /** internal TSETMC id */
  id: string
  /** industry group */
  cs?: string
  cs_id?: number | string
  time?: string
  /** shares outstanding */
  z?: number
  bvol?: number
  mv?: number
  eps?: number | null
  pe?: number | null
  tmin?: number
  tmax?: number
  pmin?: number
  pmax?: number
  /** yesterday close */
  py?: number
  /** first price */
  pf?: number
  /** last price */
  pl?: number
  plc?: number
  plp?: number
  /** close price */
  pc?: number
  pcc?: number
  pcp?: number
  tno?: number
  tvol?: number
  tval?: number
  Buy_CountI?: number
  Buy_CountN?: number
  Sell_CountI?: number
  Sell_CountN?: number
  Buy_I_Volume?: number
  Buy_N_Volume?: number
  Sell_I_Volume?: number
  Sell_N_Volume?: number
  market?: 'tse' | 'ifb' | 'etf' | string
}

export interface MarketIndex {
  code: string
  name: string
  value: number
  change: number
  changePercent: number
  time?: string
  min?: number
  max?: number
}

/**
 * Index.php snapshots. Verified live 2026-10-09 (type is REQUIRED):
 *  - type=1 (بورس): single object {date,time,state,index,index_change,
 *    index_equalWeight,index_equalWeight_change,mv,tno,tval,tvol} — NO percent fields.
 *  - type=2 (فرابورس): single object {date,time,state,index,index_change,
 *    mv_main,mv_base,tno,tval,tvol}.
 *  - type=3 (منتخب): ARRAY of {name,time,index,index_change,index_change_percent,min,max}.
 */
export interface BourseIndexSnapshot {
  date?: string
  time?: string
  state?: string
  index: number
  index_change: number
  equalWeight: number
  equalWeight_change: number
  mv?: number
  tno?: number
  tvol?: number
  tval?: number
}

export interface IfbIndexSnapshot {
  date?: string
  time?: string
  state?: string
  index: number
  index_change: number
  mv_main?: number
  mv_base?: number
  tno?: number
  tvol?: number
  tval?: number
}

export interface IndexMeta {
  date?: string
  time?: string
  state?: string
  tno?: number
  tvol?: number
  tval?: number
  mv?: number
  mv_main?: number
  mv_base?: number
}

/**
 * Nav.php response. Verified live 2026-10-09 (Nav.php?l18=اهرم):
 * single object {date,time,psubtran,predtran} — NO l18 echo.
 * `l18` param is REQUIRED (missing -> HTTP 400 missing_param).
 * There is NO bulk endpoint: one request per fund — fetch on demand only.
 */
export interface FundNav {
  l18: string
  date?: string
  time?: string
  /** NAV صدور */
  psubtran: number
  /** NAV ابطال (مبنای حباب) */
  predtran: number
}

export interface EtfFund {
  symbol: string
  name: string
  price: number
  nav: number
  premiumDiscountPercent: number
  changePercent: number
  volume?: number
  marketValue?: number
  type: 'سهامی' | 'درآمد ثابت' | 'طلا' | 'مختلط' | 'اهرمی' | string
}

export interface OptionContract {
  symbol: string
  underlying: string
  strike: number
  expiryFa: string
  expiryDays: number
  callPrice: number
  putPrice?: number
  openInterest: number
  volume: number
  changePercent: number
  market: 'بورس' | 'کالا'
}

/**
 * Tsetmc/Option.php contract. Verified live 2026-10-09 (one call, 1,625 rows):
 * {time, base_l18, l18, l30, isin, base_id, id, cs, cs_id, type: call|put,
 *  date_begin/end (Jalali), day_remain, size_contract, price_strike,
 *  interest_open, base_py/pl/plp/pc/pcp, tmin/tmax, pmin/pmax, py/pf/pl/plc/plp,
 *  pc/pcc/pcp, tno/tvol/tval, nval, Buy/Sell counts+volumes, 5-level book}.
 * ids are JSON numbers — stringified in normalization.
 */
export interface OptionContractLive {
  l18: string
  l30: string
  isin: string
  id: string
  base_l18: string
  base_id: string
  type: 'call' | 'put'
  date_begin?: string
  date_end?: string
  day_remain?: number
  size_contract?: number
  price_strike: number
  interest_open?: number
  base_pc?: number
  base_pcp?: number
  pl?: number
  plp?: number
  pc?: number
  pcp?: number
  tno?: number
  tvol?: number
  tval?: number
  nval?: number
  time?: string
}

/**
 * Tsetmc/Transaction.php tick. Verified live 2026-10-09 (اهرم: 17,070 rows):
 * array of {row, time (HH:MM:SS), volume, price, canceled: 0|1}.
 * Params: l18 REQUIRED, date (Jalali YYYY-MM-DD) optional -> latest trading day.
 */
export interface TickTrade {  row: number
  time: string
  volume: number
  price: number
  canceled: boolean
}

/**
 * Tsetmc/History.php type=0 row. Verified live 2026-10-09 (فملی: 4,670 rows,
 * newest-first, 1405-07-15 back to 1385-11-15): daily OHLCV + changes.
 * Only type=0 (معاملات و قیمت) is documented; other types unverified.
 */
export interface DailyHistory {
  /** Jalali YYYY-MM-DD */
  date: string
  time?: string
  tno?: number
  tvol?: number
  tval?: number
  pmin?: number
  pmax?: number
  py?: number
  pf?: number
  pl?: number
  plc?: number
  plp?: number
  pc?: number
  pcc?: number
  pcp?: number
}

/**
 * Tsetmc/Candlestick.php candle. Verified live 2026-10-09 (فملی):
 * wrapper {l18, type, count, candle_*} with per-type keys:
 *  - type=1 (امروز، ۲دقیقه‌ای): `candle_intraday`, 105 rows {time: HH:MM, ohlc, volume}
 *  - type=2 (تعدیل‌نشده روزانه): `candle_daily`, {date, ohlc, volume}
 *  - type=3 (تعدیل‌شده روزانه): `candle_daily_adjusted`, 4,303 rows, same shape
 * dates Jalali YYYY-MM-DD (docs also show slashes — normalize both).
 */
export interface DailyCandle {
  /** Jalali YYYY-MM-DD (daily) */
  date?: string
  /** HH:MM (intraday) */
  time?: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type CandleKind = 'adjusted' | 'unadjusted' | 'intraday'
/**
 * Codal/Announcement.php row. Verified live 2026-10-09:
 * wrapper {count_announcement, count_page, announcement: [...20/page]}.
 * Rows: {l18, l30, title, code, date_title, date_send, time_send,
 * date_publish, time_publish, link, link_pdf, link_excel, link_attachment}.
 * Dates are Persian-digit Jalali with slashes. No category echo in rows.
 */
/**
 * IME/Option.php pair row. Verified live 2026-10-09 (151 rows, ~380KB):
 * wrapper {data: [...]}; each row = one strike with call_* + put_* legs.
 * Illiquid legs are null-heavy (especially put_*). contract_category carries
 * tabs + expiry text («AB05\t\t\tتاریخ سررسید: 1405/08/23») — trim it.
 */
export interface ImeOptionLeg {
  code?: string
  date_end?: string
  day_remain?: number
  pl?: number
  plp?: number
  interest_open?: number
  tvol?: number
  tval?: number
  margin_initial?: number
}

export interface ImeOptionPair {
  category: string
  commodity?: string
  strike: number
  level?: string
  date_update?: string
  call: ImeOptionLeg
  put: ImeOptionLeg
}

/**
 * IME/Certificate.php row. Verified live 2026-10-09 (11 rows, ~9KB):
 * wrapper {data: [...]}; spot quote {commodity, contract_code/description,
 * py/pf/pl (+changes), pmax/pmin, tno/tvol/tval (هزار ریال), 3-level book}.
 */
export interface ImeCertificate {
  commodity: string
  contract_code: string
  contract_description: string
  contract_size?: number
  contract_size_unit?: string
  py?: number
  pf?: number
  pfp?: number
  pmax?: number
  pmin?: number
  pl?: number
  plp?: number
  tno?: number
  tvol?: number
  tval?: number
  tval_unit?: string
  date_update?: string
  time_update?: string
}

/**
 * IME/Physical.php trade. Verified live 2026-10-09 (1405-07-15: 129 rows):
 * DUAL SHAPE — holidays return wrapper {successful, status:'no_data'} with NO
 * data key; trading days return a BARE ARRAY. tval in هزار ریال.
 * Dates mixed Jalali-slash (date_trade) + Gregorian (date_price_settlement).
 */
export interface ImePhysicalTrade {
  l18: string
  l30: string
  market_hall?: string
  producer?: string
  supplier?: string
  broker?: string
  type_contract?: string
  type_settlement?: string
  date_trade?: string
  pl?: number
  pc?: number
  pmin?: number
  pmax?: number
  price_base_offer?: number
  volume_contract?: number
  volume_offer?: number
  demand?: number
  tval?: number
  unit?: string
  currency?: string
}

export interface ImePhysicalResult {
  trades: ImePhysicalTrade[]
  /** true when the API reported a holiday/no-data day */
  noData: boolean
}

export interface CodalAnnouncement {
  symbol: string
  company: string
  title: string
  code?: string
  /** UI-side category label (filter / mock only — API rows carry no category) */
  categoryLabel?: string
  date_title?: string
  date_send?: string
  time_send?: string
  date_publish?: string
  time_publish?: string
  link?: string
  link_pdf?: string
  link_excel?: string
  link_attachment?: string
}

export interface CodalPage {
  total: number
  pages: number
  page: number
  items: CodalAnnouncement[]
}

export type CodalCategoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

export const CODAL_CATEGORIES: Record<CodalCategoryId, string> = {
  1: 'اطلاعات و صورت مالی سالانه',
  2: 'افشای اطلاعات بااهمیت و شفاف‌سازی',
  3: 'گزارش عملکرد ماهانه',
  4: 'اساسنامه/امیدنامه',
  5: 'هیئت مدیره و کمیته حسابرسی',
  6: 'آگهی مجامع و تصمیمات',
  7: 'افزایش سرمایه',
  8: 'شفاف‌سازی بورس/فرابورس',
  9: 'شفاف‌سازی سازمان',
  10: 'سایر',
  11: 'اوراق بدهی',
}

export interface CodalQuery {
  l18?: string
  category?: CodalCategoryId
  period?: number
  audited?: boolean
  unaudited?: boolean
  only_main_company?: boolean
  only_subsidiaries?: boolean
  date_start?: string
  date_end?: string
  page?: number
}

export interface AssemblyMeeting {
  title: string
  date_title?: string
  date_send?: string
  time_send?: string
  date_publish?: string
  time_publish?: string
  content?: string
}

/**
 * Full Symbol.php response. Verified live 2026-10-09:
 * single JSON object (not array), Jalali dates (YYYY-MM-DD),
 * real JSON numbers, `z_issued` nullable, `assembly[]` meetings.
 */
export interface TsetmcSymbolDetail extends TsetmcSymbol {
  date_update?: string
  date?: string
  state?: string
  l30_en?: string
  code_12?: string
  code_5?: string
  code_4?: string
  m?: string
  m_board?: string
  m_board_id?: number | string
  m_board_code?: string
  cs_sub?: string
  cs_sub_id?: number | string
  z_issued?: number
  ff?: number
  g_pe?: number
  ps?: number
  pmin_1w?: number
  pmax_1w?: number
  pmin_1y?: number
  pmax_1y?: number
  tvol_avg_1m?: number
  assembly?: AssemblyMeeting[]
}

export interface CommodityPrice {
  name: string
  unit: string
  price: number
  change: number
  changePercent: number
  market: 'طلا' | 'ارز' | 'رمزارز' | 'کالا'
  updatedFa: string
}

export type MarketGroup = 'gold' | 'currency' | 'crypto' | 'metal_precious' | 'metal_base' | 'energy'

/**
 * Unified Market/* quote. Verified live 2026-10-09:
 *  - Commodity.php -> wrapper {metal_precious[4], metal_base[5], energy[5]}
 *  - Gold_Currency.php -> wrapper {gold[9], currency[28], cryptocurrency[19]}
 *  - Cryptocurrency.php -> array of 2,999
 * Item fields: {date, time, time_unix, symbol?, name(_en)?, price, price_toman?,
 * change_value?, change_percent, market_cap?, link_icon?, unit?}.
 * Gotchas: crypto prices arrive as STRINGS; dates use slashes (1405/07/17).
 */
export interface MarketQuote {  symbol: string
  name: string
  name_en?: string
  price: number
  change_value?: number
  change_percent: number
  unit?: string
  date?: string
  time?: string
  price_toman?: number
  market_cap?: number
  link_icon?: string
  group: MarketGroup
}

/**
 * IME/Futures.php contract. Verified live 2026-10-09 (19 rows, ~19KB):
 * wrapper {code_http, successful, status, message_error, data: [...]}.
 * Gotchas: date_end can be '0000-00-00', day_remain nullable,
 * tval_unit is usually «هزار ریال» (values in thousands).
 */
export interface ImeFuture {
  contract_code: string
  contract_description: string
  contract_size?: number
  contract_size_unit?: string
  date_end?: string
  date_end_text?: string
  day_remain?: number
  margin_initial?: number
  margin_maintenance?: number
  interest_open?: number
  py?: number
  pl?: number
  plp?: number
  pls?: number
  tvol?: number
  tval?: number
  tval_unit?: string
  date_update?: string
  time_update?: string
}

export interface CandlePoint {
  /** Gregorian YYYY-MM-DD (daily) or UTCTimestamp seconds (intraday) */
  time: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Tsetmc/Shareholder.php row. Verified live 2026-10-09 (شتران: 20 rows):
 * array of {id, name, volume, percent, change} — tiny payload (~3KB).
 * Params: l18 REQUIRED, date (Jalali YYYY-MM-DD) optional -> latest state.
 */
export interface ShareholderRow {
  id?: number | string
  name: string
  shares: number
  percent: number
  change?: number
}

export type DataStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale'

export interface PageState {
  status: DataStatus
  error: string | null
  updatedAtFa: string | null
  /** true when rows come from local mock, false when live API */
  isMock: boolean
}
