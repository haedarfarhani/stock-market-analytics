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
