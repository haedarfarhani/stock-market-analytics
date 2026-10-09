<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-line bg-surface p-3">
      <div class="flex flex-wrap items-center gap-2">
        <MockBadge :is-mock="market.isMock" />
        <span class="tnum text-[11px] text-muted">{{ dayStatus.weekdayFa }} • ساعت تهران {{ toFaDigits(dayStatus.tehranTime) }}</span>
        <span class="ms-auto flex flex-wrap gap-1.5">
          <span
            v-for="s in dayStatus.segments"
            :key="s.id"
            class="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold"
            :title="s.note"
          >
            <span class="h-2 w-2 rounded-full" :class="s.open ? 'bg-emerald-500' : 'bg-rose-500'" aria-hidden="true"></span>
            {{ s.label }}: {{ s.open ? 'باز' : 'بسته' }}
          </span>
        </span>
      </div>
      <details class="mt-2 text-xs">
        <summary class="cursor-pointer font-bold text-brand">جدول ساعات معاملات (رژیم مهر ۱۴۰۵)</summary>
        <div class="mt-2 overflow-x-auto">
          <table class="w-full min-w-[420px] text-right text-[12px]">
            <tbody>
              <tr v-for="[k, v] in SCHEDULE_ROWS" :key="k" class="border-t border-line/60">
                <td class="px-2 py-1.5 text-muted">{{ k }}</td>
                <td class="tnum px-2 py-1.5 text-left font-bold">{{ v }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-1 text-[10px] leading-5 text-muted">وضعیت‌ها بر اساس ساعت تهران و بدون احتساب تعطیلات رسمی‌اند. پیش‌گشایش درآمد ثابت فرابورس ۸:۲۵ تا ۸:۳۰ و سایر غیرسهامی ۸:۴۵ تا ۹:۰۰ است.</p>
        </div>
      </details>
    </div>

    <!-- Indices -->
    <section aria-label="شاخص‌های اصلی">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MarketCard
          v-for="idx in market.indices"
          :key="idx.code"
          :title="idx.name"
          :subtitle="idx.code"
          :value="formatFaNumber(idx.value)"
          :change-percent="idx.changePercent"
          :sub="`تغییر: ${formatFaNumber(idx.change)} واحد`"
        />
      </div>
    </section>

    <!-- Top lists -->
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-label="برترین‌ها">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <h3 class="border-b border-line px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">🟢 بیشترین رشد</h3>
        <ul class="divide-y divide-line dark:divide-line">
          <li v-for="s in market.gainers" :key="s.l18">
            <RouterLink :to="`/stocks/${encodeURIComponent(s.l18)}`" class="flex items-center gap-2 px-4 py-2.5 transition hover:bg-secondary/50 dark:hover:bg-secondary/60">
              <span class="font-bold">{{ s.l18 }}</span>
              <span class="truncate text-[11px] text-muted">{{ s.l30 }}</span>
              <ChangeBadge :value="s.pcp" class="ms-auto" />
            </RouterLink>
          </li>
        </ul>
      </div>
      <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <h3 class="border-b border-line px-4 py-3 text-sm font-bold text-rose-700 dark:border-line dark:text-rose-300">🔴 بیشترین افت</h3>
        <ul class="divide-y divide-line dark:divide-line">
          <li v-for="s in market.losers" :key="s.l18">
            <RouterLink :to="`/stocks/${encodeURIComponent(s.l18)}`" class="flex items-center gap-2 px-4 py-2.5 transition hover:bg-secondary/50 dark:hover:bg-secondary/60">
              <span class="font-bold">{{ s.l18 }}</span>
              <span class="truncate text-[11px] text-muted">{{ s.l30 }}</span>
              <ChangeBadge :value="s.pcp" class="ms-auto" />
            </RouterLink>
          </li>
        </ul>
      </div>
      <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <h3 class="border-b border-line px-4 py-3 text-sm font-bold dark:border-line">💰 پرمعامله‌ترین‌ها (ارزش)</h3>
        <ul class="divide-y divide-line dark:divide-line">
          <li v-for="s in market.mostTraded" :key="s.l18" class="flex items-center gap-2 px-4 py-2.5">
            <span class="font-bold">{{ s.l18 }}</span>
            <span class="tnum ms-auto text-xs text-muted">{{ formatCompactFa(s.tval) }} تومان</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Gold/FX snapshot + main table -->
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <div class="flex items-center justify-between border-b border-line px-4 py-3 dark:border-line">
          <h3 class="text-sm font-bold">🪙 طلا و ارز</h3>
          <RouterLink to="/commodities" class="text-[11px] font-bold text-brand">مشاهده همه ←</RouterLink>
        </div>
        <ul class="divide-y divide-line dark:divide-line">
          <li v-for="c in commodities.slice(0, 6)" :key="c.name" class="flex items-center gap-2 px-4 py-2.5 text-[13px]">
            <span class="font-semibold">{{ c.name }}</span>
            <span class="tnum ms-auto">{{ formatFaNumber(c.price) }}</span>
            <ChangeBadge :value="c.changePercent" />
          </li>
        </ul>
      </div>
      <div class="xl:col-span-2">
        <DataTable
          title="نمای بازار سهام"
          :columns="cols"
          :rows="tableRows"
          row-key="l18"
          :loading="market.status === 'loading' && !tableRows.length"
          :error="null"
          empty-title="نمادی یافت نشد"
          empty-hint="عبارت جستجو را تغییر دهید."
          :sort-key="sortKey" :sort-dir="sortDir"
          @sort="onSort"
        >
          <template #actions>
            <RouterLink to="/stocks" class="text-[11px] font-bold text-brand">همه نمادها ←</RouterLink>
          </template>
          <template #cell-l18="{ row }">
            <RouterLink :to="`/stocks/${encodeURIComponent(String(row.l18))}`" class="font-bold text-brand hover:underline">{{ row.l18 }}</RouterLink>
          </template>
          <template #cell-pcp="{ row }"><ChangeBadge :value="row.pcp as number" /></template>
          <template #cell-tval="{ row }"><span class="tnum">{{ formatCompactFa(row.tval as number) }}</span></template>
          <template #rowActions="{ row }">
            <button @click="watch.toggle(String(row.l18))" class="text-base" :title="watch.has(String(row.l18)) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'">
              {{ watch.has(String(row.l18)) ? '★' : '☆' }}
            </button>
          </template>
        </DataTable>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useMarketQuotesStore } from '@/stores/quotes'
