<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="isMock" />
      <select v-model="symbol" @change="onSymbolChange" class="rounded-xl border border-line bg-surface px-3 py-2 text-sm dark:border-line dark:bg-surface" aria-label="انتخاب نماد">
        <option v-for="s in market.symbols" :key="s.l18" :value="s.l18">{{ s.l18 }} — {{ s.l30 }}</option>
      </select>
      <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-bold dark:border-line dark:bg-surface">
        <button v-for="r in ranges" :key="r.days" @click="rangeDays = r.days" class="rounded-lg px-3 py-1.5" :class="rangeDays === r.days ? 'bg-brand-solid text-white' : 'text-muted'">{{ r.label }}</button>
      </div>
      <span v-if="!isMock && history.length" class="tnum text-[11px] text-muted">{{ formatFaNumber(history.length) }} روز معاملاتی (از {{ formatJalaliDate(history[history.length-1]?.date) }})</span>
    </div>

    <div v-if="!isMock && summary.length" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="s in summary" :key="s.label" class="rounded-2xl border border-line bg-surface p-3 dark:border-line dark:bg-surface">
        <p class="text-[11px] text-muted">{{ s.label }}</p>
        <p class="tnum mt-1 text-base font-extrabold" :class="s.cls">{{ s.value }}</p>
      </div>
    </div>

    <div v-if="historyError" class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
      {{ historyError }} — نمودار نمایشی نمایش داده می‌شود.
    </div>

    <PriceChart v-model:mode="mode" :points="points" :title="`تاریخچه قیمت ${symbol}`" :subtitle="chartSubtitle" />

    <DataTable :title="`تاریخچه روزانه (${isMock ? 'نمایشی' : 'زنده'})`" :columns="cols" :rows="tableRows" :loading="historyLoading" :error="null" empty-title="تاریخچه‌ای موجود نیست">
      <template #cell-dateFa="{ row }"><span class="tnum">{{ row.dateFa }}</span></template>
      <template #cell-close="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.close as number) }}</span></template>
      <template #cell-changePercent="{ row }"><ChangeBadge :value="row.changePercent as number" /></template>
      <template #cell-volume="{ row }"><span class="tnum">{{ formatFaNumber(row.volume as number) }}</span></template>
    </DataTable>
    <div v-if="!isMock && history.length > tableLimit" class="text-center">
      <button @click="tableLimit += 60" class="rounded-xl border border-line bg-surface px-5 py-2 text-xs font-bold dark:border-line dark:bg-surface">
        نمایش بیشتر ({{ formatFaNumber(history.length - tableLimit) }} روز)
      </button>
    </div>

    <p class="text-[11px] leading-6 text-muted">
      داده زنده از <span class="font-mono" dir="ltr">Tsetmc/History.php?type=0</span> (کل تاریخچه در یک درخواست، کش ۳۰ دقیقه‌ای).
      ریزمعاملات روز جاری در صفحه جزئیات نماد است.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMarketStore } from '@/stores/market'
import { fetchPriceHistory, hasApiKey } from '@/services/api'
import { mockCandles } from '@/data/mock'
import { historyPeriodReturn, historyToCandles } from '@/utils/history'
import { changeClass, formatCompactFa, formatFaNumber, formatJalaliDate, gregorianToJalali } from '@/utils/format'
import type { DailyHistory } from '@/types/market'
import PriceChart from '@/components/PriceChart.vue'
import DataTable from '@/components/DataTable.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import MockBadge from '@/components/MockBadge.vue'

const market = useMarketStore()
const mode = ref<'candle' | 'line'>('candle')
const symbol = ref('فولاد')
const history = ref<DailyHistory[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)
const isMock = ref(true)
const tableLimit = ref(30)

const ranges = [
  { label: '۳ ماهه', days: 90 },
  { label: '۶ ماهه', days: 180 },
  { label: '۱ ساله', days: 365 },
  { label: 'کامل', days: 0 },
] as const
const rangeDays = ref<number>(365)

