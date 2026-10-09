<template>
  <!-- NOTE: z-[4] keeps this layer above the lightweight-charts panes
       (their canvases use z-index 1-2, attribution link z-3) so pointer
       gestures reach the SVG. Legend (z-10) and tool HUD (z-20) stay on top.
       In cursor mode pointer-events:none restores normal chart interaction,
       except on committed shapes (pointer-events:auto) for selection. -->
  <svg
    ref="svg"
    class="absolute inset-0 z-[4] h-full w-full select-none"
    :style="{
      cursor: svgCursor,
      touchAction: 'none',
      pointerEvents: tool === 'cursor' ? 'none' : 'auto'
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- Committed drawings.
         No .stop modifier here: in drawing mode the event must bubble to the
         svg root so a new drawing can start on top of existing shapes.
         onSelectDown stops propagation only in cursor (select/move) mode. -->
    <g
      v-for="d in visible"
      :key="d.id"
      :opacity="d.opacity"
      class="drawing-item"
      style="pointer-events: auto"
      @pointerdown="onSelectDown(d, $event)"
    >
      <DrawingShape
        :d="d"
        :pos="posOf(d)"
        :svg-width="svgSize.w"
        :svg-height="svgSize.h"
        :selected="d.id === selectedId"
        :interactive="tool === 'cursor'"
        :on-handle="(p) => onHandleDown(d, p)"
      />
    </g>

    <!-- In-progress draft -->
    <g v-if="draft" opacity="0.92" style="pointer-events: none">
      <DrawingShape
        :d="draft"
        :pos="draftPos"
        :svg-width="svgSize.w"
        :svg-height="svgSize.h"
        :selected="false"
        :preview="true"
        :interactive="false"
        :on-handle="() => {}"
      />
      <!-- Active anchor pin on point 1 in 2-click mode -->
      <circle
        v-if="draftPos.p1"
        :cx="draftPos.p1.x"
        :cy="draftPos.p1.y"
        r="5"
        :fill="draft.color"
        stroke="#ffffff"
        stroke-width="2"
      />
      <!-- Active anchor pin on point 2 in channel mode -->
      <circle
        v-if="step === 2 && draftPos.p2"
        :cx="draftPos.p2.x"
        :cy="draftPos.p2.y"
        r="5"
        :fill="draft.color"
        stroke="#ffffff"
        stroke-width="2"
      />
    </g>

    <!-- Contextual Persian Hint Badge -->
    <g v-if="hint" style="pointer-events: none">
      <rect
        :x="12"
        :y="10"
        :width="hintBoxWidth"
        height="24"
        rx="6"
        fill="rgba(15, 23, 42, 0.85)"
        stroke="rgba(244, 114, 182, 0.45)"
        stroke-width="1"
      />
      <text
        x="20"
        y="26"
        fill="#ffffff"
        font-size="11"
        font-family="Vazirmatn, Tahoma, sans-serif"
        font-weight="bold"
      >
        {{ hint }}
      </text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch, type PropType, type VNode } from 'vue'
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
const svgSize = reactive({ w: 1200, h: 600 })
let ro: ResizeObserver | null = null

// Draft state
const draft = ref<DrawingObject | null>(null)
const draftPx = ref<DraftPx | null>(null)

// Step: 0 = idle, 1 = p1 placed (moving to p2 or dragging), 2 = p1+p2 placed (waiting for p3 channel)
const step = ref<number>(0)
const pointerDownStart = ref<{ x: number; y: number; t: CandleTime; p: number } | null>(null)
const hasDraggedFar = ref<boolean>(false)

// Brush state
const brushPts = ref<DrawingPoint[]>([])
const brushPx = ref<PixelPos[]>([])

// Moving existing drawings
const moving = ref<{ id: string; orig: DrawingObject; startT: CandleTime; startP: number; dh?: string } | null>(null)

const visible = computed(() => props.drawings.filter((d) => !d.hidden))

