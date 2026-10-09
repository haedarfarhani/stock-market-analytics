<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <MockBadge :is-mock="isMock" />
      <span v-if="!isMock" class="tnum text-[11px] text-muted">{{ formatFaNumber(total) }} اطلاعیه • صفحه {{ toFaDigits(page) }} از {{ toFaDigits(pages) }}</span>
      <span v-else class="tnum text-[11px] text-muted">{{ formatFaNumber(mockFiltered.length) }} اطلاعیه نمایشی</span>
    </div>

    <div v-if="!isMock" class="grid gap-2 md:grid-cols-4">
      <input
        v-model="symbolInput"
        @keyup.enter="applyAndReload"
        placeholder="نماد (مثلاً وبملت) — خالی = همه"
        class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand dark:border-line dark:bg-surface"
        aria-label="فیلتر نماد"
      />
      <select v-model="category" @change="applyAndReload" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="گروه اطلاعیه">
        <option :value="0">همه گروه‌ها</option>
        <option v-for="(label, id) in CODAL_CATEGORIES" :key="id" :value="Number(id)">{{ label }}</option>
      </select>
      <input
        v-model="dateStart"
        @keyup.enter="applyAndReload"
        placeholder="از تاریخ (۱۴۰۴-۰۱-۰۱)"
        class="tnum rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand dark:border-line dark:bg-surface"
        aria-label="تاریخ آغاز"
      />
      <button @click="applyAndReload" class="rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-strong">
        اعمال فیلتر
      </button>
    </div>
    <div v-else class="grid gap-2 md:grid-cols-3">
      <SearchInput v-model="q" placeholder="جستجو در عنوان، نماد یا شرکت…" />
      <select v-model="mockType" class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm dark:border-line dark:bg-surface" aria-label="نوع اطلاعیه">
        <option value="همه">همه انواع</option>
        <option v-for="t in mockTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <div class="hidden md:block" />
    </div>

    <div v-if="loading" class="space-y-2" role="status" aria-label="در حال بارگذاری">
      <div v-for="i in 5" :key="i" class="skeleton h-24 rounded-2xl" />
    </div>
    <p v-else-if="loadError" class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-300" role="alert">
      {{ loadError }}
      <button @click="reload" class="ms-2 font-bold underline">تلاش مجدد</button>
    </p>

    <div v-else class="space-y-2">
      <article
        v-for="(a, i) in visible"
        :key="`${a.symbol}-${a.date_publish}-${a.time_publish}-${i}`"
        class="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md dark:border-line dark:bg-surface"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-lg bg-brand/10 px-2 py-1 text-xs font-black text-brand ">{{ a.symbol }}</span>
          <span v-if="a.code" class="tnum rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted dark:bg-secondary dark:text-muted">{{ a.code }}</span>
          <span v-if="a.categoryLabel" class="rounded-lg bg-secondary px-2 py-1 text-[11px] font-semibold text-muted dark:bg-secondary dark:text-muted">{{ a.categoryLabel }}</span>
          <time class="tnum ms-auto text-[11px] text-muted">{{ a.date_publish ?? a.date_send }} <span v-if="a.time_publish">— {{ toFaDigits(a.time_publish) }}</span></time>
        </div>
        <h3 class="mt-2 text-sm font-bold leading-7">{{ a.title }}</h3>
        <p class="mt-0.5 text-xs text-muted">{{ a.company }}</p>
        <div v-if="!isMock" class="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
          <a v-if="a.link" :href="a.link" target="_blank" rel="noopener" class="rounded-lg bg-secondary px-2.5 py-1.5 text-ink hover:bg-secondary dark:bg-secondary dark:text-ink">متن اطلاعیه ↗</a>
          <a v-if="a.link_pdf" :href="a.link_pdf" target="_blank" rel="noopener" class="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300">PDF</a>
          <a v-if="a.link_excel" :href="a.link_excel" target="_blank" rel="noopener" class="rounded-lg bg-brand/10 px-2.5 py-1.5 text-brand hover:bg-brand/20 dark:bg-brand/10 ">Excel</a>
          <a v-if="a.link_attachment" :href="a.link_attachment" target="_blank" rel="noopener" class="rounded-lg bg-brand/10 px-2.5 py-1.5 text-brand hover:bg-brand/20 dark:bg-brand/100/10 ">پیوست</a>
        </div>
      </article>
      <div v-if="!visible.length" class="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted dark:border-line">
        📭 اطلاعیه‌ای مطابق فیلترها یافت نشد.
      </div>
    </div>

    <div v-if="!isMock && pages > 1" class="flex items-center justify-center gap-2">
      <button @click="gotoPage(page - 1)" :disabled="page <= 1" class="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold disabled:opacity-40 dark:border-line dark:bg-surface">قبلی</button>
      <span class="tnum text-xs text-muted">صفحه {{ toFaDigits(page) }} از {{ toFaDigits(pages) }}</span>
      <button @click="gotoPage(page + 1)" :disabled="page >= pages" class="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold disabled:opacity-40 dark:border-line dark:bg-surface">بعدی</button>
    </div>

    <p class="text-[11px] leading-6 text-muted">
      داده زنده از <span class="font-mono" dir="ltr">Codal/Announcement.php</span> (هر صفحه یک درخواست، کش ۵ دقیقه‌ای) با لینک مستقیم کدال.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchCodalPage, hasApiKey } from '@/services/api'
