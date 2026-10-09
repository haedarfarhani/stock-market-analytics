import type { IndicatorInstance, IndicatorLine, WorkspaceCandle } from './types.ts'

/**
 * Pure technical-indicator calculators. All functions take oldest-first
 * candles and return values aligned by index (NaN = warm-up, trimmed by
 * the adapter before plotting). No DOM, no chart dependency — unit-tested
 * via verify script against hand-checked values.
 */

export const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (period <= 0) return out
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const v = num(values[i])
    if (!Number.isFinite(v)) {
      sum = 0
      // restart window after gap
      let k = 0
      for (let j = i; j >= 0 && k < period; j--, k++) {
        const w = num(values[j])
        if (!Number.isFinite(w)) break
        sum += w
      }
      if (k === period) out[i] = sum / period
      continue
    }
    sum += v
    if (i >= period) sum -= num(values[i - period])
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (period <= 0 || values.length < period) return out
  const k = 2 / (period + 1)
  let seed = 0
  for (let i = 0; i < period; i++) {
    if (!Number.isFinite(num(values[i]))) return out
    seed += num(values[i])
  }
  let prev = seed / period
  out[period - 1] = prev
  for (let i = period; i < values.length; i++) {
    const v = num(values[i])
    if (!Number.isFinite(v)) continue
    prev = v * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

export function wma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (period <= 0) return out
  const denom = (period * (period + 1)) / 2
  for (let i = period - 1; i < values.length; i++) {
    let acc = 0
    let ok = true
    for (let j = 0; j < period; j++) {
      const v = num(values[i - period + 1 + j])
      if (!Number.isFinite(v)) {
        ok = false
        break
      }
      acc += v * (j + 1)
    }
    if (ok) out[i] = acc / denom
  }
  return out
}

function typical(c: WorkspaceCandle): number {
  return (c.high + c.low + c.close) / 3
}

/** Session VWAP (resets each calendar day). Needs intraday bars with volume. */
export function sessionVwap(candles: WorkspaceCandle[]): { values: number[]; ok: boolean } {
  const values = new Array<number>(candles.length).fill(NaN)
  let pv = 0
  let v = 0
  let day = ''
  let ok = false
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const t = String(c.time)
    const d = t.includes(' ') ? t.slice(0, 10) : t.slice(0, 10)
    if (d !== day) {
      day = d
      pv = 0
      v = 0
    }
    const vol = c.volume ?? NaN
    if (Number.isFinite(vol) && vol > 0) {
      pv += typical(c) * vol
      v += vol
      values[i] = pv / v
      ok = true
    }
  }
  return { values, ok }
}

/** Rolling VWAP(n) approximation for daily bars (labeled as such in UI). */
export function rollingVwap(candles: WorkspaceCandle[], period: number): number[] {
  const out = new Array<number>(candles.length).fill(NaN)
  let pv = 0
  let v = 0
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const vol = c.volume ?? 0
    pv += typical(c) * vol
    v += vol
    if (i >= period) {
      const o = candles[i - period]!
      pv -= typical(o) * (o.volume ?? 0)
      v -= o.volume ?? 0
    }
    if (i >= period - 1 && v > 0) out[i] = pv / v
  }
  return out
}

export function bollinger(values: number[], period: number, mult: number): { basis: number[]; upper: number[]; lower: number[] } {
  const basis = sma(values, period)
  const upper = new Array<number>(values.length).fill(NaN)
  const lower = new Array<number>(values.length).fill(NaN)
  for (let i = period - 1; i < values.length; i++) {
    if (!Number.isFinite(basis[i])) continue
    let sum = 0
    let ok = true
    for (let j = i - period + 1; j <= i; j++) {
      const v = num(values[j])
      if (!Number.isFinite(v)) {
        ok = false
        break
      }
      sum += (v - (basis[i] as number)) ** 2
    }
    if (!ok) continue
    const sd = Math.sqrt(sum / period)
    upper[i] = (basis[i] as number) + mult * sd
    lower[i] = (basis[i] as number) - mult * sd
  }
  return { basis, upper, lower }
}

