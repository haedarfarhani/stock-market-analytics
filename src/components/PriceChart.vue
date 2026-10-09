<template>
  <div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
      <div>
        <h3 class="text-sm font-bold">{{ title }}</h3>
        <p v-if="subtitle" class="mt-0.5 text-[11px] text-muted">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-1 rounded-lg bg-secondary p-1 text-[11px] font-semibold">
        <button
          v-for="m in modes"
          :key="m"
          @click="$emit('update:mode', m)"
          class="rounded-md px-2.5 py-1 transition"
          :class="mode === m ? 'bg-surface shadow text-ink dark:bg-brand-solid dark:text-white' : 'text-muted'"
        >
          {{ m === 'candle' ? 'کندل' : 'خطی' }}
        </button>
      </div>
    </div>
    <div ref="el" class="h-[320px] w-full sm:h-[380px]" dir="ltr" role="img" aria-label="نمودار قیمت" />
    <p v-if="!points.length" class="px-4 pb-4 text-xs text-muted">داده‌ای برای نمایش نمودار وجود ندارد.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { CandlePoint } from '@/types/market'

const props = defineProps<{
  points: CandlePoint[]
  mode: 'candle' | 'line'
  title: string
  subtitle?: string
}>()
defineEmits<{ (e: 'update:mode', m: 'candle' | 'line'): void }>()

const modes = ['candle', 'line'] as const
const el = ref<HTMLDivElement | null>(null)
let chart: IChartApi | null = null
let series: ISeriesApi<'Candlestick' | 'Area'> | null = null
let ro: ResizeObserver | null = null

function isDark() {
  return document.documentElement.classList.contains('dark')
}

/** Read centralized theme tokens so charts follow the active theme. */
function themeColor(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fallback
  } catch {
    return fallback
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = Number.parseInt(full.slice(0, 6), 16)
  if (!Number.isFinite(n)) return hex
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function build() {
  if (!el.value) return
  dispose()
  const dark = isDark()
  const muted = themeColor('--muted', dark ? '#D0A9BC' : '#87566F')
  const line = themeColor('--line', dark ? '#48263B' : '#F3D4E3')
  chart = createChart(el.value, {
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: muted,
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: hexToRgba(line, 0.55) },
      horzLines: { color: hexToRgba(line, 0.55) },
    },
    rightPriceScale: { borderColor: hexToRgba(line, 0.9) },
    timeScale: { borderColor: hexToRgba(line, 0.9), timeVisible: true },
    autoSize: false,
    width: el.value.clientWidth,
    height: el.value.clientHeight,
  })
  applySeries()
  ro = new ResizeObserver(() => {
    if (chart && el.value) chart.applyOptions({ width: el.value.clientWidth })
  })
  ro.observe(el.value)
}

function applySeries() {
  if (!chart) return
  if (series) {
    try {
      chart.removeSeries(series)
    } catch {
      /* ignore */
    }
    series = null
  }
  if (!props.points.length) return
  if (props.mode === 'candle') {
    const dark = isDark()
    const up = themeColor('--up', dark ? '#34d399' : '#16a34a')
    const down = themeColor('--down', dark ? '#fb7185' : '#dc2626')
    const s = chart.addCandlestickSeries({
      upColor: up,
      downColor: down,
      wickUpColor: up,
      wickDownColor: down,
      borderVisible: false,
    })
    s.setData(
      props.points.map((p) => ({
        time: p.time as never,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      })),
    )
    series = s
  } else {
    const dark = isDark()
    const brand = themeColor('--brand', dark ? '#F472B6' : '#DB2777')
    const s = chart.addAreaSeries({
      lineColor: brand,
      topColor: hexToRgba(brand, 0.35),
      bottomColor: hexToRgba(brand, 0.02),
      lineWidth: 2,
    })
    s.setData(props.points.map((p) => ({ time: p.time as never, value: p.close })))
    series = s
  }
  chart.timeScale().fitContent()
}

function dispose() {
  ro?.disconnect()
  ro = null
  if (chart) {
    try {
      chart.remove()
    } catch {
      /* ignore */
    }
    chart = null
    series = null
  }
}

let mo: MutationObserver | null = null

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
  () => [props.points, props.mode] as const,
  () => {
    if (!chart) build()
    else applySeries()
  },
)
</script>