const hint = computed(() => {
  if (props.tool === 'cursor') return ''
  if (props.tool === 'channel') {
    if (step.value === 0) return 'نقطه اول خط پایه کانال را کلیک کنید'
    if (step.value === 1) return 'نقطه دوم خط پایه را کلیک کنید'
    if (step.value === 2) return 'نقطه سوم را برای تعیین عرض کانال کلیک کنید (Esc برای انصراف)'
  }
  if (props.tool === 'brush') {
    return 'با درگ قلم روی نمودار ترسیم کنید'
  }
  if (step.value === 1) {
    return 'نقطه پایان را کلیک کنید یا درگ را رها کنید (Esc برای انصراف)'
  }
  return ''
})

const hintBoxWidth = computed(() => Math.max(140, (hint.value?.length ?? 0) * 8.5 + 24))

const svgCursor = computed(() => (props.tool === 'cursor' ? 'default' : 'crosshair'))

function ptAt(ev: PointerEvent | MouseEvent): PixelPos {
  if (!svg.value) return { x: ev.clientX, y: ev.clientY }
  const r = svg.value.getBoundingClientRect()
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

const draftPos = computed(() => {
  if (draftPx.value) {
    return {
      p1: draftPx.value.p1,
      p2: draftPx.value.p2 ?? null,
      p3: draftPx.value.p3 ?? null,
      pts: draftPx.value.pts ?? [],
    }
  }
  if (draft.value) {
    return posOf(draft.value)
  }
  return { p1: null, p2: null, p3: null, pts: [] }
})

// --- Pointer Handlers ---

function onPointerDown(ev: PointerEvent): void {
  // Only accept left mouse or touch
  if (ev.button !== 0 && ev.pointerType === 'mouse') return
  if (!props.api) return

  if (props.tool === 'cursor') {
    emit('select', null)
    return
  }

  const { x, y } = ptAt(ev)
  const tp = tpAt(x, y)
  if (!tp) return

  const tool = props.tool as DrawingType

  // 1. Single-click tools (hline, vline, text)
  if (SINGLE_CLICK.includes(tool)) {
    const d: DrawingObject = {
      ...base(),
      type: tool,
      p1: { time: tp.t, price: tp.p },
      text: tool === 'text' ? 'یادداشت' : undefined,
    }
    emit('create', d)
    emit('select', d.id)
    return
  }

  // 2. Brush freehand drawing
  if (tool === 'brush') {
    brushPts.value = [{ time: tp.t, price: tp.p }]
    brushPx.value = [{ x, y }]
    draft.value = {
      ...base(),
      type: 'brush',
      p1: { time: tp.t, price: tp.p },
      points: [{ time: tp.t, price: tp.p }],
    }
    draftPx.value = { p1: { x, y }, pts: [{ x, y }] }
    pointerDownStart.value = { x, y, t: tp.t, p: tp.p }
    try {
      (ev.target as Element)?.setPointerCapture?.(ev.pointerId)
    } catch {
      /* ignore */
    }
    return
  }

  // 3. Channel third-point click
  if (tool === 'channel' && step.value === 2 && draft.value) {
    const committed: DrawingObject = {
      ...draft.value,
      p3: { time: tp.t, price: tp.p },
    }
    step.value = 0
    draft.value = null
    draftPx.value = null
    pointerDownStart.value = null
    emit('create', committed)
    emit('select', committed.id)
    return
  }

  // 4. Two-point tools: If already in step 1 waiting for second click
  if (step.value === 1 && draft.value) {
    // Second click finishes the drawing!
    const committed: DrawingObject = {
      ...draft.value,
      p2: { time: tp.t, price: tp.p },
    }
    if (tool === 'channel') {
      // Advance to step 2 for parallel line
      step.value = 2
      draft.value.p2 = { time: tp.t, price: tp.p }
      draft.value.p3 = { time: tp.t, price: tp.p }
      if (draftPx.value) {
        draftPx.value.p2 = { x, y }
        draftPx.value.p3 = { x, y }
      }
      return
    }
    step.value = 0
    draft.value = null
    draftPx.value = null
    pointerDownStart.value = null
    emit('create', committed)
    emit('select', committed.id)
    return
  }

  // 5. Start new drawing (Step 0 -> Step 1)
  step.value = 1
  hasDraggedFar.value = false
  pointerDownStart.value = { x, y, t: tp.t, p: tp.p }
  draft.value = {
    ...base(),
    type: tool,
    p1: { time: tp.t, price: tp.p },
    p2: { time: tp.t, price: tp.p },
  }
  draftPx.value = { p1: { x, y }, p2: { x, y } }
  try {
    (ev.target as Element)?.setPointerCapture?.(ev.pointerId)
  } catch {
    /* ignore */
  }
}

function onPointerMove(ev: PointerEvent): void {
  const { x, y } = ptAt(ev)

  // 1. Move/resize existing selected drawing
  if (moving.value && props.api) {
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
      if (m.dh === 'p3' && m.orig.p3) patch.p3 = { time: tp.t, price: tp.p }
      else if (m.dh === 'p1') {
        patch.p1 = { time: tp.t, price: tp.p }
        patch.p2 = m.orig.p2
      } else {
        patch.p2 = { time: tp.t, price: tp.p }
      }
    }
    emit('update', m.id, patch)
    return
  }

  // 2. Brush stroke drawing
  if (props.tool === 'brush' && draft.value && pointerDownStart.value) {
    const lastPx = brushPx.value[brushPx.value.length - 1]
    if (!lastPx || Math.hypot(x - lastPx.x, y - lastPx.y) > 3) {
      const tp = tpAt(x, y)
      if (tp) {
        brushPts.value.push({ time: tp.t, price: tp.p })
        brushPx.value.push({ x, y })
        draft.value = {
          ...draft.value,
          points: [...brushPts.value],
        }
        draftPx.value = {
          p1: draftPx.value?.p1 ?? { x, y },
          pts: [...brushPx.value],
        }
      }
    }
    return
  }

  // 3. Channel step 2 (adjusting p3 offset)
  if (step.value === 2 && draft.value) {
    const tp = tpAt(x, y)
    if (draftPx.value) draftPx.value.p3 = { x, y }
    if (tp) draft.value.p3 = { time: tp.t, price: tp.p }
    return
  }

  // 4. In-progress draft for 2-point tools (step === 1)
  if (step.value === 1 && draft.value) {
    const tp = tpAt(x, y)
    if (draftPx.value) draftPx.value.p2 = { x, y }
    if (tp) draft.value.p2 = { time: tp.t, price: tp.p }

    if (pointerDownStart.value) {
      const dist = Math.hypot(x - pointerDownStart.value.x, y - pointerDownStart.value.y)
      if (dist > 8) hasDraggedFar.value = true
    }
  }
}

