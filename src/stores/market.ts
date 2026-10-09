import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchAllSymbols, fetchMarketIndices, hasApiKey } from '@/services/api'
import { MOCK_INDICES, MOCK_SYMBOLS } from '@/data/mock'
import { nowJalali } from '@/utils/format'
import type { IndexMeta, MarketIndex, PageState, TsetmcSymbol } from '@/types/market'

export const useMarketStore = defineStore('market', () => {
  const symbols = ref<TsetmcSymbol[]>([])
  const indices = ref<MarketIndex[]>([])
  const indexMeta = ref<IndexMeta | null>(null)
  const indexIsMock = ref(true)
  const status = ref<PageState['status']>('idle')
  const error = ref<string | null>(null)
  const updatedAtFa = ref<string | null>(null)
  const isMock = ref(true)
  const query = ref('')
  const lastRefresh = ref<number>(0)

  const gainers = computed(() =>
    [...symbols.value].filter((s) => (s.pcp ?? 0) > 0).sort((a, b) => (b.pcp ?? 0) - (a.pcp ?? 0)).slice(0, 5),
  )
  const losers = computed(() =>
    [...symbols.value].filter((s) => (s.pcp ?? 0) < 0).sort((a, b) => (a.pcp ?? 0) - (b.pcp ?? 0)).slice(0, 5),
  )
  const mostTraded = computed(() =>
    [...symbols.value].sort((a, b) => (b.tval ?? 0) - (a.tval ?? 0)).slice(0, 5),
  )
  const filtered = computed(() => {
    const q = query.value.trim()
    if (!q) return symbols.value
    return symbols.value.filter((s) => s.l18.includes(q) || (s.l30 ?? '').includes(q))
  })

  async function load(force = false) {
    if (status.value === 'loading') return
    // throttle live refreshes to 45s
    if (!force && Date.now() - lastRefresh.value < 45_000 && symbols.value.length) return
    status.value = 'loading'
    error.value = null
    try {
      if (!hasApiKey()) throw new Error('NO_API_KEY')
      const [liveSymbols, liveIndex] = await Promise.all([fetchAllSymbols(1), fetchMarketIndices().catch(() => null)])
      symbols.value = liveSymbols
      if (liveIndex?.indices.length) {
        indices.value = liveIndex.indices
        indexMeta.value = liveIndex.meta
        indexIsMock.value = false
      } else if (!indices.value.length) {
        indices.value = MOCK_INDICES
        indexIsMock.value = true
      }
      isMock.value = false
      status.value = 'success'
      updatedAtFa.value = nowJalali()
      lastRefresh.value = Date.now()
    } catch (e) {
      // Graceful fallback to mock preview data
      symbols.value = MOCK_SYMBOLS
      if (!indices.value.length) indices.value = MOCK_INDICES
      isMock.value = true
      status.value = 'stale'
      updatedAtFa.value = nowJalali()
      lastRefresh.value = Date.now()
      error.value =
        e instanceof Error && e.message === 'NO_API_KEY'
          ? 'کلید API تنظیم نشده است؛ داده نمایشی (mock) نمایش داده می‌شود. برای داده زنده، VITE_BRSAPI_KEY را در فایل .env قرار دهید.'
          : e instanceof Error
            ? `دریافت داده زنده ناموفق بود؛ داده نمایشی نمایش داده می‌شود. (${e.message})`
            : 'دریافت داده زنده ناموفق بود؛ داده نمایشی نمایش داده می‌شود.'
    }
  }

  function setQuery(q: string) {
    query.value = q
  }

  return { symbols, indices, indexMeta, indexIsMock, status, error, updatedAtFa, isMock, query, gainers, losers, mostTraded, filtered, load, setQuery }
})
