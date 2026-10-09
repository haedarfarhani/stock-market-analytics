<template>
  <div
    class="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md dark:border-line dark:bg-surface"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="truncate text-[13px] text-muted dark:text-muted">{{ subtitle }}</p>
        <h3 class="mt-0.5 truncate text-lg font-extrabold">{{ title }}</h3>
      </div>
      <slot name="badge" />
    </div>
    <p class="tnum mt-2 text-2xl font-black tracking-tight">{{ value }}</p>
    <div class="mt-1 flex items-center gap-2 text-xs">
      <ChangeBadge :value="changePercent" />
      <span class="tnum text-muted dark:text-muted">{{ sub }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import ChangeBadge from './ChangeBadge.vue'

defineProps<{
  title: string
  subtitle: string
  value: string
  changePercent: number | null
  sub?: string
}>()
</script>
