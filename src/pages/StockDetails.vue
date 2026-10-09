<template>
  <div class="space-y-4">
    <RouterLink to="/stocks" class="text-xs font-bold text-brand">→ بازگشت به فهرست سهام</RouterLink>

    <div v-if="loading" class="space-y-2" role="status" aria-label="در حال بارگذاری">
      <div class="skeleton h-10 w-2/3 rounded-xl" />
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="skeleton h-20 rounded-2xl" />
      </div>
    </div>

    <div v-else-if="!symbol" class="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center text-sm dark:border-rose-800 dark:bg-rose-500/10">
      نماد «{{ symbolParam }}» یافت نشد. از فهرست سهام یک نماد معتبر انتخاب کنید.
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-xl font-black">{{ symbol.l18 }} <span class="text-sm font-medium text-muted">{{ symbol.l30 }}</span></h2>
        <ChangeBadge :value="symbol.pcp" />
        <span
          v-if="detail?.state"
          class="rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand"
          title="وضعیت نماد از Symbol.php"
        >
          وضعیت: {{ detail.state }}
        </span>
        <MockBadge :is-mock="isMock" />
        <button @click="watch.toggle(symbol.l18)" class="ms-auto rounded-xl border border-line px-3 py-1.5 text-xs font-bold dark:border-line">
          {{ watch.has(symbol.l18) ? '★ در دیده‌بان' : '☆ افزودن به دیده‌بان' }}
        </button>
      </div>
      <p v-if="detail" class="tnum text-[11px] text-muted dark:text-muted">
        {{ detail.m ?? '' }}<span v-if="detail.m_board"> — {{ detail.m_board }}</span>
        <span v-if="detail.l30_en" dir="ltr"> • {{ detail.l30_en }}</span>
        <span v-if="detail.date_update"> • آخرین معامله: {{ formatJalaliDate(detail.date_update) }}</span>
      </p>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="s in stats" :key="s.label" class="rounded-2xl border border-line bg-surface p-3 dark:border-line dark:bg-surface">
          <p class="text-[11px] text-muted">{{ s.label }}</p>
          <p class="tnum mt-1 text-base font-extrabold" :class="s.cls">{{ s.value }}</p>
        </div>
      </div>

      <div>
        <div v-if="!isMock" class="mb-2 flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-bold dark:border-line dark:bg-surface">
          <button
            v-for="k in candleKinds"
            :key="k.key"
            @click="setCandleKind(k.key)"
            class="flex-1 rounded-lg px-3 py-1.5"
            :class="candleKind === k.key ? 'bg-brand-solid text-white' : 'text-muted'"
          >
            {{ k.label }}
          </button>
        </div>
        <PriceChart v-model:mode="chartMode" :points="candles" title="نمودار قیمت" :subtitle="chartSubtitle" />
        <p v-if="candlesLoading" class="mt-1 text-[11px] text-muted">در حال دریافت کندل‌ها…</p>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
          <h3 class="border-b border-line px-4 py-3 text-sm font-bold dark:border-line">آمار معاملات و حقیقی/حقوقی</h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-[13px]">
            <div v-for="r in tradeRows" :key="r[0]" class="flex items-center justify-between gap-2 border-b border-dashed border-line pb-1.5 dark:border-line">
              <dt class="text-muted">{{ r[0] }}</dt>
              <dd class="tnum font-bold">{{ r[1] }}</dd>
            </div>
          </dl>
        </div>
        <div class="space-y-4">
          <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
            <h3 class="border-b border-line px-4 py-3 text-sm font-bold dark:border-line">شناسنامه نماد</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-[13px]">
              <div v-for="r in identityRows" :key="r[0]" class="flex items-center justify-between gap-2 border-b border-dashed border-line pb-1.5 dark:border-line">
                <dt class="text-muted">{{ r[0] }}</dt>
                <dd class="tnum text-left font-bold">{{ r[1] }}</dd>
              </div>
            </dl>
          </div>
          <DataTable :title="shIsLive ? 'سهامداران عمده (زنده)' : 'سهامداران عمده (نمایشی)'" :columns="shCols" :rows="shareholders" :loading="false" :error="null" empty-title="داده سهامداران موجود نیست">
            <template #cell-change="{ row }">
              <span v-if="(row.change as number) > 0" class="tnum rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">+{{ formatFaNumber(row.change as number) }}</span>
              <span v-else-if="(row.change as number) < 0" class="tnum rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ formatFaNumber(row.change as number) }}</span>
              <span v-else class="text-[11px] text-muted">بدون تغییر</span>
            </template>
          </DataTable>
        </div>
      </div>

      <div v-if="detail?.assembly?.length" class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <h3 class="border-b border-line px-4 py-3 text-sm font-bold dark:border-line">
          مجامع نماد <span class="tnum text-[11px] font-medium text-muted">({{ formatFaNumber(detail.assembly.length) }} مورد)</span>
        </h3>
        <ul class="divide-y divide-line dark:divide-line">
          <li v-for="(m, i) in detail.assembly.slice(0, 8)" :key="i" class="px-4 py-3">
            <p class="text-[13px] font-bold leading-6">{{ m.title }}</p>
            <p class="tnum mt-1 text-[11px] text-muted">
              <span v-if="m.date_send">ارسال: {{ formatJalaliDate(m.date_send) }} {{ m.time_send ? toFaDigits(m.time_send) : '' }}</span>
              <span v-if="m.date_publish"> • انتشار: {{ formatJalaliDate(m.date_publish) }}</span>
            </p>
            <p v-if="m.content" class="mt-1 line-clamp-2 text-xs leading-6 text-muted dark:text-muted">{{ m.content }}</p>
          </li>
        </ul>
      </div>
      <div v-if="ticks.length || ticksLoading || ticksError" class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <div class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 dark:border-line">
          <h3 class="text-sm font-bold">
            ریزمعاملات آخرین روز
            <span v-if="ticks.length" class="tnum text-[11px] font-medium text-muted">({{ formatFaNumber(ticks.length) }} معامله)</span>
          </h3>
          <span v-if="ticksSummary" class="tnum text-[11px] text-muted">میانگین موزون: {{ formatFaNumber(ticksSummary.vwap) }}</span>
        </div>
        <div v-if="ticksLoading" class="space-y-2 p-4" role="status" aria-label="در حال بارگذاری ریزمعاملات">
          <div v-for="i in 5" :key="i" class="skeleton h-9 rounded-lg" />
        </div>
        <p v-else-if="ticksError" class="px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400" role="alert">{{ ticksError }}</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-right text-[13px]">
            <thead>
              <tr class="border-b border-line text-xs text-muted dark:border-line dark:text-muted">
                <th class="px-4 py-3 font-semibold">زمان</th>
                <th class="px-4 py-3 font-semibold text-left tnum">قیمت</th>
                <th class="px-4 py-3 font-semibold text-left tnum">حجم</th>
                <th class="px-4 py-3 font-semibold text-left tnum">ارزش</th>
                <th class="px-4 py-3 font-semibold">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in ticksPaged" :key="t.row" class="border-b border-line/60 last:border-0 dark:border-line/60">
                <td class="tnum whitespace-nowrap px-4 py-2">{{ toFaDigits(t.time) }}</td>
                <td class="tnum whitespace-nowrap px-4 py-2 text-left font-bold">{{ formatFaNumber(t.price) }}</td>
                <td class="tnum whitespace-nowrap px-4 py-2 text-left">{{ formatFaNumber(t.volume) }}</td>
                <td class="tnum whitespace-nowrap px-4 py-2 text-left">{{ formatCompactFa(t.price * t.volume) }}</td>
                <td class="whitespace-nowrap px-4 py-2">
                  <span v-if="t.canceled" class="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">ابطال‌شده</span>
                  <span v-else class="text-[11px] text-muted">انجام‌شده</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="ticksSorted.length > ticksLimit" class="p-3 text-center">
            <button @click="ticksLimit += 200" class="rounded-xl border border-line px-5 py-2 text-xs font-bold dark:border-line">
              نمایش بیشتر ({{ formatFaNumber(ticksSorted.length - ticksLimit) }} مورد)
            </button>
          </div>
        </div>
      </div>
      <div v-else-if="!isMock" class="rounded-2xl border border-dashed border-line p-4 text-center dark:border-line">
        <button @click="loadTicks" class="rounded-xl bg-brand-solid px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-brand/25 hover:bg-brand-strong">
          نمایش ریزمعاملات آخرین روز (داده سنگین — یک درخواست)
        </button>
        <p class="mt-2 text-[11px] text-muted">هر نماد-روز حدود یک مگابایت داده دارد و ۵ دقیقه کش می‌شود.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch as vueWatch } from 'vue'
