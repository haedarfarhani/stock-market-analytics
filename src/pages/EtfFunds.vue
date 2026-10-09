<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="isMock" />
      <span class="tnum text-[11px] text-muted">{{ formatFaNumber(filtered.length) }} صندوق</span>
      <span v-if="!isMock" class="text-[11px] text-muted">• NAV هر صندوق با دکمه «دریافت» (سهمیه محدود API، کش ۲ دقیقه‌ای)</span>
    </div>

    <div class="grid gap-2 md:grid-cols-3">
      <SearchInput v-model="q" placeholder="جستجوی نماد یا نام صندوق…" />
      <select v-model="sortKey" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="مرتب‌سازی">
        <option value="value">مرتب‌سازی: ارزش معاملات</option>
        <option value="changePercent">مرتب‌سازی: درصد تغییر</option>
        <option value="volume">مرتب‌سازی: حجم</option>
        <option value="premium">مرتب‌سازی: حباب (NAV دریافت‌شده)</option>
      </select>
      <select v-model="sortDir" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="جهت مرتب‌سازی">
        <option value="desc">نزولی</option>
        <option value="asc">صعودی</option>
      </select>
    </div>

    <DataTable
      title="صندوق‌ها و ETF"
      :columns="cols"
      :rows="paged"
      row-key="symbol"
      :loading="market.status === 'loading' && !paged.length"
      :error="null"
      empty-title="صندوقی یافت نشد"
      empty-hint="عبارت جستجو را تغییر دهید."
    >
      <template #cell-symbol="{ row }">
        <span class="font-bold">{{ row.symbol }}</span>
      </template>
      <template #cell-price="{ row }"><span class="tnum">{{ formatFaNumber(row.price as number) }}</span></template>
      <template #cell-changePercent="{ row }"><ChangeBadge :value="row.changePercent as number" /></template>
      <template #cell-volume="{ row }"><span class="tnum">{{ formatCompactFa(row.volume as number) }}</span></template>
      <template #cell-nav="{ row }">
        <span v-if="navOf(String(row.symbol))" class="tnum">
          {{ formatFaNumber(navOf(String(row.symbol))!.predtran) }}
          <span class="block text-[10px] font-normal text-muted">ابطال • {{ toFaDigits(navOf(String(row.symbol))!.time ?? '') }}</span>
        </span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #cell-premium="{ row }">
        <span v-if="premiumOf(row) != null" :class="premiumClass(premiumOf(row)!)" class="tnum rounded-full px-2 py-0.5 text-xs font-bold">
          {{ formatFaPercent(premiumOf(row), 2) }} {{ premiumOf(row)! >= 0 ? 'حباب' : 'تخفیف' }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
      <template #rowActions="{ row }">
        <button
          v-if="!isMock"
          @click="loadNav(String(row.symbol))"
          :disabled="loadingNav.has(String(row.symbol)) || !!navOf(String(row.symbol))"
          class="rounded-lg bg-brand-solid px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-strong disabled:opacity-40"
          :title="navError[String(row.symbol)] ?? 'دریافت NAV صدور/ابطال'"
        >
          {{ loadingNav.has(String(row.symbol)) ? '…' : navOf(String(row.symbol)) ? '✓' : 'دریافت NAV' }}
        </button>
        <span v-else class="text-[10px] text-muted" title="در حالت نمایشی، NAV زنده در دسترس نیست">mock</span>
      </template>
    </DataTable>
    <p v-if="navErrorText" class="text-xs text-rose-600 dark:text-rose-400" role="alert">{{ navErrorText }}</p>

    <div v-if="filtered.length > limit" class="text-center">
      <button @click="limit += 100" class="rounded-xl border border-line bg-surface px-5 py-2 text-xs font-bold dark:border-line dark:bg-surface">
        نمایش بیشتر ({{ formatFaNumber(filtered.length - limit) }} مورد باقی‌مانده)
      </button>
    </div>

    <p class="text-[11px] leading-6 text-muted">
      حباب = اختلاف قیمت تابلو با <strong>NAV ابطال</strong>. اندپوینت NAV نسخه bulk ندارد
      (<span class="font-mono" dir="ltr">Nav.php?l18=…</span>)؛ هر صندوق یک درخواست جدا مصرف می‌کند، پس NAV فقط
      با دکمه و با کش دریافت می‌شود. در حالت نمایشی از داده نمونه استفاده می‌شود.
    </p>

    <!-- IME commodity funds -->
    <div v-if="!isMock" class="overflow-hidden rounded-2xl border border-line bg-surface dark:border-line dark:bg-surface">
      <div class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 dark:border-line">
        <h3 class="text-sm font-bold">صندوق‌های کالایی بورس کالا</h3>
        <span v-if="imeFunds.length" class="tnum text-[11px] text-muted">{{ formatFaNumber(imeFunds.length) }} نماد فعال</span>
        <button
          v-if="!imeFunds.length && !imeLoading"
          @click="loadImeFunds"
          class="ms-auto rounded-xl bg-brand-solid px-4 py-1.5 text-[11px] font-bold text-white shadow-sm shadow-brand/25 hover:bg-brand-strong"
        >
          نمایش (یک درخواست)
        </button>
      </div>
      <div v-if="imeLoading" class="space-y-2 p-4" role="status" aria-label="در حال بارگذاری صندوق‌های کالایی">
        <div v-for="i in 4" :key="i" class="skeleton h-9 rounded-lg" />
      </div>
      <p v-else-if="imeError" class="px-4 py-6 text-center text-xs text-rose-600 dark:text-rose-400" role="alert">
        {{ imeError }} <button @click="loadImeFunds" class="font-bold underline">تلاش مجدد</button>
      </p>
      <div v-else-if="imeFunds.length" class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-right text-[13px]">
          <thead>
            <tr class="border-b border-line text-xs text-muted dark:border-line dark:text-muted">
              <th class="px-4 py-3 font-semibold">نماد</th>
              <th class="px-4 py-3 font-semibold">صندوق</th>
              <th class="px-4 py-3 font-semibold text-left tnum">قیمت</th>
              <th class="px-4 py-3 font-semibold">تغییر٪</th>
              <th class="px-4 py-3 font-semibold text-left tnum">حجم</th>
              <th class="px-4 py-3 font-semibold text-left tnum">ارزش</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in imeFunds.slice(0, imeLimit)" :key="f.l18" class="border-b border-line/60 last:border-0 dark:border-line/60">
              <td class="whitespace-nowrap px-4 py-2.5 font-bold">{{ f.l18 }}</td>
              <td class="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{{ f.l30 }}</td>
              <td class="tnum whitespace-nowrap px-4 py-2.5 text-left font-bold">{{ formatFaNumber(f.pc) }}</td>
              <td class="whitespace-nowrap px-4 py-2.5"><ChangeBadge :value="f.pcp" /></td>
              <td class="tnum whitespace-nowrap px-4 py-2.5 text-left">{{ formatCompactFa(f.tvol) }}</td>
              <td class="tnum whitespace-nowrap px-4 py-2.5 text-left">{{ formatCompactFa(f.tval) }} تومان</td>
            </tr>
          </tbody>
        </table>
        <div v-if="imeFunds.length > imeLimit" class="p-3 text-center">
          <button @click="imeLimit += 30" class="rounded-xl border border-line px-5 py-2 text-xs font-bold dark:border-line">
            نمایش بیشتر ({{ formatFaNumber(imeFunds.length - imeLimit) }} مورد)
          </button>
        </div>
      </div>
      <p v-else class="px-4 py-6 text-center text-xs text-muted">برای حفظ سهمیه API، صندوق‌های کالایی فقط با دکمه بارگذاری می‌شوند.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useMarketStore } from '@/stores/market'
