<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="quotes.isMock" />
      <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-bold dark:border-line dark:bg-surface">
        <button v-for="m in tabs" :key="m" @click="selectTab(m)" class="rounded-lg px-3 py-1.5" :class="tab === m ? 'bg-brand-solid text-white' : 'text-muted'">{{ m }}</button>
      </div>
      <span v-if="quotes.updatedAtFa" class="tnum ms-auto text-[11px] text-muted">به‌روزرسانی: {{ quotes.updatedAtFa }}</span>
    </div>

    <div v-if="quotes.status === 'loading' && !current.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 8" :key="i" class="skeleton h-32 rounded-2xl" />
    </div>

    <!-- Crypto gets a table (100+ coins, dual pricing) -->
    <div v-else-if="tab === 'رمزارز'">
      <div class="mb-2">
        <SearchInput v-model="cryptoQ" placeholder="جستجوی رمزارز (بیت‌کوین، BTC…)…" />
      </div>
      <DataTable
        title="رمزارزها (برترین‌ها بر اساس ارزش بازار)"
        :columns="cryptoCols"
        :rows="cryptoRows"
        :loading="false"
        :error="null"
        empty-title="رمزارزی یافت نشد"
      >
        <template #cell-name="{ row }">
          <span class="flex items-center gap-2">
            <img v-if="row.link_icon" :src="String(row.link_icon)" alt="" class="h-6 w-6 rounded-full" loading="lazy" />
            <span class="font-bold">{{ row.name }}</span>
            <span class="text-[10px] text-muted" dir="ltr">{{ row.name_en }}</span>
          </span>
        </template>
        <template #cell-price="{ row }"><span class="tnum" dir="ltr">${{ formatFaNumber(row.price as number) }}</span></template>
        <template #cell-price_toman="{ row }"><span class="tnum">{{ formatFaNumber(row.price_toman as number) }} تومان</span></template>
        <template #cell-change_percent="{ row }"><ChangeBadge :value="row.change_percent as number" /></template>
        <template #cell-market_cap="{ row }"><span class="tnum" dir="ltr">${{ formatCompactFa(row.market_cap as number) }}</span></template>
      </DataTable>
      <p class="tnum mt-2 text-[11px] text-muted">نمایش {{ formatFaNumber(cryptoRows.length) }} مورد از {{ formatFaNumber(cryptoSource.length) }} رمزارز</p>
    </div>

    <!-- IME futures -->
    <div v-else-if="tab === 'آتی کالا'">
      <DataTable
        title="قراردادهای آتی بورس کالا"
        :columns="futCols"
        :rows="futures as unknown as Array<Record<string, unknown>>"
        row-key="contract_code"
        :loading="futuresLoading"
        :error="futuresError"
        retryable
        @retry="() => { futuresError = null; void loadFutures() }"
        empty-title="قرارداد آتی یافت نشد"
      >
        <template #cell-contract_code="{ row }"><span class="font-bold" dir="ltr">{{ row.contract_code }}</span></template>
        <template #cell-date_end="{ row }">
          <span class="tnum">{{ row.date_end ? formatJalaliDate(row.date_end as string) : (row.date_end_text ?? '—') }}</span>
          <span v-if="row.day_remain != null" class="tnum block text-[10px] text-muted">{{ toFaDigits(row.day_remain as number) }} روز مانده</span>
        </template>
        <template #cell-pl="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.pl as number) }}</span></template>
        <template #cell-plp="{ row }"><ChangeBadge :value="row.plp as number" /></template>
        <template #cell-pls="{ row }"><span class="tnum">{{ formatFaNumber(row.pls as number) }}</span></template>
        <template #cell-interest_open="{ row }"><span class="tnum">{{ formatFaNumber(row.interest_open as number) }}</span></template>
        <template #cell-tval="{ row }"><span class="tnum">{{ formatCompactFa((row.tval as number) * 1000) }}</span></template>
        <template #cell-margin_initial="{ row }"><span class="tnum">{{ formatCompactFa(row.margin_initial as number) }}</span></template>
      </DataTable>
      <p class="mt-2 text-[11px] leading-6 text-muted">ارزش معاملات با واحد «هزار ریال» به تومان تبدیل شده است.</p>
    </div>

    <!-- IME certificates -->
    <div v-else-if="tab === 'گواهی سپرده'">
      <DataTable
        title="گواهی سپرده کالایی"
        :columns="certCols"
        :rows="certs as unknown as Array<Record<string, unknown>>"
        row-key="contract_code"
        :loading="certsLoading"
        :error="certsError"
        retryable
        @retry="() => { certsError = null; void loadCerts() }"
        empty-title="گواهی‌ای یافت نشد"
      >
        <template #cell-contract_code="{ row }"><span class="font-bold" dir="ltr">{{ row.contract_code }}</span></template>
        <template #cell-pl="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.pl as number) }}</span></template>
        <template #cell-plp="{ row }"><ChangeBadge :value="row.plp as number" /></template>
        <template #cell-tval="{ row }"><span class="tnum">{{ formatCompactFa((row.tval as number) * 1000) }}</span></template>
      </DataTable>
      <p class="mt-2 text-[11px] leading-6 text-muted">ارزش معاملات با واحد «هزار ریال» به تومان تبدیل شده است.</p>
    </div>

    <!-- IME physical trades -->
    <div v-else-if="tab === 'فیزیکی'">
      <div class="mb-2 grid gap-2 md:grid-cols-3">
        <input
          v-model="physStart"
          @keyup.enter="applyPhysDates"
          placeholder="از تاریخ (۱۴۰۵-۰۷-۱۵) — خالی = امروز"
          class="tnum rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand dark:border-line dark:bg-surface"
          aria-label="تاریخ آغاز"
        />
        <input
          v-model="physEnd"
          @keyup.enter="applyPhysDates"
          placeholder="تا تاریخ — خالی = امروز"
          class="tnum rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand dark:border-line dark:bg-surface"
          aria-label="تاریخ پایان"
        />
        <button @click="applyPhysDates" class="rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong">
          دریافت آمار
        </button>
      </div>
      <DataTable
        title="آمار معاملات فیزیکی بورس کالا"
        :columns="physCols"
        :rows="phys.slice(0, physLimit) as unknown as Array<Record<string, unknown>>"
        row-key="l18"
        :loading="physLoading"
        :error="physError"
        retryable
        @retry="() => { physError = null; void loadPhys() }"
        :empty-title="physNoData ? 'در این بازه معامله‌ای ثبت نشده (روز تعطیل)' : 'داده‌ای دریافت نشد'"
        empty-hint="بازه‌ای که شامل روز معاملاتی باشد انتخاب کنید."
      >
        <template #actions>
          <span v-if="phys.length" class="tnum text-[11px] text-muted">{{ formatFaNumber(phys.length) }} معامله • ارزش کل: {{ formatCompactFa(physTotal) }} تومان</span>
        </template>
        <template #cell-date_trade="{ row }"><span class="tnum">{{ toFaDigits(String(row.date_trade ?? '—')) }}</span></template>
        <template #cell-pl="{ row }"><span class="tnum font-bold">{{ formatFaNumber(row.pl as number) }}</span></template>
        <template #cell-tval="{ row }"><span class="tnum">{{ formatCompactFa((row.tval as number) * 1000) }}</span></template>
      </DataTable>
      <div v-if="phys.length > physLimit" class="mt-2 text-center">
        <button @click="physLimit += 50" class="rounded-xl border border-line bg-surface px-5 py-2 text-xs font-bold dark:border-line dark:bg-surface">
          نمایش بیشتر ({{ formatFaNumber(phys.length - physLimit) }} مورد)
        </button>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="c in current" :key="`${c.group}-${c.symbol}`" class="rounded-2xl border border-line bg-surface p-4 shadow-sm dark:border-line dark:bg-surface">
        <p class="text-[11px] text-muted">{{ groupLabel(c.group) }} • واحد: {{ c.unit ?? '—' }}</p>
        <h3 class="mt-0.5 text-sm font-extrabold">{{ c.name }} <span v-if="c.name_en" class="text-[10px] font-normal text-muted" dir="ltr">{{ c.name_en }}</span></h3>
        <p class="tnum mt-2 text-xl font-black">{{ formatFaNumber(c.price) }}</p>
        <div class="mt-1"><ChangeBadge :value="c.change_percent" /></div>
        <p v-if="c.date || c.time" class="tnum mt-1 text-[10px] text-muted">{{ toFaDigits(c.date ?? '') }} {{ toFaDigits(c.time ?? '') }}</p>
      </div>
      <div v-if="!current.length" class="col-span-full rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted dark:border-line">
        📭 موردی در این گروه نیست.
      </div>
    </div>

    <p class="text-[11px] leading-6 text-muted">
      داده زنده از <span class="font-mono" dir="ltr">Market/Gold_Currency</span> (طلا/ارز/۱۹ رمزارز)،
      <span class="font-mono" dir="ltr">Market/Commodity</span> (۱۴ کامودیتی)،
      <span class="font-mono" dir="ltr">Market/Cryptocurrency</span> (۲٬۹۹۹ رمزارز، کش ۵ دقیقه‌ای)،
      آتی و گواهی و صندوق کالایی و معاملات فیزیکی از
      <span class="font-mono" dir="ltr">Ime/Futures, Certificate, Fund, Physical</span>.
      آپشن کالا در صفحه آپشن است.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMarketQuotesStore } from '@/stores/quotes'
