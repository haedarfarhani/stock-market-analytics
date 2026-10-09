import { defineStore } from 'pinia'
import { ref } from 'vue'

const KEY = 'isa-watchlist'

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return ['فولاد', 'شتران', 'اهرم']
}

export const useWatchlistStore = defineStore('watchlist', () => {
  const items = ref<string[]>(load())

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items.value))
    } catch {
      /* ignore */
    }
  }
  function toggle(symbol: string) {
    const i = items.value.indexOf(symbol)
    if (i >= 0) items.value.splice(i, 1)
    else items.value.push(symbol)
    persist()
  }
  function has(symbol: string) {
    return items.value.includes(symbol)
  }
  return { items, toggle, has }
})
