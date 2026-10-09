<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="market.isMock" />
      <div class="flex items-center gap-1 rounded-xl bg-surface p-1 text-xs font-bold dark:bg-surface border border-line dark:border-line">
        <button v-for="f in filters" :key="f" @click="filter = f" class="rounded-lg px-3 py-1.5" :class="filter === f ? 'bg-brand-solid text-white' : 'text-muted'">{{ f }}</button>
      </div>
      <span class="tnum ms-auto text-[11px] text-muted">{{ formatFaNumber(rows.length) }} نماد</span>
    </div>

    <div class="grid gap-2 md:grid-cols-3">
      <SearchInput v-model="market.query" placeholder="جستجوی نماد یا شرکت…" />
      <select v-model="sortKey" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="مرتب‌سازی">
        <option value="tval">مرتب‌سازی: ارزش معاملات</option>
        <option value="pcp">مرتب‌سازی: درصد تغییر</option>
        <option value="tvol">مرتب‌سازی: حجم</option>
        <option value="pe">مرتب‌سازی: P/E</option>
      </select>
      <select v-model="sortDir" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="جهت مرتب‌سازی">
        <option value="desc">نزولی</option>
        <option value="asc">صعودی</option>
      </select>
    </div>

    <DataTable
      title="فهرست نمادها"
      :columns="cols"
      :rows="rows"
      row-key="l18"
      :loading="market.status === 'loading' && !rows.length"
      :error="null"
      empty-title="نمادی مطابق فیلتر یافت نشد"
      empty-hint="جستجو یا فیلتر بازار را تغییر دهید."
      :sort-key="sortKey" :sort-dir="sortDir"
      @sort="(k) => (sortKey = k)"
    >
      <template #cell-l18="{ row }">
        <RouterLink :to="`/stocks/${encodeURIComponent(String(row.l18))}`" class="font-bold text-brand hover:underline">{{ row.l18 }}</RouterLink>
        <span class="ms-1 text-[10px] text-muted">{{ row.market === 'etf' ? 'ETF' : '' }}</span>
      </template>
      <template #cell-pc="{ row }"><span class="tnum">{{ formatFaNumber(row.pc as number) }}</span></template>
      <template #cell-pcp="{ row }"><ChangeBadge :value="row.pcp as number" /></template>
      <template #cell-pe="{ row }"><span class="tnum">{{ row.pe == null ? '—' : formatFaNumber(row.pe as number, { digits: 2 }) }}</span></template>
      <template #cell-mv="{ row }"><span class="tnum">{{ formatCompactFa(row.mv as number) }}</span></template>
      <template #rowActions="{ row }">
        <button @click="watch.toggle(String(row.l18))" class="text-lg leading-none" :aria-label="watch.has(String(row.l18)) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'">
          {{ watch.has(String(row.l18)) ? '★' : '☆' }}
        </button>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useWatchlistStore } from '@/stores/watchlist'
import { formatCompactFa, formatFaNumber } from '@/utils/format'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import SearchInput from '@/components/SearchInput.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import MockBadge from '@/components/MockBadge.vue'

const market = useMarketStore()
const watch = useWatchlistStore()
onMounted(() => market.load())

const filters = ['همه', 'مثبت', 'منفی', 'ETF', 'دیده‌بان ★'] as const
const filter = ref<(typeof filters)[number]>('همه')
const sortKey = ref('tval')
const sortDir = ref<'asc' | 'desc'>('desc')

const cols: TableColumn[] = [
  { key: 'l18', label: 'نماد' },
  { key: 'l30', label: 'شرکت' },
  { key: 'pc', label: 'پایانی', numeric: true, sortable: true },
  { key: 'pcp', label: 'تغییر٪', numeric: true, sortable: true },
  { key: 'tvol', label: 'حجم', numeric: true, sortable: true },
  { key: 'tval', label: 'ارزش', numeric: true, sortable: true },
  { key: 'pe', label: 'P/E', numeric: true, sortable: true },
  { key: 'mv', label: 'ارزش بازار', numeric: true, sortable: true },
]

const rows = computed(() => {
  let list = [...market.filtered]
  if (filter.value === 'مثبت') list = list.filter((s) => (s.pcp ?? 0) > 0)
  if (filter.value === 'منفی') list = list.filter((s) => (s.pcp ?? 0) < 0)
  if (filter.value === 'ETF') list = list.filter((s) => s.market === 'etf')
  if (filter.value === 'دیده‌بان ★') list = list.filter((s) => watch.has(s.l18))
  list.sort((a, b) => {
    const av = Number((a as unknown as Record<string, unknown>)[sortKey.value] ?? 0)
    const bv = Number((b as unknown as Record<string, unknown>)[sortKey.value] ?? 0)
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
  return list as unknown as Array<Record<string, unknown>>
})
</script>
