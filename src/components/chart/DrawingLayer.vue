<template>
  <svg
    ref="svg"
    class="absolute inset-0 h-full w-full"
    :style="{ cursor: svgCursor, touchAction: tool === 'cursor' ? 'pan-x pan-y' : 'none' }"
    @mousedown="onDown"
    @mousemove="onMove"
    @mouseup="onUp"
    @mouseleave="onUp"
  >
    <!-- committed drawings -->
    <g v-for="d in visible" :key="d.id" :opacity="d.opacity" @mousedown.stop="onSelectDown(d, $event)">
      <DrawingShape :d="d" :pos="posOf(d)" :selected="d.id === selectedId" :on-handle="(p) => onHandleDown(d, p)" />
    </g>
    <!-- in-progress draft -->
    <g v-if="draft" opacity="0.85">
      <DrawingShape :d="draft" :pos="posOf(draft)" :selected="false" :preview="true" :on-handle="() => {}" />
    </g>
    <text v-if="hint" x="12" y="20" class="fill-current text-muted" font-size="11">{{ hint }}</text>
  </svg>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, type PropType, type VNode } from 'vue'
import type { CandleTime, ChartHandle, DrawingObject, DrawingPoint, DrawingType, PlacedPoint } from '@/chart/types.ts'

const props = defineProps<{
  frame: number
  drawings: DrawingObject[]
  tool: DrawingType | 'cursor'
  selectedId: string | null
  style: { color: string; width: number; style: 'solid' | 'dashed' | 'dotted'; opacity: number }
  api: ChartHandle | null
}>()

const emit = defineEmits<{
  (e: 'create', d: DrawingObject): void
  (e: 'update', id: string, patch: Partial<DrawingObject>): void
  (e: 'commit', id: string): void
  (e: 'select', id: string | null): void
}>()

void props.frame

const svg = ref<SVGSVGElement | null>(null)
const draft = ref<DrawingObject | null>(null)
const dragStart = ref<{ x: number; y: number; t: CandleTime; p: number } | null>(null)
const pendingChannel = ref<{ p1: DrawingPoint; p2: DrawingPoint } | null>(null)
const brushPts = ref<DrawingPoint[]>([])
const moving = ref<{ id: string; orig: DrawingObject; startT: CandleTime; startP: number; dh?: string } | null>(null)

const visible = computed(() => props.drawings.filter((d) => !d.hidden))

const hint = computed(() => {
  if (props.tool === 'channel' && pendingChannel.value) return 'نقطه سوم کانال را کلیک کنید (Esc برای انصراف)'
  if (props.tool === 'brush' && brushPts.value.length) return 'کلیک برای افزودن نقطه — دوبارکلیک برای پایان'
  return ''
})

const svgCursor = computed(() => (props.tool === 'cursor' ? 'default' : 'crosshair'))