export function rsi(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (values.length <= period) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i++) {
    const a = num(values[i])
    const b = num(values[i - 1])
    if (!Number.isFinite(a) || !Number.isFinite(b)) return out
    const d = a - b
    if (d > 0) gain += d
    else loss -= d
  }
  let ag = gain / period
  let al = loss / period
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  for (let i = period + 1; i < values.length; i++) {
    const a = num(values[i])
    const b = num(values[i - 1])
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    const d = a - b
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  }
  return out
}

export function macd(values: number[], fast: number, slow: number, signal: number): { macd: number[]; sig: number[]; hist: number[] } {
  const ef = ema(values, fast)
  const es = ema(values, slow)
  const line = values.map((_, i) => (Number.isFinite(ef[i] as number) && Number.isFinite(es[i] as number) ? (ef[i] as number) - (es[i] as number) : NaN))
  const firstValid = line.findIndex((v) => Number.isFinite(v))
  const sig = new Array<number>(values.length).fill(NaN)
  const hist = new Array<number>(values.length).fill(NaN)
  if (firstValid < 0) return { macd: line, sig, hist }
  // EMA of the macd line over its valid tail
  const tail = line.slice(firstValid)
  const esig = ema(tail, signal)
  for (let i = 0; i < tail.length; i++) {
    const idx = firstValid + i
    if (Number.isFinite(esig[i] as number)) {
      sig[idx] = esig[i] as number
      hist[idx] = (line[idx] as number) - (esig[i] as number)
    }
  }
  return { macd: line, sig, hist }
}

export function stochastic(candles: WorkspaceCandle[], kPeriod: number, slowing: number, dPeriod: number): { k: number[]; d: number[] } {
  const raw = new Array<number>(candles.length).fill(NaN)
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - kPeriod + 1; j <= i; j++) {
      const c = candles[j]!
      hi = Math.max(hi, c.high)
      lo = Math.min(lo, c.low)
    }
    raw[i] = hi === lo ? 50 : ((candles[i]!.close - lo) / (hi - lo)) * 100
  }
  const k = sma(raw.filter(() => true), 1).map(() => NaN)
  // SMA with skip-NaN semantics for smoothing
  const smooth = (src: number[], p: number): number[] => {
    const o = new Array<number>(src.length).fill(NaN)
    for (let i = 0; i < src.length; i++) {
      const win: number[] = []
      for (let j = i; j >= 0 && win.length < p; j--) {
        if (Number.isFinite(src[j])) win.push(src[j] as number)
        else break
      }
      if (win.length === p) o[i] = win.reduce((a, b) => a + b, 0) / p
    }
    return o
  }
  const kk = smooth(raw, slowing)
  const dd = smooth(kk, dPeriod)
  void k
  return { k: kk, d: dd }
}

function wilderRma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  if (values.length <= period) return out
  let seed = 0
  for (let i = 1; i <= period; i++) {
    const v = num(values[i])
    if (!Number.isFinite(v)) return out
    seed += v
  }
  let prev = seed / period
  out[period] = prev
  for (let i = period + 1; i < values.length; i++) {
    const v = num(values[i])
    if (!Number.isFinite(v)) continue
    prev = (prev * (period - 1) + v) / period
    out[i] = prev
  }
  return out
}

export function atr(candles: WorkspaceCandle[], period: number): number[] {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low
    const pc = candles[i - 1]!.close
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc))
  })
  return wilderRma([NaN, ...tr.slice(1)], period)
}