import { fetchImeCertificates, fetchImeFutures, fetchImePhysical, hasApiKey } from '@/services/api'
import type { ImeCertificate, ImeFuture, ImePhysicalTrade } from '@/types/market'
import { formatCompactFa, formatFaNumber, formatJalaliDate, toFaDigits } from '@/utils/format'
import ChangeBadge from '@/components/ChangeBadge.vue'
import DataTable from '@/components/DataTable.vue'
import MockBadge from '@/components/MockBadge.vue'
import SearchInput from '@/components/SearchInput.vue'

const quotes = useMarketQuotesStore()
onMounted(async () => {
  await quotes.load()
  if (!quotes.isMock) await quotes.loadCryptoFull()
})

const tabs = ['طلا', 'ارز', 'رمزارز', 'فلزات و انرژی', 'آتی کالا', 'گواهی سپرده', 'فیزیکی'] as const
const tab = ref<(typeof tabs)[number]>('طلا')
const cryptoQ = ref('')

const futures = ref<ImeFuture[]>([])
const futuresLoading = ref(false)
const futuresError = ref<string | null>(null)
const certs = ref<ImeCertificate[]>([])
const certsLoading = ref(false)
const certsError = ref<string | null>(null)
const phys = ref<ImePhysicalTrade[]>([])
const physLoading = ref(false)
const physError = ref<string | null>(null)
const physNoData = ref(false)
const physStart = ref('')
const physEnd = ref('')
const physLimit = ref(50)

