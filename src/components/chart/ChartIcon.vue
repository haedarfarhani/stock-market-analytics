<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="paths[name] ?? ''"
  />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number; stroke?: number }>(), { size: 22, stroke: 1.8 })

const paths: Record<string, string> = {
  candle:
    '<path d="M7 4v3M7 17v3M5 7h4v10H5zM17 2v4M17 18v4M15 6h4v12h-4z"/>',
  bars: '<path d="M6 4v16M4 8h4M4 15h4M13 6v12M11 9h4M11 16h4M20 3v18M18 10h4M18 17h4"/>',
  line: '<path d="M3 17l5-6 4 3 6-9"/><circle cx="20" cy="5" r="1.4" fill="currentColor" stroke="none"/>',
  area: '<path d="M3 17l5-6 4 3 6-9V3H3z" fill="currentColor" opacity="0.25" stroke="none"/><path d="M3 17l5-6 4 3 6-9"/>',
  baseline:
    '<path d="M3 12h18" stroke-dasharray="3 3"/><path d="M3 16l4-3 3 2 4-6 3 2 4-5"/>',
  cursor: '<path d="M6 3l14 7-6 2-3 6z"/>',
  trend: '<path d="M3 20L19 6"/><path d="M13 6h6v6"/>',
  ray: '<path d="M3 17L21 7"/><path d="M17 7h4v4"/>',
  hline: '<path d="M2 12h20"/><path d="M5 9l-3 3 3 3M19 9l3 3-3 3"/>',
  vline: '<path d="M12 2v20"/><path d="M9 5l3-3 3 3M9 19l3 3 3-3"/>',
  channel: '<path d="M2 17L22 7"/><path d="M2 21l20-10"/>',
  rect: '<rect x="4" y="7" width="16" height="10" rx="1.5"/>',
  pricerange: '<path d="M4 5v14M4 5h4M4 19h4M4 12h9"/><path d="M15 9l6 3-6 3z" fill="currentColor" opacity="0.3"/>',
  timerange: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  fib: '<path d="M4 19c0-6 4-6 4-10a4 4 0 018 0c0 5-5 4-5 9"/><path d="M3 5h8M3 10h5M11 15h8M14 20h7"/>',
  fibext: '<path d="M4 18L16 6"/><path d="M11 6h5v5"/><path d="M4 13h6M4 9h3M13 17l5 5"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  arrow: '<path d="M4 19L19 6"/><path d="M11 6h8v8"/>',
  brush: '<path d="M15 4l5 5L9 20l-5 1 1-5z"/><path d="M13 6l5 5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.8-1.3"/>',
  eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  eyeoff:
    '<path d="M4 4l16 16"/><path d="M9.9 5.9A10.6 10.6 0 0112 5.5c6.5 0 10 6.5 10 6.5a17 17 0 01-3.3 3.9M6 7A16 16 0 002 12s3.5 6.5 10 6.5c1.2 0 2.3-.2 3.3-.5"/>',
  trash: '<path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
  clear: '<path d="M5 15l6-6 3 3 5-5"/><path d="M3 3l18 18"/>',
  undo: '<path d="M8 5L3 10l5 5"/><path d="M3 10h11a6 6 0 016 6v1"/>',
  redo: '<path d="M16 5l5 5-5 5"/><path d="M21 10H10a6 6 0 00-6 6v1"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><circle cx="12" cy="13" r="3.5"/><path d="M9 7l1.2-2h3.6L15 7"/>',
  refresh: '<path d="M20 12a8 8 0 10-2.3 5.6"/><path d="M20 12V6m0 6h-6"/>',
  fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exitfull: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  indicators: '<path d="M5 20V12M11 20V4M17 20v-8"/><path d="M3 20h18"/>',
  volume: '<path d="M6 20v-6M11 20V8M16 20v-9M21 20V5"/><path d="M3 20h18"/>',
  magnet: '<path d="M6 4v7a6 6 0 0012 0V4"/><path d="M6 4h4v5H6zM14 4h4v5h-4z" fill="currentColor" opacity="0.3"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h16M12 4v16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  alert: '<path d="M12 3l10 17H2z"/><path d="M12 10v4M12 17.5v.5"/>',
}
</script>