import { MOCK_CODAL } from '@/data/mock'
import { formatFaNumber, toFaDigits } from '@/utils/format'
import { CODAL_CATEGORIES, type CodalAnnouncement, type CodalCategoryId } from '@/types/market'
import SearchInput from '@/components/SearchInput.vue'
import MockBadge from '@/components/MockBadge.vue'

const items = ref<CodalAnnouncement[]>([])
const total = ref(0)
const pages = ref(0)
const page = ref(1)
const loading = ref(false)
const loadError = ref<string | null>(null)
const isMock = ref(true)

const symbolInput = ref('')
const category = ref<number>(0)
const dateStart = ref('')

async function reload() {
  if (!hasApiKey()) {
    isMock.value = true
    return
  }
  loading.value = true
  loadError.value = null
  try {
    const res = await fetchCodalPage({
      l18: symbolInput.value.trim() || undefined,
      category: (category.value || undefined) as CodalCategoryId | undefined,
      date_start: dateStart.value.trim() || undefined,
      page: page.value,
    })
    items.value = res.items
    total.value = res.total
    pages.value = res.pages
    page.value = res.page
    isMock.value = false
  } catch (e) {
    loadError.value = e instanceof Error ? `دریافت اطلاعیه‌ها ناموفق بود: ${e.message}` : 'دریافت اطلاعیه‌ها ناموفق بود.'
    isMock.value = true
  } finally {
    loading.value = false
  }
}

function applyAndReload() {
  page.value = 1
  void reload()
}
function gotoPage(p: number) {
  if (p < 1 || (pages.value && p > pages.value)) return
  page.value = p
  void reload()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  if (!hasApiKey()) {
    items.value = MOCK_CODAL
    return
  }
  void reload()
})

// ---- mock fallback ----
const q = ref('')
const mockType = ref('همه')
const mockTypes = computed(() => [...new Set(MOCK_CODAL.map((a) => a.categoryLabel ?? 'سایر'))])
const mockFiltered = computed(() =>
  MOCK_CODAL.filter((a) => {
    if (mockType.value !== 'همه' && (a.categoryLabel ?? 'سایر') !== mockType.value) return false
    const needle = q.value.trim()
    if (needle && !(a.title.includes(needle) || a.symbol.includes(needle) || a.company.includes(needle))) return false
    return true
  }),
)

const visible = computed(() => (isMock.value ? mockFiltered.value : items.value))
</script>