export function adx(candles: WorkspaceCandle[], period: number): { adx: number[]; plusDI: number[]; minusDI: number[] } {
  const n = candles.length
  const pdm = new Array<number>(n).fill(0)
  const mdm = new Array<number>(n).fill(0)
  const tr = new Array<number>(n).fill(0)
  for (let i = 1; i < n; i++) {
    const c = candles[i]!
    const p = candles[i - 1]!
    const up = c.high - p.high
    const dn = p.low - c.low
    pdm[i] = up > dn && up > 0 ? up : 0
    mdm[i] = dn > up && dn > 0 ? dn : 0
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close))
  }
  const atrV = wilderRma([NaN, ...tr.slice(1)], period)
  const pdmS = wilderRma([NaN, ...pdm.slice(1)], period)
  const mdmS = wilderRma([NaN, ...mdm.slice(1)], period)
  const plusDI = new Array<number>(n).fill(NaN)
  const minusDI = new Array<number>(n).fill(NaN)
  const dx = new Array<number>(n).fill(NaN)
  for (let i = 0; i < n; i++) {
    const a = atrV[i]
    if (!Number.isFinite(a) || a === 0) continue
    plusDI[i] = ((pdmS[i] as number) / (a as number)) * 100
    minusDI[i] = ((mdmS[i] as number) / (a as number)) * 100
    const s = (plusDI[i] as number) + (minusDI[i] as number)
    dx[i] = s === 0 ? 0 : (Math.abs((plusDI[i] as number) - (minusDI[i] as number)) / s) * 100
  }
  // ADX = Wilder smoothing of DX (first ADX at 2*period)
  const adxV = new Array<number>(n).fill(NaN)
  const first = dx.findIndex((v) => Number.isFinite(v))
  if (first >= 0) {
    const tail = dx.slice(first)
    const r = wilderRma([NaN, ...tail.slice(1)], period)
    // align: r[period] corresponds to tail[period-1]... approximate standard:
    for (let i = 0; i < tail.length; i++) {
      const idx = first + i
      if (Number.isFinite(r[i])) adxV[idx] = r[i] as number
    }
    // seed with SMA of first `period` DX values at first+period-1
    let seed = 0
    let cnt = 0
    for (let i = first; i < first + period && i < n; i++) {
      if (Number.isFinite(dx[i])) {
        seed += dx[i] as number
        cnt++
      }
    }
    if (cnt === period) adxV[first + period - 1] = seed / period
  }
  return { adx: adxV, plusDI, minusDI }
}

export function obv(candles: WorkspaceCandle[]): number[] {
  const out = new Array<number>(candles.length).fill(NaN)
  let acc = 0
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const vol = c.volume ?? NaN
    if (!Number.isFinite(vol)) continue
    if (i > 0) {
      if (c.close > candles[i - 1]!.close) acc += vol
      else if (c.close < candles[i - 1]!.close) acc -= vol
    }
    out[i] = acc
  }
  return out
}

export function ichimoku(
  candles: WorkspaceCandle[],
  tenkanP: number,
  kijunP: number,
  senkouBP: number,
): { tenkan: number[]; kijun: number[]; senkouA: number[]; senkouB: number[]; chikou: number[] } {
  const mid = (p: number, i: number): number => {
    if (i < p - 1) return NaN
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - p + 1; j <= i; j++) {
      const c = candles[j]!
      hi = Math.max(hi, c.high)
      lo = Math.min(lo, c.low)
    }
    return (hi + lo) / 2
  }
  const n = candles.length
  const tenkan = candles.map((_, i) => mid(tenkanP, i))
  const kijun = candles.map((_, i) => mid(kijunP, i))
  const senkouB = candles.map((_, i) => mid(senkouBP, i))
  const senkouA = candles.map((_, i) =>
    Number.isFinite(tenkan[i]) && Number.isFinite(kijun[i]) ? ((tenkan[i] as number) + (kijun[i] as number)) / 2 : NaN,
  )
  const chikou = candles.map((_, i) => (i + kijunP < n ? candles[i + kijunP]!.close : NaN))
  return { tenkan, kijun, senkouA, senkouB, chikou }
}

// ---------------- registry ----------------

export type IndicatorKind = 'overlay' | 'oscillator' | 'volume-overlay'

export interface IndicatorParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
}

