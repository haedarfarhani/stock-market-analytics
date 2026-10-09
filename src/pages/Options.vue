<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="isMock" />
      <span v-if="!isMock" class="tnum text-[11px] text-muted">{{ formatFaNumber(filtered.length) }} قرارداد • کل بازار در یک درخواست (کش ۶۰ ثانیه‌ای)</span>
    </div>

    <!-- Live mode -->
    <template v-if="!isMock">
      <div class="grid gap-2 md:grid-cols-4">
        <SearchInput v-model="q" placeholder="جستجوی قرارداد یا نماد پایه…" />
        <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-bold dark:border-line dark:bg-surface">
          <button v-for="t in tabs" :key="t" @click="tab = t" class="flex-1 rounded-lg px-3 py-1.5" :class="tab === t ? 'bg-brand-solid text-white' : 'text-muted'">{{ t }}</button>
        </div>
        <select v-model="sortKey" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="مرتب‌سازی">
          <option value="interest_open">مرتب‌سازی: موقعیت باز</option>
          <option value="nval">مرتب‌سازی: ارزش مفهومی</option>
          <option value="tvol">مرتب‌سازی: حجم</option>
          <option value="day_remain">مرتب‌سازی: روز تا سررسید</option>
          <option value="pcp">مرتب‌سازی: درصد تغییر</option>
        </select>
        <select v-model="onlyITM" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="فیلتر سوددهی">
          <option :value="false">همه وضعیت‌ها</option>
          <option :value="true">فقط در سود (ITM)</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="s in stats" :key="s.label" class="rounded-2xl border border-line bg-surface p-3 dark:border-line dark:bg-surface">
          <p class="text-[11px] text-muted">{{ s.label }}</p>
          <p class="tnum mt-1 text-base font-extrabold">{{ s.value }}</p>
        </div>
      </div>

      <DataTable
        title="قراردادهای اختیار معامله بورس"
        :columns="liveCols"
        :rows="paged"
        row-key="l18"
        :loading="loading"
        :error="loadError"
        retryable
        @retry="load"
        empty-title="قراردادی یافت نشد"
        empty-hint="جستجو یا فیلتر را تغییر دهید."
      >
        <template #cell-l18="{ row }"><span class="font-bold" dir="ltr">{{ row.l18 }}</span></template>
        <template #cell-type="{ row }">
          <span :class="row.type === 'call' ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted'" class="rounded-full px-2 py-0.5 text-[11px] font-bold">
            {{ row.type === 'call' ? 'خرید' : 'فروش' }}
          </span>
        </template>
        <template #cell-price_strike="{ row }"><span class="tnum">{{ formatFaNumber(row.price_strike as number) }}</span></template>
        <template #cell-date_end="{ row }"><span class="tnum">{{ formatJalaliDate(row.date_end as string) }} ({{ row.day_remain == null ? '—' : toFaDigits(row.day_remain as number) }} روز)</span></template>
        <template #cell-pc="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.pc as number) }}</span></template>
        <template #cell-pcp="{ row }"><ChangeBadge :value="row.pcp as number" /></template>
        <template #cell-interest_open="{ row }"><span class="tnum">{{ formatFaNumber(row.interest_open as number) }}</span></template>
        <template #cell-nval="{ row }"><span class="tnum">{{ formatCompactFa(row.nval as number) }}</span></template>
        <template #cell-money="{ row }"><span :class="moneyClass(row)" class="rounded-full px-2 py-0.5 text-[11px] font-bold">{{ moneyLabel(row) }}</span></template>
      </DataTable>
      <div v-if="filtered.length > limit" class="text-center">
        <button @click="limit += 100" class="rounded-xl border border-line bg-surface px-5 py-2 text-xs font-bold dark:border-line dark:bg-surface">
          نمایش بیشتر ({{ formatFaNumber(filtered.length - limit) }} مورد باقی‌مانده)
        </button>
      </div>

      <!-- IME paired options (lazy: one ~380KB request) -->
      <div class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
        <div class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 dark:border-line">
          <h3 class="text-sm font-bold">آپشن بورس کالا (خرید + فروش هم‌زمان)</h3>
          <span v-if="ime.length" class="tnum text-[11px] text-muted">{{ formatFaNumber(imeFiltered.length) }} سررسید/اعمال</span>
          <button
            v-if="!ime.length && !imeLoading"
            @click="loadIme"
            class="ms-auto rounded-xl bg-brand-solid px-4 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-brand/25 hover:bg-brand-strong"
          >
            نمایش (یک درخواست)
          </button>
          <div v-if="ime.length" class="ms-auto w-full sm:w-56">
            <SearchInput v-model="imeQ" placeholder="جستجوی کالا یا سررسید…" />
          </div>
        </div>
        <div v-if="imeLoading" class="space-y-2 p-4" role="status" aria-label="در حال بارگذاری آپشن کالا">
          <div v-for="i in 4" :key="i" class="skeleton h-9 rounded-lg" />
        </div>
        <p v-else-if="imeError" class="px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400" role="alert">
          {{ imeError }} <button @click="loadIme" class="font-bold underline">تلاش مجدد</button>
        </p>
        <div v-else-if="ime.length" class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-right text-[13px]">
            <thead>
              <tr class="border-b border-line text-xs text-muted dark:border-line dark:text-muted">
                <th class="px-4 py-3 font-semibold">گروه / سررسید</th>
                <th class="px-4 py-3 font-semibold text-left tnum">اعمال</th>
                <th class="px-4 py-3 font-semibold text-left tnum">قیمت خرید</th>
                <th class="px-4 py-3 font-semibold">تغییر خرید٪</th>
                <th class="px-4 py-3 font-semibold text-left tnum">OI خرید</th>
                <th class="px-4 py-3 font-semibold text-left tnum">قیمت فروش</th>
                <th class="px-4 py-3 font-semibold">تغییر فروش٪</th>
                <th class="px-4 py-3 font-semibold text-left tnum">OI فروش</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in imeFiltered.slice(0, imeLimit)" :key="`${p.category}-${p.strike}`" class="border-b border-line/60 last:border-0 dark:border-line/60">
                <td class="px-4 py-2.5">
                  <span class="text-[13px] font-semibold">{{ p.category }}</span>
                  <span v-if="p.commodity" class="ms-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] dark:bg-secondary" dir="ltr">{{ p.commodity }}</span>
                </td>
                <td class="tnum whitespace-nowrap px-4 py-2.5 text-left">{{ formatFaNumber(p.strike) }}</td>
                <td class="tnum whitespace-nowrap px-4 py-2.5 text-left font-bold">{{ p.call.pl == null ? '—' : formatFaNumber(p.call.pl) }}</td>
                <td class="whitespace-nowrap px-4 py-2.5"><ChangeBadge v-if="p.call.plp != null" :value="p.call.plp" /><span v-else class="text-muted">—</span></td>
                <td class="tnum whitespace-nowrap px-4 py-2.5 text-left">{{ p.call.interest_open == null ? '—' : formatFaNumber(p.call.interest_open) }}</td>
                <td class="tnum whitespace-nowrap px-4 py-2.5 text-left font-bold">{{ p.put.pl == null ? '—' : formatFaNumber(p.put.pl) }}</td>
                <td class="whitespace-nowrap px-4 py-2.5"><ChangeBadge v-if="p.put.plp != null" :value="p.put.plp" /><span v-else class="text-muted">—</span></td>
                <td class="tnum whitespace-nowrap px-4 py-2.5 text-left">{{ p.put.interest_open == null ? '—' : formatFaNumber(p.put.interest_open) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="imeFiltered.length > imeLimit" class="p-3 text-center">
            <button @click="imeLimit += 50" class="rounded-xl border border-line px-5 py-2 text-xs font-bold dark:border-line">
              نمایش بیشتر ({{ formatFaNumber(imeFiltered.length - imeLimit) }} مورد)
            </button>
          </div>
        </div>
        <p v-else class="px-4 py-6 text-center text-xs text-muted">برای حفظ سهمیه API، آپشن کالا فقط با دکمه بارگذاری می‌شود.</p>
      </div>
    </template>

    <!-- Mock fallback -->
    <template v-else>
      <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-bold dark:border-line dark:bg-surface">
        <button v-for="m in markets" :key="m" @click="tabM = m" class="rounded-lg px-3 py-1.5" :class="tabM === m ? 'bg-brand-solid text-white' : 'text-muted'">{{ m }}</button>
      </div>
      <DataTable title="قراردادهای اختیار معامله (نمایشی)" :columns="mockCols" :rows="mockRows" :loading="loading" :error="null" empty-title="قراردادی یافت نشد">
        <template #cell-strike="{ row }"><span class="tnum">{{ formatFaNumber(row.strike as number) }}</span></template>
        <template #cell-callPrice="{ row }"><span class="tnum">{{ formatFaNumber(row.callPrice as number) }}</span></template>
        <template #cell-changePercent="{ row }"><ChangeBadge :value="row.changePercent as number" /></template>
        <template #cell-openInterest="{ row }"><span class="tnum">{{ formatFaNumber(row.openInterest as number) }}</span></template>
      </DataTable>
    </template>

    <p class="text-[11px] leading-6 text-muted">
      داده زنده بورس از <span class="font-mono" dir="ltr">Tsetmc/Option.php</span> (کل بازار در یک درخواست)
      و آپشن کالا از <span class="font-mono" dir="ltr">Ime/Option.php</span> (جفت خرید/فروش، lazy-load).
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchImeOptions, fetchOptionContracts, hasApiKey } from '@/services/api'
import { MOCK_OPTIONS } from '@/data/mock'
import { formatCompactFa, formatFaNumber, formatJalaliDate, toFaDigits } from '@/utils/format'
import type { ImeOptionPair, OptionContractLive } from '@/types/market'
import DataTable from '@/components/DataTable.vue'
import SearchInput from '@/components/SearchInput.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import MockBadge from '@/components/MockBadge.vue'

const contracts = ref<OptionContractLive[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const isMock = ref(true)

const q = ref('')
const tabs = ['همه', 'خرید', 'فروش'] as const
const tab = ref<(typeof tabs)[number]>('همه')
const sortKey = ref('interest_open')
const onlyITM = ref(false)
const limit = ref(100)

const ime = ref<ImeOptionPair[]>([])
const imeLoading = ref(false)
const imeError = ref<string | null>(null)
const imeQ = ref('')
const imeLimit = ref(50)

async function loadIme() {
  if (imeLoading.value || ime.value.length) return
  imeLoading.value = true
  imeError.value = null
  try {
    ime.value = await fetchImeOptions()
  } catch (e) {
    imeError.value = e instanceof Error ? `دریافت آپشن کالا ناموفق بود: ${e.message}` : 'دریافت آپشن کالا ناموفق بود.'
  } finally {
    imeLoading.value = false
  }
}

const imeFiltered = computed(() => {
  const needle = imeQ.value.trim()
  if (!needle) return ime.value
  return ime.value.filter((p) => p.category.includes(needle) || (p.commodity ?? '').includes(needle))
})

async function load() {
  if (!hasApiKey()) {
    isMock.value = true
    return
  }
  loading.value = true
  loadError.value = null
  try {
    contracts.value = await fetchOptionContracts()
    isMock.value = false
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'خطای نامشخص'
    isMock.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** +1 در سود، 0 نزدیک (±۳٪)، ‎-1 بی‌پول */
function moneyness(c: OptionContractLive): 1 | 0 | -1 {
  const base = c.base_pc
  const k = c.price_strike
  if (!base || !k) return -1
  const r = c.type === 'call' ? base / k - 1 : k / base - 1
  if (r > 0.005) return 1
  if (r > -0.03) return 0
  return -1
}
function moneyLabel(row: Record<string, unknown>): string {
  const m = moneyness(row as unknown as OptionContractLive)
  return m === 1 ? 'در سود' : m === 0 ? 'نزدیک' : 'بی‌پول'
}
function moneyClass(row: Record<string, unknown>): string {
  const m = moneyness(row as unknown as OptionContractLive)
  return m === 1
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : m === 0
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      : 'bg-secondary text-muted dark:bg-secondary dark:text-muted'
}

const filtered = computed(() => {
  const needle = q.value.trim()
  return contracts.value.filter((c) => {
    if (tab.value === 'خرید' && c.type !== 'call') return false
    if (tab.value === 'فروش' && c.type !== 'put') return false
    if (onlyITM.value && moneyness(c) !== 1) return false
    if (needle && !(c.l18.includes(needle) || c.base_l18.includes(needle) || c.l30.includes(needle))) return false
    return true
  }).sort((a, b) => {
    const av = Number((a as unknown as Record<string, unknown>)[sortKey.value] ?? 0)
    const bv = Number((b as unknown as Record<string, unknown>)[sortKey.value] ?? 0)
    return bv - av
  })
})

const paged = computed(() => filtered.value.slice(0, limit.value) as unknown as Array<Record<string, unknown>>)

const stats = computed(() => {
  const oi = contracts.value.reduce((s, c) => s + (c.interest_open ?? 0), 0)
  const nv = contracts.value.reduce((s, c) => s + (c.nval ?? 0), 0)
  const calls = contracts.value.filter((c) => c.type === 'call').length
  return [
    { label: 'تعداد قراردادها', value: formatFaNumber(contracts.value.length) },
    { label: 'اختیار خرید', value: formatFaNumber(calls) },
    { label: 'مجموع موقعیت باز', value: formatFaNumber(oi) },
    { label: 'ارزش مفهومی کل', value: `${formatCompactFa(nv)} تومان` },
  ]
})

const liveCols = [
  { key: 'l18', label: 'قرارداد' },
  { key: 'base_l18', label: 'پایه' },
  { key: 'type', label: 'نوع' },
  { key: 'price_strike', label: 'اعمال', numeric: true },
  { key: 'date_end', label: 'سررسید' },
  { key: 'pc', label: 'قیمت', numeric: true },
  { key: 'pcp', label: 'تغییر٪', numeric: true },
  { key: 'interest_open', label: 'موقعیت باز', numeric: true },
  { key: 'nval', label: 'ارزش مفهومی', numeric: true },
  { key: 'money', label: 'وضعیت' },
]

// ---- mock fallback (unchanged legacy table) ----
const markets = ['همه', 'بورس', 'کالا'] as const
const tabM = ref<(typeof markets)[number]>('همه')
const mockCols = [
  { key: 'symbol', label: 'نماد اختیار' },
  { key: 'underlying', label: 'دارایی پایه' },
  { key: 'strike', label: 'اعمال', numeric: true },
  { key: 'expiryFa', label: 'سررسید' },
  { key: 'expiryDays', label: 'روز مانده', numeric: true },
  { key: 'callPrice', label: 'قیمت', numeric: true },
  { key: 'openInterest', label: 'موقعیت باز', numeric: true },
  { key: 'changePercent', label: 'تغییر٪', numeric: true },
]
const mockRows = computed(() => {
  const list = tabM.value === 'همه' ? MOCK_OPTIONS : MOCK_OPTIONS.filter((o) => o.market === tabM.value)
  return list as unknown as Array<Record<string, unknown>>
})
</script>