function cssColor(hex: string, alpha: number): string {
  const m = hex.replace('#', '')
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = Number.parseInt(f.slice(0, 6), 16)
  if (!Number.isFinite(n)) return hex
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

function ptAt(ev: MouseEvent): { x: number; y: number } {
  const r = (svg.value as SVGSVGElement).getBoundingClientRect()
  return { x: ev.clientX - r.left, y: ev.clientY - r.top }
}

function tpAt(x: number, y: number): { t: CandleTime; p: number } | null {
  if (!props.api) return null
  const t = props.api.xToTime(x)
  const p = props.api.yToPrice(y)
  if (t === null || t === undefined || p === null || !Number.isFinite(p)) return null
  return { t, p }
}

let idc = 0
function base(): Omit<DrawingObject, 'type' | 'p1'> {
  idc += 1
  return {
    id: `d-${Date.now().toString(36)}-${idc}`,
    symbol: '',
    color: props.style.color,
    width: props.style.width,
    style: props.style.style,
    opacity: props.style.opacity,
    locked: false,
    hidden: false,
    createdAt: Date.now(),
  }
}

const SINGLE_CLICK: DrawingType[] = ['hline', 'vline', 'text']

function onDown(ev: MouseEvent): void {
  if (ev.button !== 0 || !props.api) return
  if (props.tool === 'cursor') {
    emit('select', null)
    return
  }
  const { x, y } = ptAt(ev)
  const tp = tpAt(x, y)
  if (!tp) return
  const tool = props.tool as DrawingType
  if (SINGLE_CLICK.includes(tool)) {
    const d: DrawingObject = { ...base(), type: tool, p1: { time: tp.t, price: tp.p }, text: tool === 'text' ? 'یادداشت' : undefined }
    emit('create', d)
    emit('select', d.id)
    return
  }
  if (tool === 'brush') {
    brushPts.value.push({ time: tp.t, price: tp.p })
    dragStart.value = { x, y, t: tp.t, p: tp.p }
    return
  }
  if (tool === 'channel' && pendingChannel.value) {
    const d: DrawingObject = { ...base(), type: 'channel', p1: pendingChannel.value.p1, p2: pendingChannel.value.p2, p3: { time: tp.t, price: tp.p } }
    pendingChannel.value = null
    draft.value = null
    emit('create', d)
    return
  }
  dragStart.value = { x, y, t: tp.t, p: tp.p }
  draft.value = { ...base(), type: tool, p1: { time: tp.t, price: tp.p }, p2: { time: tp.t, price: tp.p } }
}

function onMove(ev: MouseEvent): void {
  // move selected drawing
  if (moving.value && props.api) {
    const { x, y } = ptAt(ev)
    const tp = tpAt(x, y)
    if (!tp) return
    const m = moving.value
    const dt = timeDelta(m.startT, tp.t)
    const dp = tp.p - m.startP
    const patch: Partial<DrawingObject> = {}
    const shift = (pt: DrawingPoint): DrawingPoint => ({ time: shiftTime(pt.time, dt), price: pt.price + dp })
    patch.p1 = shift(m.orig.p1)
    if (m.orig.p2) patch.p2 = shift(m.orig.p2)
    if (m.orig.p3) patch.p3 = shift(m.orig.p3)
    if (m.orig.points) patch.points = m.orig.points.map(shift)
    if (m.dh && m.orig.p2) {
      // resize via handle: keep p1 fixed, move p2 (or p3 for channel)
      if (m.dh === 'p3' && m.orig.p3) patch.p3 = { time: tp.t, price: tp.p }
      else patch.p2 = { time: tp.t, price: tp.p }
      if (m.dh === 'p1') {
        patch.p1 = { time: tp.t, price: tp.p }
        patch.p2 = m.orig.p2
      }
    }
    emit('update', m.id, patch)
    return
  }
  if (props.tool === 'brush' && dragStart.value && ev.buttons === 1) {
    const { x, y } = ptAt(ev)
    const tp = tpAt(x, y)
    if (!tp) return
    const last = brushPts.value[brushPts.value.length - 1]
    if (last && Math.abs(x - (dragStart.value?.x ?? 0)) + Math.abs(y - (dragStart.value?.y ?? 0)) > 4) {
      brushPts.value.push({ time: tp.t, price: tp.p })
      draft.value = { ...base(), type: 'brush', p1: brushPts.value[0] as DrawingPoint, points: [...brushPts.value] }
    }
    return
  }
  if (!dragStart.value || !draft.value || !props.api) return
  const { x, y } = ptAt(ev)
  const tp = tpAt(x, y)
  if (!tp) return
  draft.value = { ...draft.value, p2: { time: tp.t, price: tp.p } }
}

function onUp(ev: MouseEvent): void {
  if (moving.value) {
    const id = moving.value.id
    moving.value = null
    emit('commit', id)
    return
  }
  if (props.tool === 'brush') {
    if (ev.type === 'mouseup' && (ev as MouseEvent).detail === 2) finishBrush()
    return
  }
  if (!dragStart.value || !draft.value) return
  const d = draft.value
  dragStart.value = null
  if (d.type === 'channel') {
    if (d.p2 && (d.p1.time !== d.p2.time || d.p1.price !== d.p2.price)) {
      pendingChannel.value = { p1: d.p1, p2: d.p2 }
      return
    }
    draft.value = null
    return
  }
  if (d.p2 && (d.p1.time === d.p2.time && d.p1.price === d.p2.price)) {
    draft.value = null
    return
  }
  draft.value = null
  emit('create', d)
}

function finishBrush(): void {
  if (brushPts.value.length >= 2) {
    emit('create', { ...base(), type: 'brush', p1: brushPts.value[0] as DrawingPoint, points: [...brushPts.value] })
  }
  brushPts.value = []
  draft.value = null
  dragStart.value = null
}

function onSelectDown(d: DrawingObject, ev: MouseEvent): void {
  if (props.tool !== 'cursor') return
  ev.stopPropagation()
  if (d.locked) return
  emit('select', d.id)
  if (!props.api) return
  const { x, y } = ptAt(ev)
  const tp = tpAt(x, y)
  if (!tp) return
  moving.value = { id: d.id, orig: JSON.parse(JSON.stringify(d)) as DrawingObject, startT: tp.t, startP: tp.p }
}

function onHandleDown(d: DrawingObject, payload: { handle: string; ev: MouseEvent }): void {
  if (props.tool !== 'cursor' || d.locked || !props.api) return
  payload.ev.stopPropagation()
  const { x, y } = ptAt(payload.ev)
  const tp = tpAt(x, y)
  if (!tp) return
  moving.value = { id: d.id, orig: JSON.parse(JSON.stringify(d)) as DrawingObject, startT: tp.t, startP: tp.p, dh: payload.handle }
  emit('select', d.id)
}

// --- time arithmetic on mixed time bases (string days or numeric ts) ---
function timeDelta(from: CandleTime, to: CandleTime): number {
  if (typeof from === 'number' && typeof to === 'number') return to - from
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (Number.isFinite(a) && Number.isFinite(b)) return Math.round((b - a) / 86400000)
  return 0
}
function shiftTime(t: CandleTime, dt: number): CandleTime {
  if (typeof t === 'number') return t + dt
  const a = Date.parse(`${t}T00:00:00Z`)
  if (!Number.isFinite(a)) return t
  const d = new Date(a + dt * 86400000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// --- positioning ---
function place(p: DrawingPoint): PlacedPoint | null {
  if (!props.api) return null
  const x = props.api.timeToX(p.time)
  const y = props.api.priceToY(p.price)
  if (x === null || y === null) return null
  return { x, y }
}
function posOf(d: DrawingObject): { p1: PlacedPoint | null; p2: PlacedPoint | null; p3: PlacedPoint | null; pts: PlacedPoint[] } {
  void props.frame
  return {
    p1: place(d.p1),
    p2: d.p2 ? place(d.p2) : null,
    p3: d.p3 ? place(d.p3) : null,
    pts: (d.points ?? []).map(place).filter((x): x is PlacedPoint => x !== null),
  }
}
</script>

<script lang="ts">
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const FIB_EXT = [0, 0.382, 0.618, 1, 1.272, 1.618]

/** Pure SVG renderer for one drawing (shared by committed + draft). */
const DrawingShape = defineComponent({
  name: 'DrawingShape',
  props: {
    d: { type: Object as PropType<DrawingObject>, required: true },
    pos: {
      type: Object as PropType<{ p1: PlacedPoint | null; p2: PlacedPoint | null; p3: PlacedPoint | null; pts: PlacedPoint[] }>,
      required: true,
    },
    selected: { type: Boolean, default: false },
    preview: { type: Boolean, default: false },
    onHandle: { type: Function as PropType<(p: { handle: string; ev: MouseEvent }) => void>, required: true },
  },
  setup(props) {
    const stroke = (extra = 1): Record<string, unknown> => ({
      stroke: props.d.color,
      'stroke-width': props.d.width * extra,
      'stroke-dasharray': props.d.style === 'dashed' ? '6 4' : props.d.style === 'dotted' ? '2 3' : undefined,
      fill: 'none',
      'stroke-linecap': 'round',
    })
    const nodes: VNode[] = []
    const handle = (cx: number, cy: number, hd: string) =>
      h('circle', {
        cx,
        cy,
        r: 5,
        fill: '#fff',
        stroke: props.d.color,
        'stroke-width': 2,
        style: 'cursor:move',
        onMousedown: (ev: MouseEvent) => {
          ev.stopPropagation()
          props.onHandle({ handle: hd, ev })
        },
      })
    const label = (x: number, y: number, text: string, anchor = 'start') =>
      h('text', { x, y: y - 6, 'text-anchor': anchor, 'font-size': 11, fill: props.d.color, 'font-family': 'Vazirmatn, Tahoma' }, text)
    return () => {
      const d = props.d
      const { p1, p2, p3, pts } = props.pos
      const nodes: VNode[] = []
      if (!p1) return h('g', [])
      const sel = props.selected && !props.preview
      if (d.type === 'hline') {
        nodes.push(h('line', { x1: 0, x2: '100%', y1: p1.y, y2: p1.y, ...stroke() }))
        nodes.push(label(8, p1.y, fmtPrice(d.p1.price)))
        if (sel) nodes.push(handle(14, p1.y, 'p1'))
      } else if (d.type === 'vline') {
        nodes.push(h('line', { x1: p1.x, x2: p1.x, y1: 0, y2: '100%', ...stroke() }))
        if (sel) nodes.push(handle(p1.x, 14, 'p1'))
      } else if (d.type === 'text') {
        nodes.push(h('text', { x: p1.x, y: p1.y, 'text-anchor': 'middle', 'font-size': 13 + d.width, fill: d.color, 'font-family': 'Vazirmatn, Tahoma' }, d.text ?? ''))
        if (sel) nodes.push(handle(p1.x, p1.y - 12, 'p1'))
      } else if (d.type === 'brush' && pts.length > 1) {
        nodes.push(h('polyline', { points: pts.map((p) => `${p.x},${p.y}`).join(' '), ...stroke() }))
      } else if (p2) {
        if (d.type === 'trendline' || d.type === 'arrow') {
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...stroke() }))
          if (d.type === 'arrow') {
            const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
            const s = 8 + d.width
            const p = `${p2.x},${p2.y} ${p2.x - s * Math.cos(ang - 0.4)},${p2.y - s * Math.sin(ang - 0.4)} ${p2.x - s * Math.cos(ang + 0.4)},${p2.y - s * Math.sin(ang + 0.4)}`
            nodes.push(h('polygon', { points: p, fill: d.color }))
          }
        } else if (d.type === 'ray') {
          const e = extendRay(p1, p2)
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: e.x, y2: e.y, ...stroke() }))
        } else if (d.type === 'rect' || d.type === 'price-range' || d.type === 'time-range') {
          nodes.push(
            h('rect', { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y), ...stroke(), fill: d.color, 'fill-opacity': 0.1 }),
          )
          if (d.type === 'price-range') {
            const pct = d.p1.price !== 0 ? (((d.p2?.price ?? 0) - d.p1.price) / Math.abs(d.p1.price)) * 100 : 0
            nodes.push(label(Math.min(p1.x, p2.x) + 4, Math.min(p1.y, p2.y) + 16, `${fmtPrice((d.p2?.price ?? 0) - d.p1.price)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}٪)`))
          }
          if (d.type === 'time-range' && d.p2) {
            nodes.push(label(Math.min(p1.x, p2.x) + 4, Math.min(p1.y, p2.y) + 16, `${Math.max(1, Math.round(Math.abs(p2.x - p1.x) / 8))} کندل (تقریبی)`))
          }
        } else if (d.type === 'channel' && p3) {
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...stroke() }))
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          // parallel through p3: offset = p3 - projection of p3 onto base line
          const len2 = dx * dx + dy * dy || 1
          const proj = { x: p1.x + ((dx * (p3.x - p1.x) + dy * (p3.y - p1.y)) / len2) * dx, y: p1.y + ((dx * (p3.x - p1.x) + dy * (p3.y - p1.y)) / len2) * dy }
          const offx = p3.x - proj.x
          const offy = p3.y - proj.y
          nodes.push(h('line', { x1: p1.x + offx, y1: p1.y + offy, x2: p2.x + offx, y2: p2.y + offy, ...stroke() }))
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p1.x + offx, y2: p1.y + offy, ...stroke(), opacity: 0.4 }))
        } else if ((d.type === 'fib' || d.type === 'fib-ext') && p2) {
          const levels = d.type === 'fib' ? FIB_LEVELS : FIB_EXT
          const x1 = Math.min(p1.x, p2.x) - 40
          const x2 = Math.max(p1.x, p2.x) + 80
          for (const L of levels) {
            const price = d.p1.price + ((d.p2?.price ?? 0) - d.p1.price) * L
            // y from price: need converter — approximate via p1/p2 pixel interpolation
            const y = p1.y + (p2.y - p1.y) * L
            nodes.push(h('line', { x1, x2, y1: y, y2: y, ...stroke(0.75), opacity: 0.9 }))
            nodes.push(label(x2 + 4, y + 3, `${(L * 100).toFixed(1)}٪ • ${fmtPrice(price)}`))
          }
        }
        if (sel) {
          nodes.push(handle(p1.x, p1.y, 'p1'))
          if (p2) nodes.push(handle(p2.x, p2.y, 'p2'))
          if (p3 && d.type === 'channel') nodes.push(handle(p3.x, p3.y, 'p3'))
        }
      }
      return h('g', {}, nodes)
    }
  },
})

/** Extend a ray from p1 through p2 far in the drawn direction (SVG clips). */
function extendRay(p1: { x: number; y: number }, p2: { x: number; y: number }): { x: number; y: number } {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { x: p2.x, y: p2.y }
  const k = 5000 / Math.max(1, Math.hypot(dx, dy))
  return { x: p1.x + dx * k, y: p1.y + dy * k }
}

function fmtPrice(v: number): string {
  try {
    return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(v)
  } catch {
    return String(Math.round(v))
  }
}
</script>
