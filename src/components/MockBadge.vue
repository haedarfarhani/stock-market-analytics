<template>
  <span
    v-if="isMock"
    class="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
    title="در حال دریافت داده زنده از بازار؛ لطفاً چند لحظه صبر کنید"
  >
    <span aria-hidden="true">⏳</span> در حال بارگذاری دیتا
  </span>
  <span
    v-else
    class="inline-flex items-center gap-1 rounded-md border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand "
    title="داده زنده از سرویس BrsApi"
  >
    <span class="relative flex h-2 w-2" aria-hidden="true">
      <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60"></span>
      <span class="relative inline-flex h-2 w-2 rounded-full bg-brand"></span>
    </span>
    داده زنده
  </span>
</template>

<script setup lang="ts">
defineProps<{ isMock: boolean }>()
</script>
