<template>
  <div class="relative">
    <span class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">⌕</span>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      type="search"
      :placeholder="placeholder"
      class="w-full rounded-xl border border-line bg-surface py-2.5 pe-4 ps-9 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-line dark:bg-surface dark:placeholder:text-muted"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string; placeholder?: string }>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
