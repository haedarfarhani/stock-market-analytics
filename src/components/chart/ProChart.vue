<template>
  <div ref="el" class="h-full w-full" dir="ltr" role="img" aria-label="نمودار تحلیل تکنیکال"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type BarData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type TickMarkType,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { ChartKind, IndicatorLine, WorkspaceCandle } from '@/chart/types.ts'
import { formatTimeAxisTick } from '@/utils/format.ts'

export interface LegendBar {
  time: WorkspaceCandle['time']
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

const props = defineProps<{
  candles: WorkspaceCandle[]
  kind: ChartKind
  volumeVisible: boolean
  gridVisible: boolean
  magnet: boolean
  overlays: IndicatorLine[]
  oscillators: IndicatorLine[][]
  volumeOverlay: IndicatorLine[]
}>()

const emit = defineEmits<{
  (e: 'hover', bar: LegendBar | null): void
  (e: 'ready'): void
  (e: 'view-change'): void
}>()

const el = ref<HTMLDivElement | null>(null)
let chart: IChartApi | null = null
let main: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area' | 'Baseline'> | null = null
let vol: ISeriesApi<'Histogram'> | null = null
let extra: ISeriesApi<'Line' | 'Histogram' | 'Area'>[] = []
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null
let savedRange: { from: number; to: number } | null = null

function cssVar(name: string, fallback: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  } catch {
    return fallback
  }
}
function theme() {
  const dark = document.documentElement.classList.contains('dark')
  return {
    dark,
    muted: cssVar('--muted', dark ? '#D0A9BC' : '#87566F'),
    line: cssVar('--line', dark ? '#48263B' : '#F3D4E3'),
    brand: cssVar('--brand', dark ? '#F472B6' : '#DB2777'),
    up: cssVar('--up', dark ? '#34d399' : '#15803d'),
    down: cssVar('--down', dark ? '#fb7185' : '#dc2626'),
  }
}
function rgba(hex: string, a: number): string {
  const m = hex.replace('#', '')
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = Number.parseInt(f.slice(0, 6), 16)
  if (!Number.isFinite(n)) return hex
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/** Stacked pane layout: price / volume / N oscillator panes.
 * Only touches scales that actually have series (v4 throws on unknown IDs),
 * which matters on the first build when candles are still loading. */
function layoutPanes(oscCount: number, volumeOn: boolean): void {
  if (!chart) return
  const VOL_H = 0.12
  const OSC_H = 0.17
  const volH = volumeOn && vol !== null ? VOL_H : 0
  const reserved = volH + oscCount * OSC_H
  chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.06, bottom: Math.min(0.85, reserved + 0.03) } })
  if (volH > 0) {
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 1 - reserved, bottom: Math.max(0, reserved - VOL_H) } })
  }
  for (let i = 0; i < oscCount; i++) {
    const top = 1 - reserved + volH + i * OSC_H + 0.015
    chart.priceScale(`osc-${i}`).applyOptions({ scaleMargins: { top, bottom: Math.max(0, 1 - (top + OSC_H - 0.03)) } })
  }
}

function ohlcData(): BarData[] {
  return props.candles.map((c) => ({ time: c.time as never, open: c.open, high: c.high, low: c.low, close: c.close }) as BarData)
}

function buildMain(): void {
  const chartApi = chart
  if (!chartApi) return
  const t = theme()
  const ohlc = ohlcData()
  if (props.kind === 'candles' || props.kind === 'hollow') {
    const s = chartApi.addCandlestickSeries({
      upColor: t.up,
      downColor: t.down,
      wickUpColor: t.up,
      wickDownColor: t.down,
      borderVisible: false,
      priceLineVisible: true,
      lastValueVisible: true,
    })
    s.setData(ohlc)
    main = s
  } else if (props.kind === 'bars') {
    const s = chartApi.addBarSeries({ upColor: t.up, downColor: t.down, priceLineVisible: true, lastValueVisible: true })
    s.setData(ohlc)
    main = s
  } else if (props.kind === 'line') {
    const s = chartApi.addLineSeries({ color: t.brand, lineWidth: 2, priceLineVisible: true, lastValueVisible: true })
    s.setData(props.candles.map((c) => ({ time: c.time as never, value: c.close }) as LineData))
    main = s
  } else if (props.kind === 'area') {
    const s = chartApi.addAreaSeries({
      lineColor: t.brand,
      topColor: rgba(t.brand, 0.35),
      bottomColor: rgba(t.brand, 0.02),
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    })
    s.setData(props.candles.map((c) => ({ time: c.time as never, value: c.close }) as LineData))
    main = s
  } else {
    const first = props.candles[0]?.close ?? 0
    const s = chartApi.addBaselineSeries({
      baseValue: { type: 'price', price: first },
      topLineColor: t.up,
      topFillColor1: rgba(t.up, 0.25),
      topFillColor2: rgba(t.up, 0.02),
      bottomLineColor: t.down,
      bottomFillColor1: rgba(t.down, 0.02),
      bottomFillColor2: rgba(t.down, 0.25),
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    })
    s.setData(props.candles.map((c) => ({ time: c.time as never, value: c.close }) as LineData))
    main = s
  }
}

