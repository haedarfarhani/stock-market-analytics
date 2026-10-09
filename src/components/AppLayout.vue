<template>
  <div class="min-h-screen">
    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
      aria-hidden="true"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-line bg-surface transition-transform duration-200"
      :class="sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'"
      aria-label="ناوبری اصلی"
    >
      <div class="flex items-center gap-3 border-b border-line bg-gradient-to-l from-brand/10 to-transparent px-4 py-4">
        <div class="brand-gradient grid h-10 w-10 place-items-center rounded-xl text-lg font-black text-white shadow-lg shadow-brand/25" aria-hidden="true">◈</div>
        <div class="min-w-0">
          <p class="truncate text-sm font-black text-ink">تحلیل بازار سرمایه</p>
          <p class="text-[11px] text-muted">بورس تهران • TSETMC</p>
        </div>
        <button class="ms-auto rounded-lg p-1.5 text-muted hover:bg-secondary lg:hidden" @click="sidebarOpen = false" aria-label="بستن منو">✕</button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-3">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          @click="sidebarOpen = false"
          class="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-semibold transition"
          :class="$route.path === item.to || ($route.path.startsWith(item.to + '/') && item.to !== '/')
            ? 'border-brand/20 bg-brand/10 text-brand'
            : 'text-muted hover:border-line hover:bg-secondary hover:text-ink'"
        >
          <span class="text-base" aria-hidden="true">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="space-y-1 border-t border-line p-3 text-[11px] leading-5 text-muted">
        <p class="tnum flex items-center gap-1.5 text-sm font-extrabold text-ink" dir="ltr">🕐 {{ clock.timeFa }}</p>
        <p class="tnum">📅 {{ clock.dateFa }} • تهران</p>
        <p>آخرین به‌روزرسانی داده: <span class="tnum">{{ market.updatedAtFa ?? '—' }}</span></p>
      </div>
    </aside>

    <!-- Main column -->
    <div class="lg:ps-64">
      <header class="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
        <div class="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
          <button class="rounded-lg border border-line p-2 text-ink lg:hidden" @click="sidebarOpen = true" aria-label="باز کردن منو">☰</button>
          <div class="min-w-0">
            <h1 class="truncate text-sm font-black text-ink sm:text-base">{{ pageTitle }}</h1>
            <p class="truncate text-[11px] text-muted">{{ pageSubtitle }}</p>
          </div>
          <div class="ms-auto flex items-center gap-2">
            <div class="hidden w-64 md:block">
              <SearchInput v-model="market.query" placeholder="جستجوی نماد یا شرکت… (مثلاً فولاد)" />
            </div>
            <ThemeToggle />
            <button
              @click="market.load(true)"
              :disabled="market.status === 'loading'"
              class="rounded-xl bg-brand-solid px-3 py-2 text-xs font-bold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-strong disabled:opacity-50"
            >
              {{ market.status === 'loading' ? 'در حال به‌روزرسانی…' : '⟳ به‌روزرسانی' }}
            </button>
          </div>
        </div>
        <div class="px-4 pb-3 md:hidden">
          <SearchInput v-model="market.query" placeholder="جستجوی نماد یا شرکت…" />
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-4 py-5">
        <div v-if="market.error" class="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-6 text-amber-800 dark:text-amber-200" role="status">
          <span aria-hidden="true">⚠️</span>
          <p>{{ market.error }}</p>
        </div>
        <slot />
      </main>

      <footer class="mx-auto max-w-7xl px-4 pb-8 text-[11px] leading-6 text-muted">
        <div class="rounded-2xl border border-line bg-surface px-4 py-3">
          داده‌ها از سرویس BrsApi (TSETMC / IME / CODAL) تامین می‌شود. در صورت نبود کلید API، داده نمایشی (mock) با برچسب مشخص نمایش داده می‌شود و نباید مبنای تصمیم معاملاتی قرار گیرد. جزئیات اتصال: <span class="font-mono" dir="ltr">API_INTEGRATION.md</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { tehranNow } from '@/utils/format'
import SearchInput from '@/components/SearchInput.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const market = useMarketStore()
const route = useRoute()
const sidebarOpen = ref(false)
const clock = ref(tehranNow())
let clockTimer = 0

onMounted(() => {
  // Layout owns the sidebar timestamp, so it triggers the shared refresh
  // itself — pages showing other datasets must not leave it stale.
  void market.load()
  clockTimer = window.setInterval(() => {
    clock.value = tehranNow()
  }, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer)
})

const nav = [
  { to: '/', label: 'داشبورد', icon: '📊' },
  { to: '/stocks', label: 'سهام', icon: '📈' },
  { to: '/indices', label: 'شاخص‌ها', icon: '🧭' },
  { to: '/funds', label: 'صندوق‌ها و ETF', icon: '🧺' },
  { to: '/options', label: 'بازار آپشن', icon: '⚖️' },
  { to: '/history', label: 'سوابق معاملات', icon: '🕰️' },
  { to: '/codal', label: 'کدال', icon: '📢' },
  { to: '/commodities', label: 'طلا، ارز و کالا', icon: '🪙' },
]

const pageTitle = computed(() => (route.meta.title as string) || 'داشبورد')
const pageSubtitle = computed(() => (route.meta.subtitle as string) || '')
</script>