function onPointerUp(ev: PointerEvent): void {
  // 1. Commit moving selected drawing
  if (moving.value) {
    const id = moving.value.id
    moving.value = null
    emit('commit', id)
    return
  }

  // 2. Brush finish stroke
  if (props.tool === 'brush') {
    if (brushPts.value.length >= 2 && draft.value) {
      emit('create', { ...draft.value })
      emit('select', draft.value.id)
    }
    brushPts.value = []
    brushPx.value = []
    draft.value = null
    draftPx.value = null
    pointerDownStart.value = null
    return
  }

  // 3. Two-point tools in step 1
  if (step.value === 1 && draft.value) {
    // If user dragged more than 8 pixels, treat as drag-to-draw and finish immediately!
    if (hasDraggedFar.value) {
      const { x, y } = ptAt(ev)
      const tp = tpAt(x, y)
      if (tp) draft.value.p2 = { time: tp.t, price: tp.p }

      if (props.tool === 'channel') {
        // Channel moves to step 2 for parallel line
        step.value = 2
        draft.value.p3 = draft.value.p2
        if (draftPx.value) draftPx.value.p3 = draftPx.value.p2
        pointerDownStart.value = null
        return
      }

      const committed = { ...draft.value }
      step.value = 0
      draft.value = null
      draftPx.value = null
      pointerDownStart.value = null
      emit('create', committed)
      emit('select', committed.id)
    } else {
      // User tapped or clicked point 1: stay in step 1 waiting for second click!
      // pointerDownStart cleared so dragging flag resets
      pointerDownStart.value = null
    }
  }
}