function lineStyleOf(id: string): { lineStyle: LineStyle; lineWidth: 1 | 2 } {
  // dashed bands (bollinger upper/lower, senkou) read better dashed
  if (/(upper|lower|senkou)/i.test(id)) return { lineStyle: LineStyle.Dashed, lineWidth: 1 }
  return { lineStyle: LineStyle.Solid, lineWidth: 2 }
}

function buildAll(restoreView = true): void {
  const chartApi = chart
  if (!chartApi) return
  if (restoreView) {
    try {
      const r = chartApi.timeScale().getVisibleLogicalRange()
      if (r) savedRange = { from: r.from, to: r.to }
    } catch {
      /* ignore */
    }
  }
  // clear
  for (const s of extra) {
    try {
      chartApi.removeSeries(s)
    } catch {
      /* ignore */
    }
  }
  extra = []
  if (vol) {
    try {
      chartApi.removeSeries(vol)
    } catch {
      /* ignore */
    }
    vol = null
  }
  if (main) {
    try {
      chartApi.removeSeries(main)
    } catch {
      /* ignore */
    }
    main = null
  }
  const t = theme()
  buildMain()
  // volume
  if (props.volumeVisible && props.candles.length) {
    const v = chartApi.addHistogramSeries({
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    v.setData(
      props.candles.map((c) => ({
        time: c.time as never,
        value: c.volume ?? 0,
        color: c.close >= c.open ? rgba(t.up, 0.65) : rgba(t.down, 0.65),
      }) as HistogramData),
    )
    vol = v
  }
  // overlays on main scale
  for (const o of props.overlays) {
    if (o.seriesType === 'histogram') continue
    const s = chartApi.addLineSeries({
      color: o.color,
      lineWidth: lineStyleOf(o.id).lineWidth,
      lineStyle: lineStyleOf(o.id).lineStyle,
      priceLineVisible: o.priceLineVisible ?? false,
      lastValueVisible: o.lastValueVisible ?? true,
      crosshairMarkerVisible: false,
    })
    s.setData(o.data.map((d) => ({ time: d.time as never, value: d.value }) as LineData))
    extra.push(s)
  }
  // volume overlays (VolMA) on vol scale
  for (const o of props.volumeOverlay) {
    const s = chartApi.addLineSeries({
      color: o.color,
      lineWidth: 1,
      priceScaleId: 'vol',
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    })
    s.setData(o.data.map((d) => ({ time: d.time as never, value: d.value }) as LineData))
    extra.push(s)
  }
  // oscillator panes
  let oscBuilt = 0
  props.oscillators.forEach((group) => {
    let made = false
    for (const o of group) {
      if (o.seriesType === 'histogram') {
        const s = chartApi.addHistogramSeries({
          priceScaleId: `osc-${oscBuilt}`,
          color: o.color,
          lastValueVisible: false,
          priceLineVisible: false,
        })
        s.setData(o.data.map((d) => ({ time: d.time as never, value: d.value }) as HistogramData))
        extra.push(s)
        made = true
      } else {
        const s = chartApi.addLineSeries({
          color: o.color,
          lineWidth: 2,
          priceScaleId: `osc-${oscBuilt}`,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: false,
        })
        s.setData(o.data.map((d) => ({ time: d.time as never, value: d.value }) as LineData))
        extra.push(s)
        made = true
      }
    }
    if (made) oscBuilt++
  })
  layoutPanes(oscBuilt, props.volumeVisible)
  if (restoreView && savedRange) {
    try {
      chartApi.timeScale().setVisibleLogicalRange(savedRange)
    } catch {
      chartApi.timeScale().fitContent()
    }
  } else {
    chartApi.timeScale().fitContent()
  }
}

function build(): void {
  if (!el.value) return
  dispose()
  const t = theme()
  chart = createChart(el.value, {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: t.muted,
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      fontSize: 11,
    },
    grid: {
      vertLines: { visible: props.gridVisible, color: rgba(t.line, 0.55) },
      horzLines: { visible: props.gridVisible, color: rgba(t.line, 0.55) },
    },
    crosshair: {
      mode: props.magnet ? CrosshairMode.Magnet : CrosshairMode.Normal,
      vertLine: { color: rgba(t.brand, 0.6), labelBackgroundColor: t.brand },
      horzLine: { color: rgba(t.brand, 0.6), labelBackgroundColor: t.brand },
    },
    rightPriceScale: { borderColor: rgba(t.line, 0.9) },
    timeScale: {
      borderColor: rgba(t.line, 0.9),
      timeVisible: true,
      secondsVisible: false,
      // Jalali (Shamsi) axis labels with Persian digits instead of Gregorian.
      tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) => formatTimeAxisTick(time, tickMarkType),
    },
    localization: { locale: 'fa-IR' },
    autoSize: false,
    width: el.value.clientWidth,
    height: el.value.clientHeight,
  })
  chart.subscribeCrosshairMove(onHover)
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => emit('view-change'))
  buildAll(false)
  ro = new ResizeObserver(() => {
    if (chart && el.value) chart.applyOptions({ width: el.value.clientWidth, height: el.value.clientHeight })
  })
  ro.observe(el.value)
  emit('ready')
}

