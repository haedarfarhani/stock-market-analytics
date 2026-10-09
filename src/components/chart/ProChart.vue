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
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { ChartKind, IndicatorLine, WorkspaceCandle } from '@/chart/types.ts'

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
    timeScale: { borderColor: rgba(t.line, 0.9), timeVisible: true, secondsVisible: false },
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
      return chart.timeScale().timeToCoordinate(time as Time)
    } catch {
      return null
    }
  },
  xToTime: (x: number): WorkspaceCandle['time'] | null => {
    if (!chart) return null
    try {
      return (chart.timeScale().coordinateToTime(x) as unknown as WorkspaceCandle['time']) ?? null
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
      const v = main.coordinateToPrice(y)
      return typeof v === 'number' ? v : null
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
