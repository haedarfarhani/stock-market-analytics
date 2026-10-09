<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-line p-3">
      <h3 class="text-sm font-black">اندیکاتورها</h3>
      <input
        v-model="q"
        placeholder="جستجو… (مثلاً RSI)"
        class="mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
        aria-label="جستجوی اندیکاتور"
      />
    </div>
    <div class="flex-1 space-y-4 overflow-y-auto p-3">
      <section>
        <h4 class="mb-1 text-[11px] font-bold text-muted">افزودن ({{ filtered.length }})</h4>
        <ul class="space-y-1">
          <li v-for="d in filtered" :key="d.key">
            <button @click="$emit('add', d.key)" class="flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-right text-[13px] transition hover:border-brand hover:bg-brand/5" :title="d.description">
              <span class="font-bold">{{ d.labelFa }}</span>
              <span class="ms-auto grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-brand"><ChartIcon name="plus" :size="16" /></span>
            </button>
            <p class="px-1 pt-0.5 text-[10px] leading-4 text-muted">{{ d.description }}</p>
          </li>
        </ul>
        <p v-if="!filtered.length" class="py-4 text-center text-xs text-muted">موردی یافت نشد.</p>
      </section>
      <section>
        <h4 class="mb-1 text-[11px] font-bold text-muted">فعال ({{ instances.length }})</h4>
        <ul v-if="instances.length" class="space-y-2">
          <li v-for="inst in instances" :key="inst.uid" class="rounded-xl border border-line p-2">
            <div class="flex items-center gap-1.5">
              <button @click="$emit('visible', inst.uid)" :title="inst.visible ? 'پنهان‌کردن' : 'نمایش'" class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary hover:text-ink">
                <ChartIcon :name="inst.visible ? 'eye' : 'eyeoff'" :size="19" />
              </button>
              <span class="text-[13px] font-bold">{{ labelOf(inst.key) }}</span>
              <button @click="$emit('remove', inst.uid)" title="حذف" class="ms-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-500">
                <ChartIcon name="trash" :size="18" />
              </button>
            </div>
            <div class="mt-1.5 grid grid-cols-2 gap-1.5">
              <label v-for="pd in paramsOf(inst.key)" :key="pd.key" class="flex items-center gap-1 text-[11px] text-muted">
                {{ pd.label }}
                <input
                  :value="inst.params[pd.key]"
                  @input="$emit('param', inst.uid, pd.key, Number(($event.target as HTMLInputElement).value))"
                  type="number"
                  :min="pd.min"
                  :max="pd.max"
                  :step="pd.step"
                  class="tnum w-full rounded-lg border border-line bg-surface px-1.5 py-1 text-xs"
                />
              </label>
            </div>
            <div class="mt-1.5 flex flex-wrap gap-1.5">
              <label v-for="(col, ck) in inst.colors" :key="ck" class="flex items-center gap-1 text-[10px] text-muted" :title="String(ck)">
                <input :value="col" @input="$emit('color', inst.uid, String(ck), ($event.target as HTMLInputElement).value)" type="color" class="h-5 w-7 cursor-pointer rounded bg-transparent" />
                {{ shortColor(String(ck)) }}
              </label>
            </div>
          </li>
        </ul>
        <p v-else class="py-2 text-center text-xs text-muted">هنوز اندیکاتوری اضافه نشده است.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { INDICATORS } from '@/chart/indicators.ts'
import type { IndicatorInstance } from '@/chart/types.ts'
import ChartIcon from './ChartIcon.vue'

defineProps<{ instances: IndicatorInstance[] }>()
defineEmits<{
  (e: 'add', key: string): void
  (e: 'remove', uid: string): void
  (e: 'visible', uid: string): void
  (e: 'param', uid: string, key: string, value: number): void
  (e: 'color', uid: string, key: string, value: string): void
}>()

const q = ref('')
const filtered = computed(() => {
  const n = q.value.trim()
  if (!n) return INDICATORS
  return INDICATORS.filter((d) => d.labelFa.includes(n) || d.key.toLowerCase().includes(n.toLowerCase()))
})
function labelOf(key: string): string {
  return INDICATORS.find((d) => d.key === key)?.labelFa ?? key
}
function paramsOf(key: string): Array<{ key: string; label: string; min: number; max: number; step: number }> {
  return INDICATORS.find((d) => d.key === key)?.params ?? []
}
function shortColor(k: string): string {
  const map: Record<string, string> = { sma: 'خط', ema: 'خط', wma: 'خط', basis: 'میانی', upper: 'بالا', lower: 'پایین', vwap: 'خط', rsi: 'خط', macd: 'مکدی', sig: 'سیگنال', hist: 'هیستو', k: '%K', d: '%D', atr: 'خط', adx: 'ADX', pdi: '+DI', mdi: '−DI', obv: 'خط', volma: 'خط', tenkan: 'تنکان', kijun: 'کیجون', senkouA: 'سنکو A', senkouB: 'سنکو B', chikou: 'چیکو' }
  return map[k] ?? k
}
</script>
