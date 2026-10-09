import { toGregorian, toJalaali } from 'jalaali-js'

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEnDigits(fa: string): string {
  return fa.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
}

/** 12,345,678 -> ۱۲٬۳۴۵٬۶۷۸ (fa-IR grouping, Persian digits) */
export function formatFaNumber(n: number | null | undefined, opts?: { digits?: number }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const digits = opts?.digits ?? 0
  try {
    return new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n)
  } catch {
    return toFaDigits(n.toLocaleString('en-US'))
  }
}

export function formatFaPercent(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${formatFaNumber(n, { digits })}٪`
}

export function formatFaPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${formatFaNumber(n)} ریال`
}

/** Compact: 1_245_475_000_000 -> "۱٫۲۵ همت" */
export function formatCompactFa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(n)
  const units: Array<[number, string]> = [
    [1e12, 'همت'],
    [1e9, 'میلیارد'],
    [1e6, 'میلیون'],
    [1e3, 'هزار'],
  ]
  for (const [div, label] of units) {
    if (abs >= div) {
      const v = n / div
      const digits = abs >= div * 100 ? 0 : abs >= div * 10 ? 1 : 2
      return `${formatFaNumber(v, { digits })} ${label}`
    }
  }
  return formatFaNumber(n)
}

export function nowJalali(): string {
  const d = new Date()
  const j = toJalaali(d)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return toFaDigits(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')} ${hh}:${mm}`)
}

export function todayJalali(): string {
  const d = new Date()
  const j = toJalaali(d)
  return toFaDigits(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`)
}

export function gregorianToJalali(iso: string): string {  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  const j = toJalaali(new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`))
  return toFaDigits(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`)
}

/** Live Tehran wall-clock: {timeFa: HH:MM:SS, dateFa: Jalali YYYY/MM/DD}, Persian digits. */
export function tehranNow(d: Date = new Date()): { timeFa: string; dateFa: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? ''
  const iso = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
  const j = toJalaali(new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00`))
  const dateFa = toFaDigits(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`)
  return { timeFa: toFaDigits(iso.slice(11)), dateFa }
}

/** API Symbol.php dates are already Jalali "YYYY-MM-DD" — just localize digits. */
export function formatJalaliDate(jalali: string | null | undefined): string {
  if (!jalali) return '—'
  return toFaDigits(jalali.replace(/-/g, '/'))
}

/** Jalali "YYYY-MM-DD" -> Gregorian "YYYY-MM-DD" (for chart time axes). */
export function jalaliToGregorianIso(jalali: string): string {
  const m = jalali.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return jalali
  const g = toGregorian(Number(m[1]), Number(m[2]), Number(m[3]))
  const mm = String(g.gm).padStart(2, '0')
  const dd = String(g.gd).padStart(2, '0')
  return `${g.gy}-${mm}-${dd}`
}

/* ---------- Jalali time-axis labels (lightweight-charts tickMarkFormatter) ---------- */

/** Granularity of a time-axis tick, mirroring lightweight-charts TickMarkType. */
export type AxisTickKind = 'year' | 'month' | 'day' | 'time' | 'timeWithSeconds'

let axisDtf: Intl.DateTimeFormat | null = null

/** Tehran-wall-clock parts of an instant, in the Jalali calendar (fa-IR). */
function tehranJalaliParts(ms: number): Record<string, string> {
  if (!axisDtf) {
    axisDtf = new Intl.DateTimeFormat('fa-IR', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
  }
  const out: Record<string, string> = {}
  for (const p of axisDtf.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = p.value
  }
  return out
}

/**
 * Format a chart time ("YYYY-MM-DD" daily string, BusinessDay object, or
 * UTCTimestamp seconds for intraday) as a short Jalali axis label.
 * `tickMarkType` is the lightweight-charts TickMarkType number
 * (0=Year, 1=Month, 2=DayOfMonth, 3=Time, 4=TimeWithSeconds).
 * Returns null on invalid input so the chart falls back to its default label.
 */
export function formatTimeAxisTick(time: unknown, tickMarkType: number): string | null {
  try {
    let ms: number | null = null
    if (typeof time === 'number') {
      if (!Number.isFinite(time)) return null
      ms = time > 1e11 ? time : time * 1000 // tolerate ms input; chart uses seconds
    } else if (typeof time === 'string') {
      const m = time.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (!m) return null
      // UTC midnight is 03:30 in Tehran: same calendar day, no TZ shift.
      ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    } else if (time !== null && typeof time === 'object') {
      const b = time as { year?: unknown; month?: unknown; day?: unknown }
      if (typeof b.year !== 'number' || typeof b.month !== 'number' || typeof b.day !== 'number') return null
      ms = Date.UTC(b.year, b.month - 1, b.day)
    } else {
      return null
    }
    const p = tehranJalaliParts(ms)
    const fa = (s: string | undefined): string => toFaDigits(s ?? '')
    switch (tickMarkType) {
      case 0: // Year -> ۱۴۰۳
        return fa(p.year)
      case 1: // Month -> مهر ۰۳
        return `${p.month ?? ''} ${fa((p.year ?? '').slice(-2))}`.trim() || null
      case 2: // DayOfMonth -> ۱۲ مهر
        return `${fa(p.day)} ${p.month ?? ''}`.trim() || null
      case 3: // Time (intraday) -> ۱۴:۳۰ Tehran wall clock
        return `${fa(p.hour)}:${fa(p.minute)}`
      default: // TimeWithSeconds -> ۱۴:۳۰:۰۰
        return `${fa(p.hour)}:${fa(p.minute)}:${fa(p.second)}`
    }
  } catch {
    return null
  }
}

export function isPositive(n: number | null | undefined): boolean {
  return (n ?? 0) > 0
}

export function changeClass(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return 'text-muted'
  return n > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

export function changeBgClass(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0)
    return 'bg-secondary text-muted'
  return n > 0
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
}