async function loadFutures() {
  if (!hasApiKey() || futures.value.length || futuresLoading.value) return
  futuresLoading.value = true
  futuresError.value = null
  try {
    futures.value = await fetchImeFutures()
  } catch (e) {
    futuresError.value = e instanceof Error ? e.message : 'خطای نامشخص'
  } finally {
    futuresLoading.value = false
  }
}

async function loadCerts() {
  if (!hasApiKey() || certs.value.length || certsLoading.value) return
  certsLoading.value = true
  certsError.value = null
  try {
    certs.value = await fetchImeCertificates()
  } catch (e) {
    certsError.value = e instanceof Error ? e.message : 'خطای نامشخص'
  } finally {
    certsLoading.value = false
  }
}

function selectTab(m: (typeof tabs)[number]) {
  tab.value = m
  if (m === 'آتی کالا') void loadFutures()
  if (m === 'گواهی سپرده') void loadCerts()
  if (m === 'فیزیکی') void loadPhys()
}

async function loadPhys() {
  if (!hasApiKey() || physLoading.value) return
  physLoading.value = true
  physError.value = null
  try {
    const res = await fetchImePhysical(physStart.value.trim() || undefined, physEnd.value.trim() || undefined)
    phys.value = res.trades
    physNoData.value = res.noData
    physLimit.value = 50
  } catch (e) {
    physError.value = e instanceof Error ? e.message : 'خطای نامشخص'
  } finally {
    physLoading.value = false
  }
}