function onPointerCancel(): void {
  moving.value = null
  if (step.value === 1 && hasDraggedFar.value) {
    cancelDraft()
  }
}

function cancelDraft(): void {
  step.value = 0
  draft.value = null
  draftPx.value = null
  pointerDownStart.value = null
  hasDraggedFar.value = false
  brushPts.value = []
  brushPx.value = []
}

// A stale in-progress draft must never leak into another tool: switching
// tools (or losing the chart bridge) resets the interaction state machine.
watch(
  () => props.tool,
  () => {
    moving.value = null
    cancelDraft()
  },
)
watch(
  () => props.api,
  (api) => {
    if (!api) {
      moving.value = null
      cancelDraft()
    }
  },
)

// Global Escape to cancel active draft
function onKeyDown(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    if (draft.value || step.value > 0) {
      cancelDraft()
    } else if (props.selectedId) {
      emit('select', null)
    }
  }
}

function onSelectDown(d: DrawingObject, ev: PointerEvent): void {
  // In drawing mode never swallow the gesture: let it bubble to the svg root
  // so a new drawing can start even on top of existing shapes.
  if (props.tool !== 'cursor') return
  ev.stopPropagation()
  if (d.locked) {
    return
  }
  emit('select', d.id)
  if (!props.api) return
  const { x, y } = ptAt(ev)
  const tp = tpAt(x, y)
  if (!tp) return
  moving.value = { id: d.id, orig: JSON.parse(JSON.stringify(d)) as DrawingObject, startT: tp.t, startP: tp.p }
  try {
    (ev.target as Element)?.setPointerCapture?.(ev.pointerId)
  } catch {
    /* ignore */
  }
}

function onHandleDown(d: DrawingObject, payload: { handle: string; ev: PointerEvent }): void {
  if (props.tool !== 'cursor' || d.locked || !props.api) return
  payload.ev.stopPropagation()
  const { x, y } = ptAt(payload.ev)
  const tp = tpAt(x, y)
  if (!tp) return
  moving.value = { id: d.id, orig: JSON.parse(JSON.stringify(d)) as DrawingObject, startT: tp.t, startP: tp.p, dh: payload.handle }
  emit('select', d.id)
  try {
    (payload.ev.target as Element)?.setPointerCapture?.(payload.ev.pointerId)
  } catch {
    /* ignore */
  }
}

// Time arithmetic
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

// Positioning
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

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  if (svg.value) {
    svgSize.w = svg.value.clientWidth || 1200
    svgSize.h = svg.value.clientHeight || 600
    ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e) {
        svgSize.w = e.contentRect.width
        svgSize.h = e.contentRect.height
      }
    })
    ro.observe(svg.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  ro?.disconnect()
})
</script>

