import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMarketStore } from '../market.ts'
import type { TsetmcSymbol } from '@/types/market'

vi.mock('@/services/api', () => ({
  hasApiKey: (): boolean => true,
  fetchAllSymbols: vi.fn(),
  fetchMarketIndices: vi.fn(),
}))

import { fetchAllSymbols, fetchMarketIndices } from '@/services/api'

const mockFetchAll = vi.mocked(fetchAllSymbols)
const mockFetchIndices = vi.mocked(fetchMarketIndices)

function sym(l18: string): TsetmcSymbol {
  return { l18, l30: `شرکت ${l18}`, isin: 'IRO1XXX0001', id: '1' }
}

describe('market store loading', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads live symbols and clears the mock flag', async () => {
    mockFetchAll.mockResolvedValue([sym('عیار'), sym('فولاد')])
    mockFetchIndices.mockResolvedValue({ indices: [], bourse: null, ifb: null, meta: {} })
    const market = useMarketStore()
    await market.load()
    expect(market.symbols.map((s) => s.l18)).toEqual(['عیار', 'فولاد'])
    expect(market.isMock).toBe(false)
    expect(mockFetchIndices).toHaveBeenCalled()
  })

  it('skips index requests when the caller does not need them (quota saving)', async () => {
    mockFetchAll.mockResolvedValue([sym('عیار')])
    const market = useMarketStore()
    await market.load(false, { indices: false })
    expect(market.symbols).toHaveLength(1)
    expect(market.isMock).toBe(false)
    expect(mockFetchIndices).not.toHaveBeenCalled()
  })

  it('falls back to mock symbols when the API fails with no cache', async () => {
    mockFetchAll.mockRejectedValue(new Error('402'))
    const market = useMarketStore()
    await market.load()
    expect(market.isMock).toBe(true)
    expect(market.symbols.length).toBeGreaterThan(0)
    expect(market.error).toContain('نمایشی')
  })
})
