import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compactCandles, expandCandles, fetchDataset, loadDatasetCache, saveDatasetCache } from '../data.ts'
import type { DailyCandle } from '@/types/market'
import type { WorkspaceCandle } from '../types.ts'

vi.mock('@/services/api/tsetmc.ts', () => ({
  fetchDailyCandles: vi.fn(),
  fetchIntradayCandles: vi.fn(),
}))

import { fetchDailyCandles } from '@/services/api/tsetmc.ts'

const mockFetchDaily = vi.mocked(fetchDailyCandles)

// Newest-first Jalali rows, like the real Candlestick.php payload.
function rows(): DailyCandle[] {
  return [
    { date: '1403-01-05', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    { date: '1403-01-04', open: 98, high: 102, low: 94, close: 100, volume: 900 },
  ]
}

function candles(): WorkspaceCandle[] {
  return [
    { time: '2024-03-20', open: 100, high: 110, low: 95, close: 105, volume: 1000 },
    { time: 1710936000, open: 98, high: 102, low: 94, close: 100 },
  ]
}

describe('compact/expand candle cache', () => {
  it('round-trips candles through compact tuples', () => {
    expect(expandCandles(compactCandles(candles()))).toEqual(candles())
  })

  it('drops invalid rows instead of caching junk', () => {
    const dirty: WorkspaceCandle[] = [
      ...candles(),
      { time: '2024-03-21', open: Number.NaN, high: 1, low: 1, close: 1 },
      { time: '', open: 1, high: 1, low: 1, close: 1 },
    ]
    expect(compactCandles(dirty)).toHaveLength(2)
    expect(expandCandles([['x'], [1, 2], null, 'junk'])).toEqual([])
  })
})

describe('persistent dataset cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('saves and reloads a dataset, flagged stale', () => {
    saveDatasetCache('SYM-A', 'adjusted', { candles: candles(), source: 'candlestick-adjusted', fetchedAt: 123 })
    const loaded = loadDatasetCache('SYM-A', 'adjusted')
    expect(loaded?.candles).toEqual(candles())
    expect(loaded?.stale).toBe(true)
    expect(loaded?.source).toBe('candlestick-adjusted')
  })

  it('isolates symbols and candle sets', () => {
    saveDatasetCache('SYM-A', 'adjusted', { candles: candles(), source: 's', fetchedAt: 1 })
    expect(loadDatasetCache('SYM-A', 'unadjusted')).toBeNull()
    expect(loadDatasetCache('SYM-B', 'adjusted')).toBeNull()
  })

  it('ignores corrupt or foreign entries', () => {
    localStorage.setItem('isa-candles-v1:adjusted:SYM-X', 'not-json{')
    localStorage.setItem('isa-candles-v1:adjusted:SYM-Y', JSON.stringify({ version: 999, candles: [] }))
    expect(loadDatasetCache('SYM-X', 'adjusted')).toBeNull()
    expect(loadDatasetCache('SYM-Y', 'adjusted')).toBeNull()
  })
})

describe('fetchDataset real-first with cache fallback', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('returns live candles on success and persists them', async () => {
    mockFetchDaily.mockResolvedValue(rows())
    const ds = await fetchDataset('SYM-LIVE', 'adjusted', '1403-01-05')
    expect(ds.candles).toHaveLength(2)
    expect(ds.stale).toBeUndefined()
    // newest-first input -> oldest-first output, Gregorian axis
    // 1403-01-04 Jalali == 2024-03-23 Gregorian
    expect(ds.candles[0]?.time).toBe('2024-03-23')
    const cached = loadDatasetCache('SYM-LIVE', 'adjusted')
    expect(cached?.candles).toHaveLength(2)
    expect(cached?.stale).toBe(true)
  })

  it('serves the persisted real dataset when the API is limited/failing', async () => {
    saveDatasetCache('SYM-Q', 'adjusted', { candles: candles(), source: 'candlestick-adjusted', fetchedAt: 456 })
    mockFetchDaily.mockRejectedValue(new Error('سقف مصرف روزانه API تمام شد'))
    const ds = await fetchDataset('SYM-Q', 'adjusted', '1403-01-05')
    expect(ds.candles).toEqual(candles())
    expect(ds.stale).toBe(true)
  })

  it('returns empty (mock fallback downstream) only when nothing was ever cached', async () => {
    mockFetchDaily.mockRejectedValue(new Error('402'))
    const ds = await fetchDataset('SYM-NEW', 'adjusted', '1403-01-05')
    expect(ds.candles).toEqual([])
    expect(ds.stale).toBeUndefined()
  })
})