import { fetchFundNav, fetchImeFunds } from '@/services/api'
import { MOCK_FUNDS } from '@/data/mock'
import { formatCompactFa, formatFaNumber, formatFaPercent, toFaDigits } from '@/utils/format'
import type { FundNav, TsetmcSymbol } from '@/types/market'
import DataTable from '@/components/DataTable.vue'
import SearchInput from '@/components/SearchInput.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'
import MockBadge from '@/components/MockBadge.vue'

interface FundRow extends Record<string, unknown> {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  value: number
}

const market = useMarketStore()
onMounted(() => market.load())

const q = ref('')
const sortKey = ref('value')
const sortDir = ref<'asc' | 'desc'>('desc')
const limit = ref(100)
const navCache = reactive<Record<string, FundNav>>({})
const navError = reactive<Record<string, string>>({})
const loadingNav = reactive<Set<string>>(new Set())
const navErrorText = ref('')
const imeFunds = ref<TsetmcSymbol[]>([])
const imeLoading = ref(false)
const imeError = ref<string | null>(null)
const imeLimit = ref(30)

async function loadImeFunds() {
  if (imeLoading.value || imeFunds.value.length) return
  imeLoading.value = true
  imeError.value = null
  try {
    imeFunds.value = await fetchImeFunds()
  } catch (e) {
    imeError.value = e instanceof Error ? `دریافت صندوق‌های کالایی ناموفق بود: ${e.message}` : 'دریافت صندوق‌های کالایی ناموفق بود.'
  } finally {
    imeLoading.value = false
  }
}