function applyPhysDates() {
  phys.value = []
  physNoData.value = false
  physError.value = null
  void loadPhys()
}

const physTotal = computed(() => phys.value.reduce((s, t) => s + (t.tval ?? 0), 0) * 1000)

function groupLabel(g: unknown): string {
  const map: Record<string, string> = {
    gold: 'طلا و سکه', currency: 'ارز', crypto: 'رمزارز',
    metal_precious: 'فلز گرانبها', metal_base: 'فلز اساسی', energy: 'انرژی',
  }
  return map[String(g)] ?? String(g)
}

const current = computed(() => {
  if (tab.value === 'طلا') return quotes.gold
  if (tab.value === 'ارز') return quotes.currency
  return [...quotes.metals, ...quotes.energy]
})

const cryptoSource = computed(() =>
  quotes.cryptoFull.length ? quotes.cryptoFull : quotes.cryptoLite,
)
const cryptoRows = computed(() => {
  const needle = cryptoQ.value.trim().toLowerCase()
  const list = needle
    ? cryptoSource.value.filter(
        (c) => c.name.includes(cryptoQ.value.trim()) || (c.name_en ?? '').toLowerCase().includes(needle) || c.symbol.toLowerCase().includes(needle),
      )
    : cryptoSource.value
  return list.slice(0, 100) as unknown as Array<Record<string, unknown>>
})

const cryptoCols = [
  { key: 'name', label: 'رمزارز' },
  { key: 'price', label: 'قیمت (دلار)', numeric: true },
  { key: 'price_toman', label: 'قیمت (تومان)', numeric: true },
  { key: 'change_percent', label: 'تغییر٪', numeric: true },
  { key: 'market_cap', label: 'ارزش بازار', numeric: true },
]

const futCols = [
  { key: 'contract_code', label: 'قرارداد' },
  { key: 'contract_description', label: 'شرح' },
  { key: 'date_end', label: 'سررسید' },
  { key: 'pl', label: 'آخرین', numeric: true },
  { key: 'plp', label: 'تغییر٪', numeric: true },
  { key: 'pls', label: 'تسویه لحظه‌ای', numeric: true },
  { key: 'interest_open', label: 'موقعیت باز', numeric: true },
  { key: 'tvol', label: 'حجم', numeric: true },
  { key: 'tval', label: 'ارزش (تومان)', numeric: true },
  { key: 'margin_initial', label: 'تضمین اولیه', numeric: true },
]

const certCols = [
  { key: 'commodity', label: 'کالا' },
  { key: 'contract_code', label: 'قرارداد' },
  { key: 'contract_description', label: 'شرح' },
  { key: 'pl', label: 'آخرین', numeric: true },
  { key: 'plp', label: 'تغییر٪', numeric: true },
  { key: 'pmax', label: 'سقف', numeric: true },
  { key: 'pmin', label: 'کف', numeric: true },
  { key: 'py', label: 'پایانی دیروز', numeric: true },
  { key: 'tvol', label: 'حجم', numeric: true },
  { key: 'tval', label: 'ارزش (تومان)', numeric: true },
]

const physCols = [
  { key: 'l18', label: 'نماد' },
  { key: 'l30', label: 'کالا' },
  { key: 'market_hall', label: 'تالار' },
  { key: 'producer', label: 'تولیدکننده' },
  { key: 'type_contract', label: 'قرارداد' },
  { key: 'date_trade', label: 'تاریخ' },
  { key: 'pl', label: 'قیمت', numeric: true },
  { key: 'volume_contract', label: 'حجم قرارداد', numeric: true },
  { key: 'demand', label: 'تقاضا', numeric: true },
  { key: 'tval', label: 'ارزش (تومان)', numeric: true },
]
</script>