import { useRoute } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { useWatchlistStore } from '@/stores/watchlist'
import { fetchDailyCandles, fetchIntradayCandles, fetchPriceHistory, fetchShareholders, fetchSymbolDetail, fetchTransactions, hasApiKey } from '@/services/api'
import { mockCandles, mockShareholders } from '@/data/mock'
import { dailyCandlesToPoints, historyToCandles, intradayToPoints } from '@/utils/history'
import {
  changeClass,
  formatCompactFa,
  formatFaNumber,
  formatFaPercent,
  formatJalaliDate,
  toFaDigits,
} from '@/utils/format'
import type { CandleKind, DailyCandle, DailyHistory, ShareholderRow, TickTrade, TsetmcSymbolDetail } from '@/types/market'
import PriceChart from '@/components/PriceChart.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import DataTable from '@/components/DataTable.vue'
import MockBadge from '@/components/MockBadge.vue'

const route = useRoute()
const market = useMarketStore()
const watch = useWatchlistStore()
const chartMode = ref<'candle' | 'line'>('candle')
const detail = ref<TsetmcSymbolDetail | null>(null)
const loading = ref(false)
const isMock = ref(true)
const ticks = ref<TickTrade[]>([])
const ticksLoading = ref(false)
const ticksError = ref<string | null>(null)
const ticksLimit = ref(100)
const priceHistory = ref<DailyHistory[]>([])
const historyIsLive = ref(false)
const candleKind = ref<CandleKind>('adjusted')
const candlesAdj = ref<DailyCandle[]>([])
const candlesRaw = ref<DailyCandle[]>([])
const candlesToday = ref<DailyCandle[]>([])
const candlesLoading = ref(false)
const shList = ref<ShareholderRow[]>([])
const shIsLive = ref(false)