function onHover(param: MouseEventParams): void {
  if (!param.time || !props.candles.length) {
    emit('hover', null)
    return
  }
  const t = param.time as unknown as WorkspaceCandle['time']
  const c = props.candles.find((x) => x.time === t)
  if (!c) {
    emit('hover', null)
    return
  }
  emit('hover', { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })
}

function dispose(): void {
  ro?.disconnect()
  ro = null
  if (chart) {
    try {
      chart.remove()
    } catch {
      /* ignore */
    }
    chart = null
    main = null
    vol = null
    extra = []
  }
}

onMounted(() => {
  build()
  mo = new MutationObserver(() => build())
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => {
  mo?.disconnect()
  dispose()
})

watch(
  () => [props.candles, props.kind, props.volumeVisible, props.overlays, props.oscillators, props.volumeOverlay] as const,
  () => buildAll(true),
)
watch(
  () => [props.gridVisible, props.magnet] as const,
  () => build(),
)

defineExpose({
  getChart: (): IChartApi | null => chart,
  getMainSeries: () => main,
  fitContent: (): void => chart?.timeScale().fitContent(),
  screenshot: (): string | null => {
    try {
      return chart?.takeScreenshot().toDataURL('image/png') ?? null
    } catch {
      return null
    }
  },
  timeToX: (time: WorkspaceCandle['time']): number | null => {
    if (!chart) return null
    try {
      // 1. Try native timeToCoordinate
      let coord = chart.timeScale().timeToCoordinate(time as Time)
      if (typeof coord === 'number' && Number.isFinite(coord)) return coord

      // 2. If time is a string "YYYY-MM-DD", try as BusinessDay object
      if (typeof time === 'string') {
        const parts = time.split('-').map(Number)
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          coord = chart.timeScale().timeToCoordinate({ year: parts[0], month: parts[1], day: parts[2] })
          if (typeof coord === 'number' && Number.isFinite(coord)) return coord
        }
      }

      // 3. Fallback to index in candles -> logicalToCoordinate
      const idx = props.candles.findIndex((c) => String(c.time) === String(time))
      if (idx >= 0) {
        const lCoord = chart.timeScale().logicalToCoordinate(idx as never)
        if (typeof lCoord === 'number' && Number.isFinite(lCoord)) return lCoord
      }

      // 3b. Proximity fallback: find nearest candle by date if exact match fails
      if (props.candles.length > 0) {
        const strTime = String(time)
        const targetMs = Date.parse(strTime.includes('T') ? strTime : `${strTime}T00:00:00Z`)
        if (Number.isFinite(targetMs)) {
          let closestIdx = -1
          let minDiff = Infinity
          for (let i = 0; i < props.candles.length; i++) {
            const cStr = String(props.candles[i]!.time)
            const cMs = Date.parse(cStr.includes('T') ? cStr : `${cStr}T00:00:00Z`)
            if (Number.isFinite(cMs)) {
              const diff = Math.abs(cMs - targetMs)
              if (diff < minDiff) {
                minDiff = diff
                closestIdx = i
              }
            }
          }
          if (closestIdx >= 0 && minDiff <= 7 * 86400000) {
            const lCoord = chart.timeScale().logicalToCoordinate(closestIdx as never)
            if (typeof lCoord === 'number' && Number.isFinite(lCoord)) return lCoord
          }
        }
      }

      // 4. Fallback for future/past projection relative to candles
      if (props.candles.length > 0) {
        const last = props.candles[props.candles.length - 1]!
        const first = props.candles[0]!
        if (typeof time === 'number' && typeof last.time === 'number') {
          const diffBars = Math.round((time - last.time) / 120)
          const lCoord = chart.timeScale().logicalToCoordinate((props.candles.length - 1 + diffBars) as never)
          if (typeof lCoord === 'number' && Number.isFinite(lCoord)) return lCoord
        } else {
          const tDate = Date.parse(`${String(time)}T00:00:00Z`)
          const lDate = Date.parse(`${String(last.time)}T00:00:00Z`)
          const fDate = Date.parse(`${String(first.time)}T00:00:00Z`)
          if (Number.isFinite(tDate)) {
            if (Number.isFinite(lDate) && tDate >= lDate) {
              const diffDays = Math.round((tDate - lDate) / 86400000)
              const lCoord = chart.timeScale().logicalToCoordinate((props.candles.length - 1 + diffDays) as never)
              if (typeof lCoord === 'number' && Number.isFinite(lCoord)) return lCoord
            } else if (Number.isFinite(fDate) && tDate <= fDate) {
              const diffDays = Math.round((tDate - fDate) / 86400000)
              const lCoord = chart.timeScale().logicalToCoordinate((0 + diffDays) as never)
              if (typeof lCoord === 'number' && Number.isFinite(lCoord)) return lCoord
            }
          }
        }
      }

      return null
    } catch {
      return null
    }
  },
  xToTime: (x: number): WorkspaceCandle['time'] | null => {
    if (!chart) return null
    try {
      // 1. Try native coordinateToTime
      const raw = chart.timeScale().coordinateToTime(x)
      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'number' || typeof raw === 'string') return raw
        if (typeof raw === 'object' && 'year' in raw && 'month' in raw && 'day' in raw) {
          const b = raw as { year: number; month: number; day: number }
          return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`
        }
      }

      // 2. Fallback to coordinateToLogical
      const logical = chart.timeScale().coordinateToLogical(x)
      if (logical !== null && Number.isFinite(logical) && props.candles.length > 0) {
        const intIdx = Math.round(logical)
        if (intIdx >= 0 && intIdx < props.candles.length) {
          return props.candles[intIdx]!.time
        }
        // Future projection (clicking beyond the latest candle to the right)
        if (intIdx >= props.candles.length) {
          const last = props.candles[props.candles.length - 1]!
          const diff = intIdx - (props.candles.length - 1)
          if (typeof last.time === 'number') {
            return last.time + diff * 120
          }
          const d = new Date(`${String(last.time)}T00:00:00Z`)
          d.setUTCDate(d.getUTCDate() + diff)
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        }
        // Past projection (clicking before the first candle to the left)
        if (intIdx < 0) {
          const first = props.candles[0]!
          if (typeof first.time === 'number') {
            return first.time + intIdx * 120
          }
          const d = new Date(`${String(first.time)}T00:00:00Z`)
          d.setUTCDate(d.getUTCDate() + intIdx)
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        }
      }

      return null
    } catch {
      return null
    }
  },
  priceToY: (price: number): number | null => {
    if (!main) return null
    try {
      return main.priceToCoordinate(price)
    } catch {
      return null
    }
  },
  yToPrice: (y: number): number | null => {
    if (!main) return null
    try {
      let v = main.coordinateToPrice(y)
      if (typeof v === 'number' && Number.isFinite(v)) return v
      const h = el.value?.clientHeight ?? 400
      const clampedY = Math.max(10, Math.min(h - 30, y))
      v = main.coordinateToPrice(clampedY)
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    } catch {
      return null
    }
  },
  plotSize: (): { w: number; h: number } => ({ w: el.value?.clientWidth ?? 0, h: el.value?.clientHeight ?? 0 }),
  setMagnet: (on: boolean): void => {
    chart?.applyOptions({ crosshair: { mode: on ? CrosshairMode.Magnet : CrosshairMode.Normal } })
  },
  setGrid: (on: boolean): void => {
    const t = theme()
    chart?.applyOptions({
      grid: {
        vertLines: { visible: on, color: rgba(t.line, 0.55) },
        horzLines: { visible: on, color: rgba(t.line, 0.55) },
      },
    })
  },
  toBusinessTime: (ts: UTCTimestamp): string => {
    const d = new Date(ts * 1000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  },
})
</script>
