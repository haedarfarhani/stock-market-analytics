import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchCommodityMarket, fetchCryptoMarket, fetchGoldCurrencyMarket, hasApiKey } from '@/services/api'
import { MOCK_COMMODITIES } from '@/data/mock'
import { nowJalali } from '@/utils/format'
import type { MarketGroup, MarketQuote, PageState } from '@/types/market'

const GROUP_OF_MOCK: Record<string, MarketGroup> = { طلا: 'gold', ارز: 'currency', رمزارز: 'crypto', کالا: 'energy' }

function mockAsQuotes(): MarketQuote[] {
  return MOCK_COMMODITIES.map((c) => ({
    symbol: c.name,
    name: c.name,
    price: c.price,
    change_value: c.change,
    change_percent: c.changePercent,
    unit: c.unit,
    date: c.updatedFa,
    group: GROUP_OF_MOCK[c.market] ?? 'energy',
  }))
}

export const useMarketQuotesStore = defineStore('quotes', () => {
  const quotes = ref<MarketQuote[]>([])
  const cryptoFull = ref<MarketQuote[]>([])
  const status = ref<PageState['status']>('idle')
  const updatedAtFa = ref<string | null>(null)
  const isMock = ref(true)
  const lastRefresh = ref(0)

  const gold = computed(() => quotes.value.filter((q) => q.group === 'gold'))
  const currency = computed(() => quotes.value.filter((q) => q.group === 'currency'))
  const cryptoLite = computed(() => quotes.value.filter((q) => q.group === 'crypto'))
  const metals = computed(() =>
    quotes.value.filter((q) => q.group === 'metal_precious' || q.group === 'metal_base'),
  )
  const energy = computed(() => quotes.value.filter((q) => q.group === 'energy'))
  /** Dashboard snapshot: 3 gold + 3 FX. */
  const snapshot = computed(() => [...gold.value.slice(0, 3), ...currency.value.slice(0, 3)])

  async function load(force = false) {
    if (status.value === 'loading') return
    if (!force && Date.now() - lastRefresh.value < 5 * 60_000 && quotes.value.length) return
    status.value = 'loading'
    try {
      if (!hasApiKey()) throw new Error('NO_API_KEY')
      const [gc, cm] = await Promise.all([fetchGoldCurrencyMarket(), fetchCommodityMarket()])
      const list: MarketQuote[] = [...gc.gold, ...gc.currency, ...gc.crypto, ...cm.precious, ...cm.base, ...cm.energy]
      if (!list.length) throw new Error('پاسخ خالی')
      quotes.value = list
      isMock.value = false
      updatedAtFa.value = nowJalali()
      lastRefresh.value = Date.now()
      status.value = 'success'
    } catch {
      if (!quotes.value.length) quotes.value = mockAsQuotes()
      isMock.value = true
      updatedAtFa.value = nowJalali()
      lastRefresh.value = Date.now()
      status.value = 'stale'
    }
  }

  /** Full 2,999-coin list on demand (crypto tab only). */
  async function loadCryptoFull() {
    if (!hasApiKey() || cryptoFull.value.length || status.value === 'loading') return
    try {
      cryptoFull.value = await fetchCryptoMarket()
    } catch {
      /* keep lite list */
    }
  }

  return { quotes, cryptoFull, gold, currency, cryptoLite, metals, energy, snapshot, status, updatedAtFa, isMock, load, loadCryptoFull }
})