const symbolParam = computed(() => decodeURIComponent(String(route.params.symbol ?? '')))
/** Live detail wins; fallback to the AllSymbols row from the store. */
const symbol = computed(() => detail.value ?? market.symbols.find((s) => s.l18 === symbolParam.value) ?? null)

async function loadDetail() {
  const l18 = symbolParam.value
  if (!l18) return
  if (!hasApiKey()) {
    detail.value = null
    isMock.value = true
    return
  }
  loading.value = true
  try {
    detail.value = await fetchSymbolDetail({ l18 })
    isMock.value = false
  } catch {
    detail.value = null
    isMock.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await market.load()
  await Promise.all([loadDetail(), loadHistory(), ensureCandles('adjusted'), loadShareholders()])
})
vueWatch(symbolParam, async () => {
  ticks.value = []
  ticksError.value = null
  ticksLimit.value = 100
  priceHistory.value = []
  historyIsLive.value = false
  candlesAdj.value = []
  candlesRaw.value = []
  candlesToday.value = []
  shList.value = []
  shIsLive.value = false
  await Promise.all([loadDetail(), loadHistory(), ensureCandles(candleKind.value), loadShareholders()])
})

async function loadShareholders() {
  const l18 = symbolParam.value
  if (!l18 || !hasApiKey()) return
  try {
    const rows = await fetchShareholders(l18)
    if (rows.length) {
      shList.value = rows
      shIsLive.value = true
    }
  } catch {
    shList.value = []
    shIsLive.value = false
  }
}

async function loadHistory() {
  const l18 = symbolParam.value
  if (!l18 || !hasApiKey()) return
  try {
    priceHistory.value = await fetchPriceHistory(l18)
    historyIsLive.value = priceHistory.value.length > 0
  } catch {
    priceHistory.value = []
    historyIsLive.value = false
  }
}