export interface IndicatorDef {
  key: string
  labelFa: string
  kind: IndicatorKind
  description: string
  params: IndicatorParamDef[]
  defaults: Record<string, number>
  colors: Record<string, string>
  /** daily-only data gates (e.g. session VWAP needs intraday bars) */
  needsIntraday?: boolean
  compute: (candles: WorkspaceCandle[], p: Record<string, number>, colors: Record<string, string>) => IndicatorLine[]
}

function line(
  id: string,
  label: string,
  color: string,
  candles: WorkspaceCandle[],
  values: number[],
  seriesType: IndicatorLine['seriesType'] = 'line',
): IndicatorLine {
  const data: Array<{ time: WorkspaceCandle['time']; value: number }> = []
  for (let i = 0; i < candles.length; i++) {
    const v = values[i]
    if (v !== undefined && Number.isFinite(v)) data.push({ time: candles[i]!.time, value: v as number })
  }
  return { id, label, color, seriesType, data, priceLineVisible: false, lastValueVisible: true }
}

const C = {
  sma: '#38bdf8',
  ema: '#fbbf24',
  wma: '#a78bfa',
  bb: '#f472b6',
  vwap: '#22d3ee',
  rsi: '#c084fc',
  macd: '#38bdf8',
  macdSig: '#fb7185',
  macdHist: '#f472b6',
  stochK: '#fbbf24',
  stochD: '#38bdf8',
  atr: '#fb7185',
  adx: '#fbbf24',
  pdi: '#34d399',
  mdi: '#fb7185',
  obv: '#38bdf8',
  volma: '#fbbf24',
  tenkan: '#38bdf8',
  kijun: '#fb7185',
  senkouA: '#34d399',
  senkouB: '#fb7185',
  chikou: '#e879f9',
}

