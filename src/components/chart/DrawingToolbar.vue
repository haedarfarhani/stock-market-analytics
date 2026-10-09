<template>
  <div :class="vertical ? 'flex flex-col items-center gap-1 py-2' : 'flex items-center gap-1.5 overflow-x-auto py-1'" role="toolbar" aria-label="ابزارهای ترسیم">
    <button
      v-for="t in tools"
      :key="t.key"
      @click="$emit('tool', t.key)"
      :title="`${t.label} (${t.hint})`"
      class="tool"
      :class="{ 'tool-active': tool === t.key }"
    ><ChartIcon :name="t.icon" :size="24" /></button>
    <span :class="vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px shrink-0 bg-line'" aria-hidden="true" />
    <input v-model="colorModel" type="color" title="رنگ ترسیم" class="h-8 cursor-pointer rounded-lg bg-transparent p-0.5" :class="vertical ? 'w-9' : 'w-10'" aria-label="رنگ ترسیم" />
    <select v-model.number="widthModel" title="ضخامت خط" class="rounded-lg border border-line bg-surface py-1.5 text-xs font-bold" :class="vertical ? 'w-11 px-0 text-center' : 'px-1.5'" aria-label="ضخامت خط">
      <option :value="1">1</option>
      <option :value="2">2</option>
      <option :value="3">3</option>
      <option :value="4">4</option>
    </select>
    <select v-model="styleModel" title="سبک خط" class="rounded-lg border border-line bg-surface py-1.5 text-xs font-bold" :class="vertical ? 'w-11 px-0 text-center' : 'px-1.5'" aria-label="سبک خط">
      <option value="solid">{{ vertical ? '―' : 'ممتد' }}</option>
      <option value="dashed">{{ vertical ? '┄' : 'چین‌دار' }}</option>
      <option value="dotted">{{ vertical ? '┈' : 'نقطه‌ای' }}</option>
    </select>
    <template v-if="selected">
      <span :class="vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px shrink-0 bg-line'" aria-hidden="true" />
      <input
        v-if="selected.type === 'text'"
        :value="selected.text ?? ''"
        @input="$emit('edit-text', ($event.target as HTMLInputElement).value)"
        placeholder="متن یادداشت"
        class="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs"
        :class="vertical ? 'w-11' : 'w-28'"
        aria-label="متن یادداشت"
      />
      <button @click="$emit('lock')" :title="selected.locked ? 'بازکردن قفل' : 'قفل‌کردن'" class="tool">
        <ChartIcon :name="selected.locked ? 'lock' : 'unlock'" :size="22" />
      </button>
      <button @click="$emit('hide')" :title="selected.hidden ? 'نمایش' : 'پنهان‌کردن'" class="tool">
        <ChartIcon :name="selected.hidden ? 'eyeoff' : 'eye'" :size="22" />
      </button>
      <button @click="$emit('remove')" title="حذف (Delete)" class="tool tool-danger"><ChartIcon name="trash" :size="22" /></button>
    </template>
    <button @click="$emit('clear')" title="حذف همه ترسیم‌ها" class="tool"><ChartIcon name="clear" :size="22" /></button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DrawingObject, DrawingType } from '@/chart/types.ts'
import ChartIcon from './ChartIcon.vue'

const props = defineProps<{
  tool: DrawingType | 'cursor'
  vertical?: boolean
  selected: DrawingObject | null
  color: string
  width: number
  lineStyle: 'solid' | 'dashed' | 'dotted'
}>()

const emit = defineEmits<{
  (e: 'tool', t: DrawingType | 'cursor'): void
  (e: 'update:color', v: string): void
  (e: 'update:width', v: number): void
  (e: 'update:lineStyle', v: 'solid' | 'dashed' | 'dotted'): void
  (e: 'edit-text', v: string): void
  (e: 'lock'): void
  (e: 'hide'): void
  (e: 'remove'): void
  (e: 'clear'): void
}>()

const colorModel = computed({ get: () => props.color, set: (v) => emit('update:color', v) })
const widthModel = computed({ get: () => props.width, set: (v) => emit('update:width', v) })
const styleModel = computed({ get: () => props.lineStyle, set: (v) => emit('update:lineStyle', v) })

const tools: Array<{ key: DrawingType | 'cursor'; icon: string; label: string; hint: string }> = [
  { key: 'cursor', icon: 'cursor', label: 'انتخاب و جابه‌جایی', hint: 'Esc' },
  { key: 'trendline', icon: 'trend', label: 'خط روند', hint: 'درگ' },
  { key: 'ray', icon: 'ray', label: 'پرتوی امتدادیافته', hint: 'درگ' },
  { key: 'hline', icon: 'hline', label: 'خط افقی', hint: 'کلیک' },
  { key: 'vline', icon: 'vline', label: 'خط عمودی', hint: 'کلیک' },
  { key: 'channel', icon: 'channel', label: 'کانال موازی', hint: 'درگ + کلیک' },
  { key: 'rect', icon: 'rect', label: 'مستطیل', hint: 'درگ' },
  { key: 'price-range', icon: 'pricerange', label: 'بازه قیمتی', hint: 'درگ' },
  { key: 'time-range', icon: 'timerange', label: 'بازه زمانی', hint: 'درگ' },
  { key: 'fib', icon: 'fib', label: 'فیبوناچی اصلاحی', hint: 'درگ' },
  { key: 'fib-ext', icon: 'fibext', label: 'فیبوناچی گسترشی', hint: 'درگ' },
  { key: 'text', icon: 'text', label: 'متن', hint: 'کلیک' },
  { key: 'arrow', icon: 'arrow', label: 'پیکان', hint: 'درگ' },
  { key: 'brush', icon: 'brush', label: 'قلم آزاد', hint: 'دوبارکلیک پایان' },
]
</script>

<style scoped>
.tool {
  display: grid;
  place-items: center;
  border-radius: 0.75rem;
  min-width: 2.75rem;
  min-height: 2.75rem;
  color: var(--muted);
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.tool:hover {
  background: var(--secondary);
  color: var(--ink);
  transform: translateY(-1px);
}
.tool-active {
  background: linear-gradient(135deg, var(--brand-solid), var(--accent));
  color: #fff !important;
  box-shadow: 0 4px 12px -3px rgb(219 39 119 / 0.5);
}
.tool-danger:hover {
  background: rgb(220 38 38 / 0.12);
  color: var(--down);
}
</style>
