<template>
  <div class="flex min-w-0 flex-col gap-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-1">
    <!-- row 1 (mobile) / identity (desktop): symbol + favorite -->
    <div class="flex min-w-0 items-center gap-2">
      <h2 class="min-w-0 flex-1 truncate text-base font-black lg:flex-none">
        {{ symbol }} <span class="text-xs font-medium text-muted">{{ company }}</span>
      </h2>
      <button @click="$emit('toggle-watch')" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-xl leading-none transition hover:border-brand" :class="inWatch ? 'text-brand' : 'text-muted'" :aria-label="inWatch ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'">
        {{ inWatch ? '★' : '☆' }}
      </button>
    </div>
    <!-- row 2 (mobile) / price block (desktop): price + change -->
    <div class="flex items-center gap-2 lg:ms-auto">
      <div class="flex items-center gap-3 rounded-2xl border border-line bg-secondary/60 px-3 py-1.5">
        <div class="text-left">
          <p class="tnum text-xl font-black" :class="changeClass(changePercent)">{{ formatFaNumber(price) }}</p>
          <p class="tnum text-[11px]" :class="changeClass(changePercent)">{{ formatFaPercent(changePercent) }} ({{ formatFaNumber(change) }})</p>
        </div>
        <div class="tnum hidden text-[11px] leading-5 text-muted lg:block">
          باز: {{ formatFaNumber(ohlc?.open) }} • سقف: {{ formatFaNumber(ohlc?.high) }} • کف: {{ formatFaNumber(ohlc?.low) }} • پایانی: {{ formatFaNumber(ohlc?.close) }}
          <span v-if="ohlc?.volume != null"> • حجم: {{ formatCompactFa(ohlc.volume) }}</span>
        </div>
      </div>
    </div>
    <!-- row 3 (mobile only): key stats strip -->
    <div class="tnum -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 lg:hidden" aria-label="آمار کلیدی">
      <span v-for="s in statChips" :key="s.label" class="flex shrink-0 items-center gap-1 rounded-lg bg-secondary/60 px-2 py-1 text-[11px]">
        <span class="text-muted">{{ s.label }}:</span><strong>{{ s.value }}</strong>
      </span>
    </div>
    <!-- expandable secondary details (mobile only) -->
    <details class="text-[11px] text-muted lg:hidden">
      <summary class="w-fit cursor-pointer font-bold text-brand">جزئیات نماد</summary>
      <p class="tnum pt-1">{{ market }} <span v-if="state">• وضعیت: {{ state }}</span></p>
    </details>
    <!-- market/state line (desktop only) -->
    <p class="tnum hidden text-[11px] text-muted lg:block">{{ market }} <span v-if="state">• وضعیت: {{ state }}</span></p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { changeClass, formatCompactFa, formatFaNumber, formatFaPercent } from '@/utils/format'

const props = defineProps<{
  symbol: string
  company: string
  market: string
  state?: string
  price: number | null
  change: number | null
  changePercent: number | null
  ohlc: { open: number; high: number; low: number; close: number; volume?: number } | null
  inWatch: boolean
}>()
defineEmits<{ (e: 'toggle-watch'): void }>()

const statChips = computed(() => [
  { label: 'باز', value: formatFaNumber(props.ohlc?.open) },
  { label: 'سقف', value: formatFaNumber(props.ohlc?.high) },
  { label: 'کف', value: formatFaNumber(props.ohlc?.low) },
  { label: 'پایانی', value: formatFaNumber(props.ohlc?.close) },
  ...(props.ohlc?.volume != null ? [{ label: 'حجم', value: formatCompactFa(props.ohlc.volume) }] : []),
])
</script>
