import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'dark' | 'light'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem('isa-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  // First visit: respect the OS preference (mirrors the pre-paint script).
  try {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    /* ignore */
  }
  return 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme())

  function apply(t: Theme) {
    theme.value = t
    document.documentElement.classList.toggle('dark', t === 'dark')
    try {
      localStorage.setItem('isa-theme', t)
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  // sync on init (index.html already set class pre-paint)
  apply(theme.value)

  return { theme, apply, toggle }
})