async function ensureCandles(kind: CandleKind) {
  const l18 = symbolParam.value
  if (!l18 || !hasApiKey()) return
  if (kind === 'adjusted' && candlesAdj.value.length) return
  if (kind === 'unadjusted' && candlesRaw.value.length) return
  if (kind === 'intraday' && candlesToday.value.length) return
  candlesLoading.value = true
  try {
    if (kind === 'adjusted') candlesAdj.value = await fetchDailyCandles(l18, 'adjusted')
    else if (kind === 'unadjusted') candlesRaw.value = await fetchDailyCandles(l18, 'unadjusted')
    else candlesToday.value = await fetchIntradayCandles(l18)
  } catch {
    /* keep fallback mock candles */
  } finally {
    candlesLoading.value = false
  }
}

function setCandleKind(kind: CandleKind) {
  candleKind.value = kind
  void ensureCandles(kind)
}

async function loadTicks() {
  const l18 = symbolParam.value
  if (!l18 || ticksLoading.value || ticks.value.length) return
  ticksLoading.value = true
  ticksError.value = null
  try {
    ticks.value = await fetchTransactions(l18)
  } catch (e) {
    ticksError.value = e instanceof Error ? `دریافت ریزمعاملات ناموفق بود: ${e.message}` : 'دریافت ریزمعاملات ناموفق بود.'
  } finally {
    ticksLoading.value = false
  }
}

const ticksSorted = computed(() => [...ticks.value].sort((a, b) => b.row - a.row))
const ticksPaged = computed(() => ticksSorted.value.slice(0, ticksLimit.value))
const ticksSummary = computed(() => {
  const active = ticks.value.filter((t) => !t.canceled)
  if (!active.length) return null
  const vol = active.reduce((s, t) => s + t.volume, 0)
  const val = active.reduce((s, t) => s + t.volume * t.price, 0)
  return { count: active.length, volume: vol, vwap: vol ? Math.round(val / vol) : 0 }
})

const candles = computed(() => {
  if (candleKind.value === 'intraday' && candlesToday.value.length) {
    const session = detail.value?.date_update ?? priceHistory.value[0]?.date ?? ''
    return session ? intradayToPoints(candlesToday.value, session) : []
  }
  const rows = candleKind.value === 'unadjusted' ? candlesRaw.value : candlesAdj.value
  if (rows.length) return dailyCandlesToPoints(rows, 365)
  if (historyIsLive.value && priceHistory.value.length) return historyToCandles(priceHistory.value, 365)
  return symbol.value ? mockCandles(symbol.value.pc ?? 5000, 90) : []
})
const candleKinds: Array<{ key: CandleKind; label: string }> = [
  { key: 'adjusted', label: 'تعدیل‌شده' },
  { key: 'unadjusted', label: 'تعدیل‌نشده' },
  { key: 'intraday', label: 'امروز (۲دقیقه‌ای)' },
]
const chartSubtitle = computed(() => {
  const live = candlesAdj.value.length > 0 || candlesRaw.value.length > 0 || candlesToday.value.length > 0
  const kindLabel = candleKinds.find((k) => k.key === candleKind.value)?.label ?? ''
  if (live && candles.value.length) {
    const tag = candleKind.value === 'intraday' ? `کندل‌های امروز (${formatFaNumber(candles.value.length)} کندل)` : '۱ ساله زنده'
    return `${symbol.value?.l18} — ${kindLabel} — ${tag}`
  }
  if (historyIsLive.value && priceHistory.value.length) {
    const newest = priceHistory.value[0]!
    const oldest = priceHistory.value[Math.min(364, priceHistory.value.length - 1)]!
    return `${symbol.value?.l18} — ${formatJalaliDate(oldest.date)} تا ${formatJalaliDate(newest.date)} (زنده، ۱ ساله)`
  }
  return `${symbol.value?.l18 ?? ''} — داده نمایشی`
})
const shareholders = computed(() => {
  const src = shIsLive.value && shList.value.length ? shList.value : mockShareholders(symbolParam.value)
  return src.map((s) => ({
    name: s.name,
    shares: formatFaNumber(s.shares),
    percent: formatFaPercent(s.percent, 2),
    change: s.change ?? 0,
    _live: shIsLive.value && shList.value.length > 0,
  })) as unknown as Array<Record<string, unknown>>
})

