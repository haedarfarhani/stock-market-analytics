<template>
  <div class="flex items-center gap-1.5 overflow-x-auto px-1 py-1.5" role="toolbar" aria-label="ابزارهای نمودار">
    <!-- chart type -->
    <div class="tb-group" role="group" aria-label="نوع نمودار">
      <button
        v-for="k in kinds"
        :key="k.key"
        @click="$emit('kind', k.key)"
        :title="k.label"
        class="tb-btn"
        :class="kind === k.key ? 'tb-btn-active' : ''"
      ><ChartIcon :name="k.icon" :size="22" /></button>
    </div>
    <!-- dataset -->
    <div class="tb-group" role="group" aria-label="نوع داده">
      <button
        v-for="s in sets"
        :key="s.key"
        @click="$emit('set', s.key)"
        :title="s.title"
        class="tb-text"
        :class="set === s.key ? 'tb-text-active' : ''"
      >{{ s.label }}</button>
    </div>
    <!-- aggregation -->
    <div v-if="set !== 'intraday'" class="tb-group" role="group" aria-label="تایم‌فریم">
      <button
        v-for="a in aggs"
        :key="a.key"
        @click="$emit('agg', a.key)"
        :title="a.title"
        class="tb-text"
        :class="agg === a.key ? 'tb-text-active' : ''"
      >{{ a.label }}</button>
    </div>
    <!-- range -->
    <div v-if="set !== 'intraday'" class="tb-group" role="group" aria-label="بازه">
      <button
        v-for="r in ranges"
        :key="r.days"
        @click="$emit('range', r.days)"
        class="tb-text font-mono"
        :class="range === r.days ? 'tb-text-active' : ''"
        dir="ltr"
      >{{ r.label }}</button>
    </div>
    <span class="tb-sep" aria-hidden="true" />
    <button @click="$emit('toggle', 'indicators')" title="اندیکاتورها" class="tb-btn" :class="{ 'tb-btn-active': panels === 'indicators' }"><ChartIcon name="indicators" :size="22" /></button>
    <button @click="$emit('toggle', 'volume')" :title="volume ? 'پنهان‌کردن حجم' : 'نمایش حجم'" class="tb-btn" :class="{ 'tb-btn-active': volume }"><ChartIcon name="volume" :size="22" /></button>
    <button @click="$emit('toggle', 'magnet')" :title="magnet ? 'آهنربا روشن' : 'آهنربا خاموش'" class="tb-btn" :class="{ 'tb-btn-active': magnet }"><ChartIcon name="magnet" :size="22" /></button>
    <button @click="$emit('toggle', 'grid')" :title="grid ? 'پنهان‌کردن شبکه' : 'نمایش شبکه'" class="tb-btn" :class="{ 'tb-btn-active': grid }"><ChartIcon name="grid" :size="22" /></button>
    <span class="tb-sep" aria-hidden="true" />
    <button @click="$emit('undo')" :disabled="!canUndo" title="واگرد (Ctrl+Z)" class="tb-btn disabled:opacity-35"><ChartIcon name="undo" :size="22" /></button>
    <button @click="$emit('redo')" :disabled="!canRedo" title="ازنو (Ctrl+Y)" class="tb-btn disabled:opacity-35"><ChartIcon name="redo" :size="22" /></button>
    <button @click="$emit('reset')" title="تنظیم مجدد نما" class="tb-btn"><ChartIcon name="fit" :size="22" /></button>
    <button @click="$emit('shot')" title="دانلود تصویر نمودار" class="tb-btn"><ChartIcon name="camera" :size="22" /></button>
    <button @click="$emit('refresh')" :title="auto ? 'توقف به‌روزرسانی خودکار' : 'به‌روزرسانی خودکار'" class="tb-btn" :class="{ 'tb-btn-active': auto }"><ChartIcon name="refresh" :size="22" /></button>
    <button @click="$emit('fullscreen')" title="تمام‌صفحه (F)" class="tb-btn"><ChartIcon name="fullscreen" :size="22" /></button>
  </div>
</template>

<script setup lang="ts">
import type { Aggregate } from '@/chart/data.ts'
import type { CandleSet, ChartKind } from '@/chart/types.ts'
import ChartIcon from './ChartIcon.vue'

defineProps<{
  kind: ChartKind
  set: CandleSet
  agg: Aggregate
  range: number
  volume: boolean
  magnet: boolean
  grid: boolean
  auto: boolean
  panels: string | null
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  (e: 'kind', k: ChartKind): void
  (e: 'set', s: CandleSet): void
  (e: 'agg', a: Aggregate): void
  (e: 'range', days: number): void
  (e: 'toggle', w: 'indicators' | 'volume' | 'magnet' | 'grid'): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'reset'): void
  (e: 'shot'): void
  (e: 'refresh'): void
  (e: 'fullscreen'): void
}>()

const kinds: Array<{ key: ChartKind; label: string; icon: string }> = [
  { key: 'candles', label: 'کندل', icon: 'candle' },
  { key: 'bars', label: 'میله‌ای (OHLC)', icon: 'bars' },
  { key: 'line', label: 'خطی', icon: 'line' },
  { key: 'area', label: 'ناحیه‌ای', icon: 'area' },
  { key: 'baseline', label: 'خط مبنا', icon: 'baseline' },
]
const sets: Array<{ key: CandleSet; label: string; title: string }> = [
  { key: 'adjusted', label: 'تعدیل‌شده', title: 'کندل روزانه تعدیل‌شده' },
  { key: 'unadjusted', label: 'تعدیل‌نشده', title: 'کندل روزانه تعدیل‌نشده' },
  { key: 'intraday', label: 'امروز', title: 'کندل‌های ۲دقیقه‌ای امروز (فقط روز جاری)' },
]
const aggs: Array<{ key: Aggregate; label: string; title: string }> = [
  { key: 'daily', label: 'روزانه', title: 'تایم‌فریم روزانه' },
  { key: 'weekly', label: 'هفتگی', title: 'تجمیع هفتگی سمت‌کاربر از دیتای روزانه' },
  { key: 'monthly', label: 'ماهانه', title: 'تجمیع ماهانه سمت‌کاربر از دیتای روزانه' },
]
const ranges = [
  { days: 30, label: '1M' },
  { days: 90, label: '3M' },
  { days: 180, label: '6M' },
  { days: 365, label: '1Y' },
  { days: 1825, label: '5Y' },
  { days: 0, label: 'All' },
]
</script>

<style scoped>
.tb-group {
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 0.85rem;
  background: var(--secondary);
  padding: 3px;
  flex-shrink: 0;
}
.tb-btn {
  display: grid;
  place-items: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  border-radius: 0.65rem;
  color: var(--muted);
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.tb-btn:hover:not(:disabled) {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.15);
}
.tb-btn-active {
  background: linear-gradient(135deg, var(--brand-solid), var(--accent));
  color: #fff !important;
  box-shadow: 0 4px 12px -3px rgb(219 39 119 / 0.5);
}
.tb-text {
  white-space: nowrap;
  border-radius: 0.65rem;
  padding: 0.5rem 0.7rem;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.tb-text:hover {
  color: var(--ink);
}
.tb-text-active {
  background: var(--surface);
  color: var(--brand);
  box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.15);
}
.tb-sep {
  margin: 0 0.25rem;
  height: 1.5rem;
  width: 1px;
  flex-shrink: 0;
  background: var(--line);
}
</style>