export const INDICATORS: IndicatorDef[] = [
  {
    key: 'sma',
    labelFa: 'میانگین متحرک ساده',
    kind: 'overlay',
    description: 'SMA — میانگین حسابی قیمت پایانی در دوره',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 400, step: 1 }],
    defaults: { period: 20 },
    colors: { sma: C.sma },
    compute: (cs, p, c) => [line('sma', `SMA ${p.period}`, c.sma, cs, sma(cs.map((x) => x.close), p.period))],
  },
  {
    key: 'ema',
    labelFa: 'میانگین متحرک نمایی',
    kind: 'overlay',
    description: 'EMA — وزن بیشتر به قیمت‌های اخیر',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 400, step: 1 }],
    defaults: { period: 20 },
    colors: { ema: C.ema },
    compute: (cs, p, c) => [line('ema', `EMA ${p.period}`, c.ema, cs, ema(cs.map((x) => x.close), p.period))],
  },
  {
    key: 'wma',
    labelFa: 'میانگین متحرک وزنی',
    kind: 'overlay',
    description: 'WMA — وزن خطی صعودی به قیمت‌های اخیر',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 400, step: 1 }],
    defaults: { period: 20 },
    colors: { wma: C.wma },
    compute: (cs, p, c) => [line('wma', `WMA ${p.period}`, c.wma, cs, wma(cs.map((x) => x.close), p.period))],
  },
  {
    key: 'bb',
    labelFa: 'باندهای بولینگر',
    kind: 'overlay',
    description: 'باند میانی SMA با انحراف معیار بالا/پایین',
    params: [
      { key: 'period', label: 'دوره', min: 2, max: 200, step: 1 },
      { key: 'mult', label: 'ضریب', min: 0.5, max: 4, step: 0.1 },
    ],
    defaults: { period: 20, mult: 2 },
    colors: { basis: C.bb, upper: C.bb, lower: C.bb },
    compute: (cs, p, c) => {
      const closes = cs.map((x) => x.close)
      const { basis, upper, lower } = bollinger(closes, p.period, p.mult)
      return [
        line('basis', `BB basis ${p.period}`, c.basis, cs, basis),
        line('upper', `BB upper`, c.upper, cs, upper),
        line('lower', `BB lower`, c.lower, cs, lower),
      ]
    },
  },
  {
    key: 'vwap',
    labelFa: 'میانگین موزون حجمی',
    kind: 'overlay',
    description: 'VWAP روزانه — در تایم‌فریم روزانه، میانگین غلتان ۱۴ دوره‌ای (تقریبی) نمایش داده می‌شود',
    params: [{ key: 'period', label: 'دوره (روزانه)', min: 2, max: 200, step: 1 }],
    defaults: { period: 14 },
    colors: { vwap: C.vwap },
    compute: (cs, p, c) => {
      const intraday = cs.some((x) => String(x.time).includes(' ') || typeof x.time === 'number')
      if (intraday) {
        const { values } = sessionVwap(cs)
        return [line('vwap', 'VWAP روزانه', c.vwap, cs, values)]
      }
      return [line('vwap', `VWAP~${p.period} (تقریبی)`, c.vwap, cs, rollingVwap(cs, p.period))]
    },
  },
  {
    key: 'rsi',
    labelFa: 'شاخص قدرت نسبی',
    kind: 'oscillator',
    description: 'RSI وایلدر — مومنتوم ۰ تا ۱۰۰',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 100, step: 1 }],
    defaults: { period: 14 },
    colors: { rsi: C.rsi },
    compute: (cs, p, c) => [line('rsi', `RSI ${p.period}`, c.rsi, cs, rsi(cs.map((x) => x.close), p.period))],
  },
  {
    key: 'macd',
    labelFa: 'مکدی',
    kind: 'oscillator',
    description: 'MACD — اختلاف EMAها با خط سیگنال و هیستوگرام',
    params: [
      { key: 'fast', label: 'سریع', min: 2, max: 50, step: 1 },
      { key: 'slow', label: 'کند', min: 3, max: 200, step: 1 },
      { key: 'signal', label: 'سیگنال', min: 2, max: 50, step: 1 },
    ],
    defaults: { fast: 12, slow: 26, signal: 9 },
    colors: { macd: C.macd, sig: C.macdSig, hist: C.macdHist },
    compute: (cs, p, c) => {
      const closes = cs.map((x) => x.close)
      const { macd: m, sig: s, hist: h } = macd(closes, p.fast, p.slow, p.signal)
      return [
        line('macd', 'MACD', c.macd, cs, m),
        line('sig', 'Signal', c.sig, cs, s),
        line('hist', 'Hist', c.hist, cs, h, 'histogram'),
      ]
    },
  },
  {
    key: 'stoch',
    labelFa: 'استوکاستیک',
    kind: 'oscillator',
    description: 'نوسانگر %K و %D',
    params: [
      { key: 'k', label: '%K', min: 2, max: 100, step: 1 },
      { key: 'slowing', label: 'کندشونده', min: 1, max: 20, step: 1 },
      { key: 'd', label: '%D', min: 2, max: 50, step: 1 },
    ],
    defaults: { k: 14, slowing: 3, d: 3 },
    colors: { k: C.stochK, d: C.stochD },
    compute: (cs, p, c) => {
      const { k, d } = stochastic(cs, p.k, p.slowing, p.d)
      return [line('k', '%K', c.k, cs, k), line('d', '%D', c.d, cs, d)]
    },
  },
  {
    key: 'atr',
    labelFa: 'میانگین دامنه واقعی',
    kind: 'oscillator',
    description: 'ATR وایلدر — نوسان بازار',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 200, step: 1 }],
    defaults: { period: 14 },
    colors: { atr: C.atr },
    compute: (cs, p, c) => [line('atr', `ATR ${p.period}`, c.atr, cs, atr(cs, p.period))],
  },
  {
    key: 'adx',
    labelFa: 'شاخص جهت‌دار میانگین',
    kind: 'oscillator',
    description: 'ADX با +DI و −DI — قدرت روند',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 200, step: 1 }],
    defaults: { period: 14 },
    colors: { adx: C.adx, pdi: C.pdi, mdi: C.mdi },
    compute: (cs, p, c) => {
      const { adx: a, plusDI, minusDI } = adx(cs, p.period)
      return [
        line('adx', `ADX ${p.period}`, c.adx, cs, a),
        line('pdi', '+DI', c.pdi, cs, plusDI),
        line('mdi', '−DI', c.mdi, cs, minusDI),
      ]
    },
  },
  {
    key: 'obv',
    labelFa: 'حجم متوازن',
    kind: 'oscillator',
    description: 'OBV — جریان تجمعی حجم بر اساس جهت قیمت',
    params: [],
    defaults: {},
    colors: { obv: C.obv },
    compute: (cs, _p, c) => [line('obv', 'OBV', c.obv, cs, obv(cs))],
  },
  {
    key: 'volma',
    labelFa: 'میانگین متحرک حجم',
    kind: 'volume-overlay',
    description: 'SMA حجم روی پنل حجم',
    params: [{ key: 'period', label: 'دوره', min: 2, max: 200, step: 1 }],
    defaults: { period: 20 },
    colors: { volma: C.volma },
    compute: (cs, p, c) => [line('volma', `VolMA ${p.period}`, c.volma, cs, sma(cs.map((x) => x.volume ?? NaN), p.period))],
  },
  {
    key: 'ichimoku',
    labelFa: 'ابر ایچیموکو',
    kind: 'overlay',
    description: 'تنکان/کیجون/سنکو/چیکو — سنکوها ۲۶ دوره به جلو منتقل می‌شوند',
    params: [
      { key: 'tenkan', label: 'تنکان', min: 2, max: 60, step: 1 },
      { key: 'kijun', label: 'کیجون', min: 2, max: 120, step: 1 },
      { key: 'senkouB', label: 'سنکو B', min: 10, max: 240, step: 1 },
    ],
    defaults: { tenkan: 9, kijun: 26, senkouB: 52 },
    colors: { tenkan: C.tenkan, kijun: C.kijun, senkouA: C.senkouA, senkouB: C.senkouB, chikou: C.chikou },
    compute: (cs, p, c) => {
      const r = ichimoku(cs, p.tenkan, p.kijun, p.senkouB)
      // Senkou spans are displaced +kijun; the adapter shifts them onto
      // projected forward slots (see ProChart). Mark via id suffix.
      const shifted = (vals: number[]): Array<{ time: WorkspaceCandle['time']; value: number }> => {
        const data: Array<{ time: WorkspaceCandle['time']; value: number }> = []
        for (let i = 0; i < cs.length; i++) {
          const v = vals[i]
          if (v !== undefined && Number.isFinite(v)) data.push({ time: cs[i]!.time, value: v as number, _shift: p.kijun } as never)
        }
        return data
      }
      const plain = (id: string, label: string, color: string, vals: number[]): IndicatorLine =>
        line(id, label, color, cs, vals)
      return [
        plain('tenkan', 'Tenkan', c.tenkan, r.tenkan),
        plain('kijun', 'Kijun', c.kijun, r.kijun),
        { ...plain('senkouA', 'Senkou A', c.senkouA, r.senkouA), id: 'senkouA+shift', data: shifted(r.senkouA) },
        { ...plain('senkouB', 'Senkou B', c.senkouB, r.senkouB), id: 'senkouB+shift', data: shifted(r.senkouB) },
        plain('chikou', 'Chikou', c.chikou, r.chikou),
      ]
    },
  },
]

export function getIndicatorDef(key: string): IndicatorDef | undefined {
  return INDICATORS.find((d) => d.key === key)
}

export function computeInstance(inst: IndicatorInstance, candles: WorkspaceCandle[]): IndicatorLine[] {
  const def = getIndicatorDef(inst.key)
  if (!def) return []
  return def.compute(candles, inst.params, inst.colors)
}

let uidCounter = 0
export function makeInstance(key: string): IndicatorInstance | null {
  const def = getIndicatorDef(key)
  if (!def) return null
  uidCounter += 1
  return {
    uid: `${key}-${Date.now().toString(36)}-${uidCounter}`,
    key,
    params: { ...def.defaults },
    colors: { ...def.colors },
    visible: true,
  }
}