const stats = computed(() => {
  const s = symbol.value
  if (!s) return []
  const d = detail.value
  return [
    { label: 'قیمت پایانی', value: formatFaNumber(s.pc), cls: '' },
    { label: 'آخرین قیمت', value: formatFaNumber(s.pl), cls: changeClass(s.plp) },
    { label: 'تغییر پایانی', value: formatFaPercent(s.pcp), cls: changeClass(s.pcp) },
    { label: 'ارزش معاملات', value: `${formatCompactFa(s.tval)} تومان`, cls: '' },
    { label: 'حجم معاملات', value: formatFaNumber(s.tvol), cls: '' },
    { label: 'بازه روز', value: `${formatFaNumber(s.pmin)} – ${formatFaNumber(s.pmax)}`, cls: '!text-[13px]' },
    { label: 'بازه هفته', value: d ? `${formatFaNumber(d.pmin_1w)} – ${formatFaNumber(d.pmax_1w)}` : '—', cls: '!text-[13px]' },
    { label: 'بازه سال', value: d ? `${formatFaNumber(d.pmin_1y)} – ${formatFaNumber(d.pmax_1y)}` : '—', cls: '!text-[13px]' },
    { label: 'P/E', value: s.pe == null ? '—' : formatFaNumber(s.pe, { digits: 2 }), cls: '' },
    { label: 'P/E گروه', value: d?.g_pe == null ? '—' : formatFaNumber(d.g_pe, { digits: 2 }), cls: '' },
    { label: 'P/S', value: d?.ps == null ? '—' : formatFaNumber(d.ps, { digits: 2 }), cls: '' },
    { label: 'ارزش بازار', value: `${formatCompactFa(s.mv)} تومان`, cls: '' },
  ]
})

const tradeRows = computed(() => {
  const s = symbol.value
  if (!s) return [] as Array<[string, string]>
  const d = detail.value
  return [
    ['تعداد معاملات', formatFaNumber(s.tno)],
    ['حجم مبنا', formatFaNumber(s.bvol)],
    ['سهام شناور', d?.ff == null ? formatFaNumber(s.z) : `${toFaDigits(d.ff)}٪`],
    ['میانگین حجم ماه', formatFaNumber(d?.tvol_avg_1m)],
    ['خرید حقیقی (حجم)', formatFaNumber(s.Buy_I_Volume)],
    ['خرید حقوقی (حجم)', formatFaNumber(s.Buy_N_Volume)],
    ['فروش حقیقی (حجم)', formatFaNumber(s.Sell_I_Volume)],
    ['فروش حقوقی (حجم)', formatFaNumber(s.Sell_N_Volume)],
    ['سرانه خرید حقیقی', formatFaNumber(s.Buy_CountI && s.Buy_I_Volume ? Math.round(s.Buy_I_Volume / s.Buy_CountI) : null)],
  ] as Array<[string, string]>
})

const identityRows = computed(() => {
  const d = detail.value
  if (!d) return [['وضعیت اتصال', 'نمایشی (mock) — کلید API لازم است']] as Array<[string, string]>
  return [
    ['ISIN', d.isin],
    ['کد ۱۲ رقمی', d.code_12 ?? '—'],
    ['کد نماد', d.code_5 ?? d.code_4 ?? '—'],
    ['بازار', d.m ?? '—'],
    ['تابلو', d.m_board ?? '—'],
    ['صنعت', d.cs ?? '—'],
    ['زیرگروه', d.cs_sub ?? '—'],
    ['تعداد سهام', formatFaNumber(d.z)],
  ] as Array<[string, string]>
})

const shCols = [
  { key: 'name', label: 'سهامدار' },
  { key: 'shares', label: 'تعداد سهام' },
  { key: 'percent', label: 'درصد' },
  { key: 'change', label: 'تغییر روز' },
]
</script>
