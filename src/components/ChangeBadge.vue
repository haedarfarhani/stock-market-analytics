<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum"
    :class="changeBgClass(value)"
    :title="title"
  >
    <span aria-hidden="true">{{ arrow }}</span>
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { changeBgClass, formatFaPercent } from '@/utils/format'

const props = defineProps<{ value: number | null | undefined; title?: string }>()

const arrow = computed(() => {
  const v = props.value ?? 0
  if (v > 0) return '▲'
  if (v < 0) return '▼'
  return '■'
})
const formatted = computed(() => formatFaPercent(props.value))
</script>