const isMock = computed(() => market.isMock || market.symbols.length === 0)

/** Exact TSETMC industry group for tradable funds (438 live). NOT «بیمه و صندوق بازنشستگی». */
const FUND_CS = 'صندوق سرمایه‌گذاری قابل معامله'

/** 438 live ETFs carry cs = «صندوق سرمایه‌گذاری قابل معامله». */
const allFunds = computed<FundRow[]>(() => {
  if (!isMock.value) {
    return market.symbols
      .filter((s) => s.cs === FUND_CS)
      .map((s) => ({
        symbol: s.l18,
        name: s.l30,
        price: s.pc ?? s.pl ?? 0,
        changePercent: s.pcp ?? 0,
        volume: s.tvol ?? 0,
        value: s.tval ?? 0,
      }))
  }
  return MOCK_FUNDS.map((f) => ({
    symbol: f.symbol,
    name: f.name,
    price: f.price,
    changePercent: f.changePercent,
    volume: f.volume ?? 0,
    value: (f.volume ?? 0) * f.price,
  }))
})

const filtered = computed(() => {
  const needle = q.value.trim()
  let list = needle
    ? allFunds.value.filter((f) => f.symbol.includes(needle) || f.name.includes(needle))
    : [...allFunds.value]
  list.sort((a, b) => {
    let av: number
    let bv: number
    if (sortKey.value === 'premium') {
      av = premiumOf(a) ?? Number.NEGATIVE_INFINITY
      bv = premiumOf(b) ?? Number.NEGATIVE_INFINITY
    } else {
      av = (a[sortKey.value] as number) ?? 0
      bv = (b[sortKey.value] as number) ?? 0
    }
    return sortDir.value === 'asc' ? av - bv : bv - av
  })
  return list
})

const paged = computed(() => filtered.value.slice(0, limit.value) as unknown as Array<Record<string, unknown>>)

function navOf(symbol: string): FundNav | undefined {
  return navCache[symbol]
}

function premiumOf(row: FundRow | Record<string, unknown>): number | null {
  const nav = navCache[String(row.symbol)]
  const price = Number(row.price)
  if (!nav || !nav.predtran || !price) return null
  return Math.round(((price - nav.predtran) / nav.predtran) * 10000) / 100
}

function premiumClass(p: number): string {
  // حباب مثبت (گران‌تر از NAV) = قرمز؛ تخفیف = سبز
  return p >= 0
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
}

async function loadNav(symbol: string) {
  if (navCache[symbol] || loadingNav.has(symbol) || isMock.value) return
  loadingNav.add(symbol)
  navErrorText.value = ''
  try {
    navCache[symbol] = await fetchFundNav(symbol)
    delete navError[symbol]
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'خطای نامشخص'
    navError[symbol] = msg
    navErrorText.value = `دریافت NAV «${symbol}» ناموفق بود: ${msg}`
  } finally {
    loadingNav.delete(symbol)
  }
}

const cols = [
  { key: 'symbol', label: 'نماد' },
  { key: 'name', label: 'صندوق' },
  { key: 'price', label: 'قیمت تابلو', numeric: true },
  { key: 'changePercent', label: 'تغییر٪', numeric: true },
  { key: 'volume', label: 'حجم', numeric: true },
  { key: 'nav', label: 'NAV ابطال', numeric: true },
  { key: 'premium', label: 'حباب/تخفیف', numeric: true },
]
</script>
