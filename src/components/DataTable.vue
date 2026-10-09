<template>
  <div
    class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm dark:border-line dark:bg-surface"
  >
    <div v-if="title || $slots.actions" class="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 dark:border-line">
      <h3 v-if="title" class="text-sm font-bold">{{ title }}</h3>
      <div class="flex items-center gap-2"><slot name="actions" /></div>
    </div>

    <div v-if="loading" class="space-y-2 p-4" role="status" aria-label="در حال بارگذاری">
      <div v-for="i in skeletonRows" :key="i" class="skeleton h-10 rounded-lg" />
    </div>

    <div v-else-if="error" class="flex flex-col items-center gap-2 px-4 py-10 text-center" role="alert">
      <p class="text-3xl" aria-hidden="true">⚠️</p>
      <p class="text-sm font-semibold">خطا در دریافت داده</p>
      <p class="max-w-md text-xs leading-6 text-muted dark:text-muted">{{ error }}</p>
      <button
        v-if="retryable"
        @click="$emit('retry')"
        class="mt-1 rounded-lg bg-brand-solid px-4 py-2 text-xs font-bold text-white hover:bg-brand-strong"
      >
        تلاش مجدد
      </button>
    </div>

    <div v-else-if="!rows.length" class="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p class="text-3xl" aria-hidden="true">📭</p>
      <p class="text-sm font-semibold">{{ emptyTitle || 'داده‌ای یافت نشد' }}</p>
      <p v-if="emptyHint" class="max-w-md text-xs leading-6 text-muted dark:text-muted">{{ emptyHint }}</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[640px] text-right text-[13px]">
        <thead>
          <tr class="border-b border-line text-xs text-muted dark:border-line dark:text-muted">
            <th
              v-for="col in columns"
              :key="col.key"
              class="whitespace-nowrap px-4 py-3 font-semibold"
              :class="[col.numeric ? 'text-left tnum' : '', col.sortable ? 'cursor-pointer select-none hover:text-ink dark:hover:text-ink' : '']"
              @click="col.sortable && $emit('sort', col.key)"
            >
              {{ col.label }}
              <span v-if="col.sortable && sortKey === col.key" aria-hidden="true">{{ sortDir === 'asc' ? ' ↑' : ' ↓' }}</span>
            </th>
            <th v-if="$slots.rowActions" class="px-4 py-3">عملیات</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="rowKey ? String(row[rowKey]) : i"
            class="border-b border-line/60 transition last:border-0 hover:bg-secondary/50 dark:border-line/60 dark:hover:bg-secondary/60"
          >
            <td v-for="col in columns" :key="col.key" class="whitespace-nowrap px-4 py-2.5" :class="col.numeric ? 'text-left tnum' : ''">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ formatCell(row[col.key], col) }}
              </slot>
            </td>
            <td v-if="$slots.rowActions" class="whitespace-nowrap px-4 py-2.5">
              <slot name="rowActions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatFaNumber } from '@/utils/format'

export interface TableColumn {
  key: string
  label: string
  numeric?: boolean
  sortable?: boolean
}

defineProps<{
  columns: TableColumn[]
  rows: Array<Record<string, unknown>>
  rowKey?: string
  loading?: boolean
  error?: string | null
  retryable?: boolean
  skeletonRows?: number
  emptyTitle?: string
  emptyHint?: string
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  title?: string
}>()

defineEmits<{ (e: 'retry'): void; (e: 'sort', key: string): void }>()

function formatCell(v: unknown, col: TableColumn): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number' && col.numeric) return formatFaNumber(v)
  return String(v)
}
</script>
