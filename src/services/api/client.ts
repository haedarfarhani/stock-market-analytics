import axios, { type AxiosInstance } from 'axios'

/**
 * Central HTTP client for BrsApi.
 *
 * Security model:
 * - API key lives in `VITE_BRSAPI_KEY` (see .env.example) and is sent as `?key=`.
 * - In production, put a backend proxy in front (see vite.config proxy + API_INTEGRATION.md)
 *   so the key never ships to browsers. `VITE_USE_PROXY=true` routes via /api/brsapi.
 *
 * Quota strategy (tight daily budgets):
 * - Memory + localStorage cache with per-endpoint TTLs.
 * - Heavy payloads (>~300KB: ticks, history, candles, crypto, TSE options)
 *   stay memory-only (`persist: false`) so localStorage quota (~5MB) is
 *   reserved for the critical datasets (symbols, indices, quotes).
 * - Stale-while-revalidate: when the network/API fails AND fresh cache is
 *   missing, the last-known (expired) snapshot is served instead of nothing,
 *   so data keeps displaying under quota errors. Callers still see `status:
 *   stale` via their own error handling.
 * - localStorage writes evict oldest BrsApi entries on QuotaExceededError.
 */

const _env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const USE_PROXY = _env.VITE_USE_PROXY === 'true'
const API_KEY = (_env.VITE_BRSAPI_KEY ?? '').trim()

export const hasApiKey = () => API_KEY.length > 0

const baseURL = USE_PROXY ? '/api/brsapi' : 'https://Api.BrsApi.ir'

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    Accept: 'application/json, text/plain, */*',
  },
})

http.interceptors.request.use((config) => {
  config.params = { ...(config.params ?? {}), ...(USE_PROXY ? {} : {}), key: API_KEY || config.params?.key }
  return config
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      if (status === 429) {
        throw new Error('سقف درخواست API به پایان رسید؛ از کش نمایش داده می‌شود.')
      }
      if (status === 401 || status === 403) {
        throw new Error('کلید API معتبر نیست. VITE_BRSAPI_KEY را بررسی کنید.')
      }
      if (!err.response) {
        throw new Error('اتصال به سرویس داده برقرار نشد؛ از کش نمایش داده می‌شود.')
      }
    }
    throw err
  },
)

// ---- quota-aware cache with stale fallback ----

export interface CacheEntry {
  ts: number
  data: unknown
}

export interface CacheOptions {
  /** persist to localStorage (default true). Heavy payloads should opt out. */
  persist?: boolean
}

const mem = new Map<string, CacheEntry>()
const PREFIX = 'brsapi:'

function storageGet(key: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

/** Quota-safe write: on overflow, drop oldest BrsApi entries and retry once. */
export function storageSet(key: string, entry: CacheEntry): void {
  const write = (): void => localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  try {
    write()
    return
  } catch {
    /* overflow — evict oldest and retry */
  }
  try {
    const keys: Array<[string, number]> = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k?.startsWith(PREFIX) || k === PREFIX + key) continue
      try {
        const e = JSON.parse(localStorage.getItem(k) ?? '') as CacheEntry
        keys.push([k, typeof e.ts === 'number' ? e.ts : 0])
      } catch {
        keys.push([k, 0])
      }
    }
    keys.sort((a, b) => a[1] - b[1])
    // evict oldest (keep at most ~half of foreign entries)
    const drop = Math.max(1, Math.ceil(keys.length / 2))
    for (const [k] of keys.slice(0, drop)) localStorage.removeItem(k)
    write()
  } catch {
    /* still full — memory cache still serves this session */
  }
}

export function readStale(key: string): CacheEntry | null {
  return mem.get(key) ?? storageGet(key)
}

export async function cachedGet<T>(
  cacheKey: string,
  url: string,
  params: Record<string, unknown>,
  ttlMs: number,
  opts: CacheOptions = {},
): Promise<T> {
  const persist = opts.persist ?? true
  const now = Date.now()
  const hit = mem.get(cacheKey)
  if (hit && now - hit.ts < ttlMs) return hit.data as T
  if (persist) {
    const stored = storageGet(cacheKey)
    if (stored && now - stored.ts < ttlMs) {
      mem.set(cacheKey, stored)
      return stored.data as T
    }
  }
  try {
    const { data } = await http.get<T>(url, { params })
    const entry: CacheEntry = { ts: now, data }
    mem.set(cacheKey, entry)
    if (persist) storageSet(cacheKey, entry)
    return data
  } catch (err) {
    // Stale-while-revalidate: serve last-known snapshot so the UI keeps
    // showing data when quota/network fails.
    const stale = mem.get(cacheKey) ?? (persist ? storageGet(cacheKey) : null)
    if (stale) {
      mem.set(cacheKey, stale)
      return stale.data as T
    }
    throw err
  }
}

export function clearBrsapiCache() {
  mem.clear()
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
