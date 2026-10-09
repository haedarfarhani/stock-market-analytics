<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="market.indexIsMock" />
      <span v-if="market.indexMeta" class="tnum text-[11px] text-muted dark:text-muted">
        {{ formatJalaliDate(market.indexMeta.date) }} — ساعت {{ toFaDigits(market.indexMeta.time ?? '—') }}
        <span v-if="market.indexMeta.state"> • وضعیت: <strong>{{ market.indexMeta.state }}</strong></span>
      </span>
    </div>

    <div v-if="market.indexMeta && !market.indexIsMock" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="s in totals" :key="s.label" class="rounded-2xl border border-line bg-surface p-3 dark:border-line dark:bg-surface">
        <p class="text-[11px] text-muted">{{ s.label }}</p>
        <p class="tnum mt-1 text-base font-extrabold">{{ s.value }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MarketCard
        v-for="idx in market.indices"
        :key="idx.code"
        :title="idx.name"
        :subtitle="`${idx.code}${idx.time ? ` — ${toFaDigits(idx.time)}` : ''}`"
        :value="formatFaNumber(idx.value)"
        :change-percent="idx.changePercent"
        :sub="`تغییر: ${formatFaNumber(idx.change)} واحد`"
      >
        <p v-if="idx.min != null && idx.max != null" class="tnum mt-1 text-[11px] text-muted">
          کف/سقف روز: {{ formatFaNumber(idx.min) }} – {{ formatFaNumber(idx.max) }}
        </p>
      </MarketCard>
    </div>

    <PriceChart v-model:mode="mode" :points="points" title="روند شاخص کل (نمایشی)" subtitle="داده نمایشی ۹۰ روزه — تاریخچه شاخص در Index API ارائه نمی‌شود" />

    <DataTable title="جدول شاخص‌ها" :columns="cols" :rows="rows" :loading="market.status==='loading' && !rows.length" :error="null" empty-title="شاخصی ثبت نشده">
      <template #cell-value="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.value as number) }}</span></template>
      <template #cell-changePercent="{ row }"><ChangeBadge :value="row.changePercent as number" /></template>
      <template #cell-change="{ row }"><span class="tnum">{{ formatFaNumber(row.change as number) }}</span></template>
      <template #cell-min="{ row }"><span class="tnum">{{ row.min == null ? '—' : formatFaNumber(row.min as number) }}</span></template>
      <template #cell-max="{ row }"><span class="tnum">{{ row.max == null ? '—' : formatFaNumber(row.max as number) }}</span></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMarketStore } from '@/stores/market'
import { mockCandles } from '@/data/mock'
import { formatCompactFa, formatFaNumber, formatJalaliDate, toFaDigits } from '@/utils/format'
import MarketCard from '@/components/MarketCard.vue'
import PriceChart from '@/components/PriceChart.vue'
import DataTable from '@/components/DataTable.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import MockBadge from '@/components/MockBadge.vue'

const market = useMarketStore()
onMounted(() => market.load())
const mode = ref<'candle' | 'line'>('line')
const points = computed(() => {
  const tedpix = market.indices.find((i) => i.code === 'TEDPIX')
  return mockCandles(tedpix?.value ?? 2845120, 90, 21)
})

const totals = computed(() => {
  const m = market.indexMeta
  if (!m) return []
  return [
    { label: 'تعداد معاملات بورس', value: formatFaNumber(m.tno) },
    { label: 'حجم معاملات', value: formatFaNumber(m.tvol) },
    { label: 'ارزش معاملات', value: `${formatCompactFa(m.tval)} تومان` },
    { label: 'ارزش بازار بورس', value: `${formatCompactFa(m.mv)} تومان` },
  ]
})

const cols = [
  { key: 'name', label: 'شاخص' },
  { key: 'code', label: 'کد' },
  { key: 'value', label: 'مقدار', numeric: true },
  { key: 'change', label: 'تغییر', numeric: true },
  { key: 'changePercent', label: 'تغییر٪', numeric: true },
  { key: 'min', label: 'کف روز', numeric: true },
  { key: 'max', label: 'سقف روز', numeric: true },
]
const rows = computed(() => market.indices as unknown as Array<Record<string, unknown>>)
</script>
