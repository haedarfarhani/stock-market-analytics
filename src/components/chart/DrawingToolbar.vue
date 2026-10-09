<template>
  <div :class="vertical ? 'flex flex-col items-center gap-0.5 py-1' : 'flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar'" role="toolbar" aria-label="ابزارهای ترسیم">
    <button
      v-for="t in tools"
      :key="t.key"
      @click="$emit('tool', t.key)"
      :title="`${t.label} (${t.hint})`"
      class="tool"
      :class="[tool === t.key ? 'tool-active' : '', vertical ? 'tool-vertical' : '']"
    ><ChartIcon :name="t.icon" :size="vertical ? 18 : 22" /></button>
    <span :class="vertical ? 'my-1 h-px w-6 bg-line' : 'mx-1 h-6 w-px shrink-0 bg-line'" aria-hidden="true" />
    <input
      v-model="colorModel"
      type="color"
      title="رنگ ترسیم"
      class="cursor-pointer rounded-lg bg-transparent p-0.5"
      :class="vertical ? 'h-7 w-7' : 'h-8 w-10'"
      aria-label="رنگ ترسیم"
    />
    <select
      v-model.number="widthModel"
      title="ضخامت خط"
      class="rounded-lg border border-line bg-surface font-bold text-center"
      :class="vertical ? 'h-7 w-8 px-0 text-[11px]' : 'py-1.5 px-1.5 text-xs'"
      aria-label="ضخامت خط"
    >
      <option :value="1">1</option>
      <option :value="2">2</option>
      <option :value="3">3</option>
      <option :value="4">4</option>
    </select>
    <select
      v-model="styleModel"
      title="سبک خط"
      class="rounded-lg border border-line bg-surface font-bold text-center"
      :class="vertical ? 'h-7 w-8 px-0 text-[11px]' : 'py-1.5 px-1.5 text-xs'"
      aria-label="سبک خط"
    >
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
        class="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs"
        :class="vertical ? 'w-10 text-[10px]' : 'w-28'"
        aria-label="متن یادداشت"
      />
      <button
        @click="$emit('lock')"
        :title="selected.locked ? 'بازکردن قفل' : 'قفل‌کردن'"
        class="tool"
        :class="{ 'tool-vertical': vertical }"
      >
        <ChartIcon :name="selected.locked ? 'lock' : 'unlock'" :size="vertical ? 17 : 20" />
      </button>
      <button
        @click="$emit('hide')"
        :title="selected.hidden ? 'نمایش' : 'پنهان‌کردن'"
        class="tool"
        :class="{ 'tool-vertical': vertical }"
      >
        <ChartIcon :name="selected.hidden ? 'eyeoff' : 'eye'" :size="vertical ? 17 : 20" />
      </button>
      <button
        @click="$emit('remove')"
        title="حذف (Delete)"
        class="tool tool-danger"
        :class="{ 'tool-vertical': vertical }"
      >
        <ChartIcon name="trash" :size="vertical ? 17 : 20" />
      </button>
    </template>
    <button
      @click="$emit('clear')"
      title="حذف همه ترسیم‌ها"
      class="tool"
      :class="{ 'tool-vertical': vertical }"
    >
      <ChartIcon name="clear" :size="vertical ? 17 : 20" />
    </button>
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
  { key: 'trendline', icon: 'trend', label: 'خط روند', hint: 'کلیک یا درگ' },
  { key: 'ray', icon: 'ray', label: 'پرتوی امتدادیافته', hint: 'کلیک یا درگ' },
  { key: 'hline', icon: 'hline', label: 'خط افقی', hint: 'کلیک' },
  { key: 'vline', icon: 'vline', label: 'خط عمودی', hint: 'کلیک' },
  { key: 'channel', icon: 'channel', label: 'کانال موازی', hint: 'خط پایه + عرض' },
  { key: 'rect', icon: 'rect', label: 'مستطیل', hint: 'کلیک یا درگ' },
  { key: 'price-range', icon: 'pricerange', label: 'بازه قیمتی', hint: 'کلیک یا درگ' },
  { key: 'time-range', icon: 'timerange', label: 'بازه زمانی', hint: 'کلیک یا درگ' },
  { key: 'fib', icon: 'fib', label: 'فیبوناچی اصلاحی', hint: 'کلیک یا درگ' },
  { key: 'fib-ext', icon: 'fibext', label: 'فیبوناچی گسترشی', hint: 'کلیک یا درگ' },
  { key: 'text', icon: 'text', label: 'متن', hint: 'کلیک' },
  { key: 'arrow', icon: 'arrow', label: 'پیکان', hint: 'کلیک یا درگ' },
  { key: 'brush', icon: 'brush', label: 'قلم آزاد', hint: 'درگ قلم' },
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
.tool-vertical {
  min-width: 2.15rem;
  min-height: 2.15rem;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 0.55rem;
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
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
