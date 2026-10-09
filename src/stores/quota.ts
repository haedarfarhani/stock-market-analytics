import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Global API quota state. Set by the HTTP layer on 402/429 so every page
 * can show one consistent banner — cached data underneath keeps working.
 */
export const useQuotaStore = defineStore('quota', () => {
  const limited = ref(false)
  const message = ref('')
  const hits = ref(0)
  const updatedAtFa = ref<string | null>(null)

  function stamp(): string {
    try {
      return new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  function markLimited(msg: string): void {
    limited.value = true
    message.value = msg
    hits.value += 1
    updatedAtFa.value = stamp()
  }

  function dismiss(): void {
    limited.value = false
    message.value = ''
  }

  return { limited, message, hits, updatedAtFa, markLimited, dismiss }
})