onMounted(async () => {
  await market.load()
  if (market.symbols.length) symbol.value = market.symbols[0]!.l18
  await loadHistory()
})

async function onSymbolChange() {
  tableLimit.value = 30
  await loadHistory()
}

async function loadHistory() {
  if (!hasApiKey()) {
    isMock.value = true
    history.value = []
    return
  }
  historyLoading.value = true
  historyError.value = null
  try {
    history.value = await fetchPriceHistory(symbol.value)
    isMock.value = false
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : 'خطای نامشخص'
    history.value = []
    isMock.value = true
  } finally {
    historyLoading.value = false
  }
}

const sliced = computed(() => (rangeDays.value === 0 ? history.value : history.value.slice(0, rangeDays.value)))
const points = computed(() => {
  if (!isMock.value && history.value.length) return historyToCandles(sliced.value, rangeDays.value === 0 ? 1825 : rangeDays.value)
  const base = market.symbols.find((s) => s.l18 === symbol.value)?.pc ?? 5310
  return mockCandles(base, 120, symbol.value.length * 13 + 5)
})

const chartSubtitle = computed(() => {
  if (!isMock.value && sliced.value.length) {
    const newest = sliced.value[0]!
    const oldest = sliced.value[sliced.value.length - 1]!
    return `کندل‌های روزانه زنده — ${formatJalaliDate(oldest.date)} تا ${formatJalaliDate(newest.date)}`
  }
  return 'کندل‌های روزانه — داده نمایشی'
})

const summary = computed(() => {
  if (isMock.value || !sliced.value.length) return []
  const ret = historyPeriodReturn(sliced.value)
  const closes = sliced.value.map((r) => r.pc ?? 0).filter(Boolean)
  const vols = sliced.value.map((r) => r.tvol ?? 0)
  return [
    { label: `بازده ${ranges.find((r) => r.days === rangeDays.value)?.label}`, value: ret == null ? '—' : `${ret > 0 ? '+' : ''}${formatFaNumber(ret, { digits: 2 })}٪`, cls: changeClass(ret) },
    { label: 'سقف پایانی دوره', value: formatFaNumber(Math.max(...closes)), cls: '' },
    { label: 'کف پایانی دوره', value: formatFaNumber(Math.min(...closes)), cls: '' },
    { label: 'میانگین حجم روزانه', value: formatCompactFa(vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1)), cls: '' },
  ]
})

const cols = [
  { key: 'dateFa', label: 'تاریخ' },
  { key: 'open', label: 'اولین', numeric: true },
  { key: 'high', label: 'بیشترین', numeric: true },
  { key: 'low', label: 'کمترین', numeric: true },
  { key: 'close', label: 'پایانی', numeric: true },
  { key: 'changePercent', label: 'تغییر٪', numeric: true },
  { key: 'volume', label: 'حجم', numeric: true },
]

const tableRows = computed(() => {
  if (!isMock.value) {
    return history.value.slice(0, tableLimit.value).map((r) => ({
      dateFa: formatJalaliDate(r.date),
      open: formatFaNumber(r.pf),
      high: formatFaNumber(r.pmax),
      low: formatFaNumber(r.pmin),
      close: r.pc ?? 0,
      changePercent: r.pcp ?? 0,
      volume: r.tvol ?? 0,
    })) as unknown as Array<Record<string, unknown>>
  }
  const pts = points.value.slice(-10).reverse()
  return pts.map((p, i) => {
    const prev = pts[i + 1]?.close ?? p.open
    const ch = prev ? ((p.close - prev) / prev) * 100 : 0
    return {
      dateFa: gregorianToJalali(String(p.time)),
      open: formatFaNumber(p.open),
      high: formatFaNumber(p.high),
      low: formatFaNumber(p.low),
      close: p.close,
      changePercent: Math.round(ch * 100) / 100,
      volume: p.volume ?? 0,
    }
  }) as unknown as Array<Record<string, unknown>>
})
</script>