<script lang="ts">
export interface PixelPos {
  x: number
  y: number
}
export interface DraftPx {
  p1: PixelPos
  p2?: PixelPos
  p3?: PixelPos
  pts?: PixelPos[]
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const FIB_EXT = [0, 0.382, 0.618, 1, 1.272, 1.618]

/** Pure SVG renderer for one drawing shape */
const DrawingShape = defineComponent({
  name: 'DrawingShape',
  props: {
    d: { type: Object as PropType<DrawingObject>, required: true },
    pos: {
      type: Object as PropType<{ p1: PlacedPoint | null; p2: PlacedPoint | null; p3: PlacedPoint | null; pts: PlacedPoint[] }>,
      required: true,
    },
    svgWidth: { type: Number, default: 1200 },
    svgHeight: { type: Number, default: 600 },
    selected: { type: Boolean, default: false },
    preview: { type: Boolean, default: false },
    /** False while a drawing tool is armed: handles hide and gestures pass through to start a new drawing. */
    interactive: { type: Boolean, default: true },
    onHandle: { type: Function as PropType<(p: { handle: string; ev: PointerEvent }) => void>, required: true },
  },
  setup(props) {
    const stroke = (extra = 1): Record<string, unknown> => ({
      stroke: props.d.color,
      'stroke-width': Math.max(1.5, props.d.width * extra),
      'stroke-dasharray': props.d.style === 'dashed' ? '6 4' : props.d.style === 'dotted' ? '2 3' : undefined,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    })

    // Transparent fat line for easy hover/click selection
    const hitArea = (x1: number, y1: number, x2: number, y2: number) =>
      h('line', {
        x1,
        y1,
        x2,
        y2,
        stroke: 'transparent',
        'stroke-width': 18,
        style: 'cursor: pointer',
      })

    const handle = (cx: number, cy: number, hd: string) =>
      h('circle', {
        cx,
        cy,
        r: 5.5,
        fill: '#ffffff',
        stroke: props.d.color,
        'stroke-width': 2.5,
        style: 'cursor: move; pointer-events: auto;',
        onPointerdown: (ev: PointerEvent) => {
          // In drawing mode handles are hidden; if one is somehow hit, do not
          // swallow the gesture so a new drawing can still start.
          if (!props.interactive) return
          ev.stopPropagation()
          props.onHandle({ handle: hd, ev })
        },
      })

    const label = (x: number, y: number, text: string, anchor = 'start') =>
      h(
        'text',
        {
          x,
          y: y - 6,
          'text-anchor': anchor,
          'font-size': 11,
          'font-weight': 'bold',
          fill: props.d.color,
          'font-family': 'Vazirmatn, Tahoma',
          style: 'pointer-events: none',
        },
        text,
      )

    return () => {
      const d = props.d
      const { p1, p2, p3, pts } = props.pos
      const nodes: VNode[] = []
      if (!p1) return h('g', [])

      const sel = props.selected && !props.preview && props.interactive
      const maxX = props.svgWidth || 5000
      const maxY = props.svgHeight || 3000

      if (d.type === 'hline') {
        nodes.push(hitArea(0, p1.y, maxX, p1.y))
        nodes.push(h('line', { x1: 0, x2: maxX, y1: p1.y, y2: p1.y, ...stroke() }))
        nodes.push(label(12, p1.y, fmtPrice(d.p1.price)))
        if (sel) nodes.push(handle(20, p1.y, 'p1'))
      } else if (d.type === 'vline') {
        nodes.push(hitArea(p1.x, 0, p1.x, maxY))
        nodes.push(h('line', { x1: p1.x, x2: p1.x, y1: 0, y2: maxY, ...stroke() }))
        if (sel) nodes.push(handle(p1.x, 20, 'p1'))
      } else if (d.type === 'text') {
        nodes.push(
          h(
            'text',
            {
              x: p1.x,
              y: p1.y,
              'text-anchor': 'middle',
              'font-size': 13 + d.width,
              'font-weight': 'bold',
              fill: d.color,
              'font-family': 'Vazirmatn, Tahoma',
              style: 'cursor: pointer; pointer-events: auto;',
            },
            d.text ?? 'یادداشت',
          ),
        )
        if (sel) nodes.push(handle(p1.x, p1.y - 14, 'p1'))
      } else if (d.type === 'brush' && pts.length > 1) {
        nodes.push(h('polyline', { points: pts.map((p) => `${p.x},${p.y}`).join(' '), ...stroke() }))
      } else if (p2) {
        if (d.type === 'trendline' || d.type === 'arrow') {
          nodes.push(hitArea(p1.x, p1.y, p2.x, p2.y))
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...stroke() }))

          if (d.type === 'arrow') {
            const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
            const s = 11 + d.width * 1.5
            const p = `${p2.x},${p2.y} ${p2.x - s * Math.cos(ang - 0.42)},${p2.y - s * Math.sin(ang - 0.42)} ${p2.x - s * Math.cos(ang + 0.42)},${p2.y - s * Math.sin(ang + 0.42)}`
            nodes.push(h('polygon', { points: p, fill: d.color }))
          }
        } else if (d.type === 'ray') {
          const e = extendRay(p1, p2, maxX, maxY)
          nodes.push(hitArea(p1.x, p1.y, e.x, e.y))
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: e.x, y2: e.y, ...stroke() }))
        } else if (d.type === 'rect' || d.type === 'price-range' || d.type === 'time-range') {
          const rx = Math.min(p1.x, p2.x)
          const ry = Math.min(p1.y, p2.y)
          const rw = Math.max(1, Math.abs(p2.x - p1.x))
          const rh = Math.max(1, Math.abs(p2.y - p1.y))
          nodes.push(
            h('rect', {
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              ...stroke(),
              fill: d.color,
              'fill-opacity': 0.12,
              style: 'cursor: pointer; pointer-events: auto;',
            }),
          )
          if (d.type === 'price-range') {
            const pct = d.p1.price !== 0 ? (((d.p2?.price ?? 0) - d.p1.price) / Math.abs(d.p1.price)) * 100 : 0
            nodes.push(
              label(rx + 6, ry + 16, `${fmtPrice((d.p2?.price ?? 0) - d.p1.price)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}٪)`),
            )
          }
          if (d.type === 'time-range') {
            nodes.push(label(rx + 6, ry + 16, `${Math.max(1, Math.round(rw / 10))} کندل (تقریبی)`))
          }
        } else if (d.type === 'channel' && p3) {
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...stroke() }))
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const len2 = dx * dx + dy * dy || 1
          const proj = {
            x: p1.x + ((dx * (p3.x - p1.x) + dy * (p3.y - p1.y)) / len2) * dx,
            y: p1.y + ((dx * (p3.x - p1.x) + dy * (p3.y - p1.y)) / len2) * dy,
          }
          const offx = p3.x - proj.x
          const offy = p3.y - proj.y
          nodes.push(h('line', { x1: p1.x + offx, y1: p1.y + offy, x2: p2.x + offx, y2: p2.y + offy, ...stroke() }))
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p1.x + offx, y2: p1.y + offy, ...stroke(), opacity: 0.35 }))
        } else if (d.type === 'fib' || d.type === 'fib-ext') {
          const levels = d.type === 'fib' ? FIB_LEVELS : FIB_EXT
          const x1 = Math.min(p1.x, p2.x) - 30
          const x2 = Math.max(p1.x, p2.x) + 70
          nodes.push(h('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, ...stroke(0.7), opacity: 0.45 }))
          for (const L of levels) {
            const price = d.p1.price + ((d.p2?.price ?? 0) - d.p1.price) * L
            const y = p1.y + (p2.y - p1.y) * L
            nodes.push(h('line', { x1, x2, y1: y, y2: y, ...stroke(0.85), opacity: 0.9 }))
            nodes.push(label(x2 + 4, y + 4, `${(L * 100).toFixed(1)}٪ · ${fmtPrice(price)}`))
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

function extendRay(p1: PixelPos, p2: PixelPos, maxX: number, maxY: number): PixelPos {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return { x: p2.x, y: p2.y }
  const k = Math.max(maxX, maxY, 3000) / Math.max(1, Math.hypot(dx, dy))
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

<style scoped>
.drawing-item {
  transition: opacity 0.15s ease;
}
.drawing-item:hover {
  filter: drop-shadow(0 0 3px var(--brand, #f472b6));
}
</style>
