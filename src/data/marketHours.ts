/**
 * Market trading sessions under the Mehr-1405 regime (per Iran-Jib report):
 *  - Equities (TSE/IFB) + equity/mixed funds: Sat–Wed 09:00–12:30
 *    (normal since 1405-03-16; TAL closing auction 12:45–13:00 for eligible symbols)
 *  - Non-equity funds (fixed-income, real-estate, FoF, VC/PE) to 18:00:
 *    TSE since 1405-07-18, IFB since 1405-07-19 (IFB fixed-income opens 08:30)
 *  - IME gold/silver funds, certificates, derivatives: close 18:00 (since 17:00);
 *    spot certificates + commodity derivatives ALSO trade Thursdays 11:45–15:00
 *    (pre-open 11:30–11:45; saffron certificates excluded)
 *  - Energy: physical 09:00–15:00, financial/derivatives 08:55–15:00
 *
 * All calculations use Asia/Tehran wall-clock. Official holidays are NOT
 * encoded (only Fri full-close + Thu IME-only); statuses are indicative.
 */

export type TradingDayKind = 'full' | 'ime-only' | 'closed'
export type SegmentId = 'equity' | 'funds-fixed' | 'ime' | 'energy'

export interface SegmentStatus {
  id: SegmentId
  label: string
  open: boolean
  /** short human note, e.g. session range or TAL */
  note: string
  closesAt?: string
}

export interface MarketDayStatus {
  tehranTime: string // HH:MM
  weekdayFa: string
  kind: TradingDayKind
  segments: SegmentStatus[]
}

const TEHRAN_TZ = 'Asia/Tehran'
const FA_WEEKDAY: Record<string, string> = {
  Sat: 'شنبه',
  Sun: 'یکشنبه',
  Mon: 'دوشنبه',
  Tue: 'سه‌شنبه',
  Wed: 'چهارشنبه',
  Thu: 'پنجشنبه',
  Fri: 'جمعه',
}

function tehranParts(d: Date): { wd: string; minutes: number; hhmm: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TEHRAN_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = fmt.formatToParts(d)
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? ''
  const wd = get('weekday')
  const h = Number(get('hour'))
  const m = Number(get('minute'))
  return { wd, minutes: h * 60 + m, hhmm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
}

const inRange = (t: number, a: string, b: string): boolean => {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return t >= ah * 60 + am && t < bh * 60 + bm
}

export function getMarketDayStatus(now: Date = new Date()): MarketDayStatus {
  const { wd, minutes: t, hhmm } = tehranParts(now)
  const fullDay = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed'].includes(wd)
  const thu = wd === 'Thu'
  const kind: TradingDayKind = fullDay ? 'full' : thu ? 'ime-only' : 'closed'

  const equityOpen = fullDay && inRange(t, '09:00', '12:30')
  const talOpen = fullDay && inRange(t, '12:45', '13:00')
  const fixedOpen = fullDay && inRange(t, '08:30', '18:00')
  const imeOpen = (fullDay && inRange(t, '09:00', '18:00')) || (thu && inRange(t, '11:45', '15:00'))
  const energyOpen = fullDay && inRange(t, '08:55', '15:00')

  const segments: SegmentStatus[] = [
    {
      id: 'equity',
      label: 'سهام و صندوق سهامی',
      open: equityOpen || talOpen,
      note: equityOpen ? 'تا ۱۲:۳۰' : talOpen ? 'حراج پایانی (TAL) تا ۱۳:۰۰' : '۹:۰۰ تا ۱۲:۳۰',
      closesAt: equityOpen ? '12:30' : talOpen ? '13:00' : undefined,
    },
    {
      id: 'funds-fixed',
      label: 'درآمد ثابت و غیرسهامی',
      open: fixedOpen,
      note: fixedOpen ? 'تا ۱۸:۰۰' : '۸:۳۰ تا ۱۸:۰۰',
      closesAt: fixedOpen ? '18:00' : undefined,
    },
    {
      id: 'ime',
      label: 'بورس کالا',
      open: imeOpen,
      note: imeOpen ? (thu ? 'پنجشنبه تا ۱۵:۰۰' : 'تا ۱۸:۰۰') : thu ? 'پنجشنبه ۱۱:۴۵ تا ۱۵:۰۰' : '۹:۰۰ تا ۱۸:۰۰',
      closesAt: imeOpen ? (thu ? '15:00' : '18:00') : undefined,
    },
    {
      id: 'energy',
      label: 'بورس انرژی',
      open: energyOpen,
      note: energyOpen ? 'تا ۱۵:۰۰' : '۸:۵۵ تا ۱۵:۰۰',
      closesAt: energyOpen ? '15:00' : undefined,
    },
  ]

  return { tehranTime: hhmm, weekdayFa: FA_WEEKDAY[wd] ?? wd, kind, segments }
}

/** Static reference table (article values) for the schedule disclosure. */
export const SCHEDULE_ROWS: Array<[string, string]> = [
  ['سهام بورس تهران', '۹ تا ۱۲:۳۰'],
  ['سهام فرابورس', '۹ تا ۱۲:۳۰'],
  ['صندوق‌های سهامی و مختلط', '۹ تا ۱۲:۳۰'],
  ['حراج پایانی نمادهای مشمول (TAL)', '۱۲:۴۵ تا ۱۳:۰۰'],
  ['صندوق‌های غیرسهامی بورس تهران (از ۱۸ مهر)', 'پایان ۱۸:۰۰'],
  ['درآمد ثابت فرابورس (از ۱۹ مهر)', '۸:۳۰ تا ۱۸:۰۰'],
  ['سایر غیرسهامی فرابورس (از ۱۹ مهر)', '۹:۰۰ تا ۱۸:۰۰'],
  ['صندوق طلا/نقره و ابزارهای مشمول کالا', 'پایان ۱۸:۰۰'],
  ['گواهی سپرده و مشتقه کالا در پنجشنبه', '۱۱:۴۵ تا ۱۵:۰۰'],
  ['بازار فیزیکی بورس انرژی', '۹:۰۰ تا ۱۵:۰۰'],
  ['مالی و مشتقه بورس انرژی', '۸:۵۵ تا ۱۵:۰۰'],
]