import { useWatchlistStore } from '@/stores/watchlist'
import { MOCK_COMMODITIES } from '@/data/mock'
import { SCHEDULE_ROWS, getMarketDayStatus } from '@/data/marketHours.ts'
import { formatCompactFa, formatFaNumber, toFaDigits } from '@/utils/format'
import MarketCard from '@/components/MarketCard.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import MockBadge from '@/components/MockBadge.vue'

const market = useMarketStore()
const quotes = useMarketQuotesStore()
const watch = useWatchlistStore()
const dayStatus = ref(getMarketDayStatus())
let timer = 0
const MOCK_FALLBACK = MOCK_COMMODITIES.map((c) => ({ name: c.name, price: c.price, changePercent: c.changePercent }))
const commodities = computed(() =>
  quotes.snapshot.length
    ? quotes.snapshot.map((q) => ({ name: q.name, price: q.price, changePercent: q.change_percent }))
    : MOCK_FALLBACK,
)

onMounted(() => {
  void market.load()
  void quotes.load()
  timer = window.setInterval(() => {
    dayStatus.value = getMarketDayStatus()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})

const cols: TableColumn[] = [
  { key: 'l18', label: 'نماد' },
  { key: 'l30', label: 'شرکت' },
  { key: 'pl', label: 'آخرین قیمت', numeric: true, sortable: true },
  { key: 'pcp', label: 'تغییر پایانی٪', numeric: true, sortable: true },
  { key: 'tvol', label: 'حجم', numeric: true, sortable: true },
  { key: 'tval', label: 'ارزش معاملات', numeric: true, sortable: true },
]

const sortKey = ref<string | null>('tval')
const sortDir = ref<'asc' | 'desc'>('desc')

const tableRows = computed(() => {
  const rows = [...market.filtered].map((s) => ({ ...s })) as unknown as Array<Record<string, unknown>>
  if (sortKey.value) {
    rows.sort((a, b) => {
      const av = Number(a[sortKey.value!] ?? 0)
      const bv = Number(b[sortKey.value!] ?? 0)
      return sortDir.value === 'asc' ? av - bv : bv - av
    })
  }
  return rows.slice(0, 8)
})

function onSort(key: string) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}
</script>
