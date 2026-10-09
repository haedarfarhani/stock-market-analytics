<template>
  <div ref="wrap" class="analysis-root flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2" :class="{ 'fs-fallback': fsFallback }">
    <!-- header -->
    <div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div class="h-1 bg-gradient-to-l from-brand-solid via-accent to-brand-solid" aria-hidden="true" />
      <div class="flex flex-wrap items-center gap-2 px-3 py-2">
        <RouterLink to="/stocks" class="rounded-lg px-2 py-1.5 text-xs font-bold text-brand transition hover:bg-brand/10">→ سهام</RouterLink>
        <div class="brand-gradient grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black text-white shadow-md shadow-brand/30" aria-hidden="true">
          {{ (symbolParam || '?').slice(0, 1) }}
        </div>
        <div class="min-w-0 flex-1">
          <SymbolHeader
            :symbol="symbolParam"
            :company="headerCompany"
            :market="headerMarket"
            :state="detail?.state"
            :price="legend?.close ?? headerPrice"
            :change="legendChange"
            :change-percent="legendChangePct"
            :ohlc="legend ?? headerOhlc"
            :in-watch="watch.has(symbolParam)"
            @toggle-watch="watch.toggle(symbolParam)"
          />
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="symbolQ"
            @keyup.enter="goSymbol"
            list="analysis-symbols"
            placeholder="نماد…"
            class="w-28 rounded-xl border border-line bg-surface px-2 py-1.5 text-xs outline-none placeholder:text-muted focus:border-brand"
            aria-label="جستجوی نماد"
          />
          <datalist id="analysis-symbols">
            <option v-for="s in market.symbols.slice(0, 500)" :key="s.l18" :value="s.l18" />
          </datalist>
          <button @click="goSymbol" class="rounded-xl bg-brand-solid px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-strong">برو</button>
          <button @click="toggleFs" class="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink transition hover:border-brand lg:hidden" :title="fsActive ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'">
            <ChartIcon :name="fsActive ? 'exitfull' : 'fullscreen'" :size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- toolbar -->
    <div class="rounded-2xl border border-line bg-surface px-2 shadow-sm">
      <ChartToolbar
        :kind="prefs.kind" :set="prefs.set" :agg="agg" :range="prefs.range"
        :volume="prefs.volumeVisible" :magnet="prefs.crosshairMagnet" :grid="prefs.gridVisible"
        :auto="auto" :panels="sidePanel" :can-undo="canUndo" :can-redo="canRedo"
        @kind="setKind" @set="setSet" @agg="setAgg" @range="setRange"
        @toggle="onToggle" @undo="doUndo" @redo="doRedo" @reset="resetView"
        @shot="shot" @refresh="reload(true)" @fullscreen="toggleFs"
      />
    </div>

    <!-- workspace: DOM order is chart-then-rail so the rail lands on the
         PHYSICAL left in this RTL flex row; price scale stays right (ltr canvas) -->
    <div class="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
      <!-- chart -->
      <div class="analysis-chart relative h-[62dvh] max-h-[820px] min-h-[440px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:h-[calc(100dvh-23rem)]">
        <!-- active tool chip -->
        <div v-if="tool !== 'cursor'" class="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-brand/30 bg-surface/90 py-1 pe-2 ps-1 text-[11px] font-bold text-brand shadow-md backdrop-blur">
          <ChartIcon :name="toolIcon" :size="18" />
          {{ toolLabel }}
          <button @click="setTool('cursor')" class="grid h-5 w-5 place-items-center rounded-full hover:bg-secondary" title="انصراف (Esc)" aria-label="انصراف"><ChartIcon name="close" :size="13" /></button>
        </div>
        <!-- drawings count -->
        <div v-if="drawings.length" class="absolute bottom-3 left-3 z-10 hidden items-center gap-1 rounded-full bg-secondary/90 px-2.5 py-1 text-[10px] font-bold text-muted backdrop-blur sm:flex">
          <ChartIcon name="layers" :size="14" /> {{ toFaDigits(drawings.length) }} ترسیم
        </div>
        <div v-if="loading" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface/70 backdrop-blur-sm" role="status">
          <div class="flex flex-col items-center gap-3">
            <span class="loader-ring" aria-hidden="true" />
            <p class="text-sm font-bold">در حال بارگذاری دیتا…</p>
          </div>
        </div>
        <div v-if="loadError && !candles.length" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface" role="alert">
          <div class="text-center">
            <p class="text-sm font-bold">خطا در دریافت دیتا</p>
            <p class="mt-1 max-w-md text-xs leading-6 text-muted">{{ loadError }}</p>
            <button @click="reload(true)" class="mt-3 rounded-xl bg-brand-solid px-4 py-2 text-xs font-bold text-white">تلاش مجدد</button>
          </div>
        </div>
        <div v-if="!loading && !loadError && !candles.length" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface">
          <p class="text-sm text-muted">برای این نماد کندلی در دسترس نیست.</p>
        </div>
        <ProChart
          ref="pro"
          :candles="displayCandles" :kind="prefs.kind" :volume-visible="prefs.volumeVisible"
          :grid-visible="prefs.gridVisible" :magnet="prefs.crosshairMagnet"
          :overlays="overlayLines" :oscillators="oscGroups" :volume-overlay="volLines"
          @hover="hoverBar = $event" @ready="frame++" @view-change="frame++"
        />
        <DrawingLayer
          v-if="proApi && candles.length"
          :frame="frame" :drawings="drawings" :tool="tool" :selected-id="selectedId"
          :style="drawStyle" :api="proApi"
          @create="onCreate" @update="onTransient" @commit="onCommit" @select="selectedId = $event"
        />
        <!-- mobile tools button -->
        <button @click="sheet = true" class="absolute bottom-4 right-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-solid text-white shadow-xl shadow-brand/40 transition hover:bg-brand-strong active:scale-95 lg:hidden" title="ابزارهای ترسیم" aria-label="ابزارهای ترسیم">
          <ChartIcon name="brush" :size="26" />
        </button>
      </div>

      <!-- drawing rail (desktop, physical left of chart) -->
      <div class="hidden min-h-0 w-[3.75rem] shrink-0 flex-col self-stretch overflow-y-auto rounded-2xl border border-line bg-surface px-1 shadow-sm lg:flex">
        <DrawingToolbar
          vertical :tool="tool" :selected="selected" :color="drawStyle.color"
          :width="drawStyle.width" :line-style="drawStyle.style"
          @tool="setTool" @update:color="drawStyle.color = $event" @update:width="drawStyle.width = $event"
          @update:lineStyle="drawStyle.style = $event" @edit-text="editSelectedText"
          @lock="toggleLock" @hide="toggleHide" @remove="removeSelected" @clear="clearAll"
        />
      </div>

      <!-- side panel (desktop) -->
      <aside v-if="sidePanel" class="hidden w-72 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface xl:block">
        <IndicatorPanel
          v-if="sidePanel === 'indicators'"
          :instances="indicators"
          @add="addIndicator" @remove="removeIndicator" @visible="toggleIndVisible"
          @param="setIndParam" @color="setIndColor"
        />
        <div v-else class="flex h-full max-h-[70vh] flex-col p-3">
          <h3 class="text-sm font-black">دیده‌بان</h3>
          <ul class="mt-2 flex-1 space-y-1 overflow-y-auto">
            <li v-for="s in watchRows" :key="s.l18">
              <button @click="goSymbolTo(s.l18)" class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-right text-[13px] transition hover:bg-secondary">
                <span class="font-bold">{{ s.l18 }}</span>
                <span class="tnum ms-auto">{{ formatFaNumber(s.pc) }}</span>
                <ChangeBadge :value="s.pcp" />
              </button>
            </li>
          </ul>
          <p v-if="!watchRows.length" class="py-4 text-center text-xs text-muted">دیده‌بان خالی است.</p>
        </div>
      </aside>
    </div>

    <!-- data footnote -->
    <p class="tnum px-1 text-[10px] text-muted">
      {{ datasetSource }} • {{ updatedFa }}
      <span v-if="aggNote"> • {{ aggNote }}</span>
      <span v-if="isMockNow"> • داده نمایشی</span>
    </p>

    <!-- mobile bottom sheet -->
    <div v-if="sheet" class="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-label="ابزارهای ترسیم">
      <div class="absolute inset-0 bg-black/55 backdrop-blur-[2px]" @click="sheet = false" />
      <div class="absolute inset-x-0 bottom-0 max-h-[72vh] overflow-y-auto rounded-t-3xl border-t-2 border-brand/30 bg-surface p-4 shadow-2xl">
        <div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div class="mb-2 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-sm font-black"><ChartIcon name="brush" :size="20" /> ابزارهای ترسیم</h3>
          <button @click="sheet = false" class="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-ink" aria-label="بستن"><ChartIcon name="close" :size="18" /></button>
        </div>
        <DrawingToolbar
          :tool="tool" :selected="selected" :color="drawStyle.color"
          :width="drawStyle.width" :line-style="drawStyle.style"
          @tool="(t) => { setTool(t); if (t !== 'cursor') sheet = false }"
          @update:color="drawStyle.color = $event" @update:width="drawStyle.width = $event"
          @update:lineStyle="drawStyle.style = $event" @edit-text="editSelectedText"
          @lock="toggleLock" @hide="toggleHide" @remove="removeSelected" @clear="clearAll"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch as vueWatch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toJalaali } from 'jalaali-js'
import { useMarketStore } from '@/stores/market'
import { useWatchlistStore } from '@/stores/watchlist'
import { fetchDataset, resample, type Aggregate } from '@/chart/data.ts'
import { computeInstance, getIndicatorDef, makeInstance } from '@/chart/indicators.ts'
import { DrawingHistory, loadDrawings, loadIndicatorState, loadPrefs, saveIndicatorState, savePrefs } from '@/chart/persistence.ts'
import type { CandleSet, ChartKind, DrawingObject, IndicatorInstance, WorkspaceCandle } from '@/chart/types.ts'
import { fetchSymbolDetail, hasApiKey } from '@/services/api'
import type { TsetmcSymbolDetail } from '@/types/market'
import { changeClass, formatFaNumber, formatFaPercent, toFaDigits } from '@/utils/format'
import ProChart from '@/components/chart/ProChart.vue'
import ChartIcon from '@/components/chart/ChartIcon.vue'
import DrawingLayer from '@/components/chart/DrawingLayer.vue'
import ChartToolbar from '@/components/chart/ChartToolbar.vue'
import DrawingToolbar from '@/components/chart/DrawingToolbar.vue'
import IndicatorPanel from '@/components/chart/IndicatorPanel.vue'
import SymbolHeader from '@/components/chart/SymbolHeader.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'

void changeClass

const route = useRoute()
const router = useRouter()
const market = useMarketStore()
const watch = useWatchlistStore()

const symbolParam = computed(() => decodeURIComponent(String(route.params.symbol ?? '')))
const symbolQ = ref('')

// prefs + ui state
const prefs = reactive(loadPrefs())
const agg = ref<Aggregate>('daily')
const tool = ref<'cursor' | DrawingObject['type']>('cursor')
const drawStyle = reactive({ color: '#f472b6', width: 2 as number, style: 'solid' as 'solid' | 'dashed' | 'dotted', opacity: 1 })
const sidePanel = ref<'indicators' | 'watch' | null>(null)
const auto = ref(false)
const sheet = ref(false)
const frame = ref(0)

// data state
const candles = ref<WorkspaceCandle[]>([])
const datasetSource = ref('')
const updatedFa = ref('')
const loading = ref(false)
const loadError = ref<string | null>(null)
const isMockNow = ref(false)
let reqToken = 0
let autoTimer = 0

// detail + legend
const detail = ref<TsetmcSymbolDetail | null>(null)
const hoverBar = ref<{ time: WorkspaceCandle['time']; open: number; high: number; low: number; close: number; volume?: number } | null>(null)

// indicators
const indicators = ref<IndicatorInstance[]>([])
function persistIndicators(): void {
  saveIndicatorState(indicators.value.map((i) => ({ key: i.key, params: { ...i.params }, colors: { ...i.colors }, visible: i.visible })))
}
function restoreIndicators(): void {
  const saved = loadIndicatorState()
  indicators.value = []
  for (const s of saved) {
    const inst = makeInstance(s.key)
    if (!inst) continue
    inst.params = { ...inst.params, ...s.params }
    inst.colors = { ...inst.colors, ...s.colors }
    inst.visible = s.visible !== false
    indicators.value.push(inst)
  }
}

// drawings
const drawings = ref<DrawingObject[]>([])
const selectedId = ref<string | null>(null)
let history = new DrawingHistory('', [])
const canUndo = ref(false)
const canRedo = ref(false)
function syncHistFlags(): void {
  canUndo.value = history.canUndo
  canRedo.value = history.canRedo
}
function initDrawings(): void {
  const loaded = loadDrawings(symbolParam.value)
  history = new DrawingHistory(symbolParam.value, loaded)
  drawings.value = history.current
  selectedId.value = null
  syncHistFlags()
}

// fullscreen
const wrap = ref<HTMLElement | null>(null)
const fsFallback = ref(false)
const fsNative = ref(false)
const fsActive = computed(() => fsNative.value || fsFallback.value)
let preFsPanel: 'indicators' | 'watch' | null = null
function hidePanelsForFs(): void {
  preFsPanel = sidePanel.value
  sidePanel.value = null
  sheet.value = false
}
function restorePanelsAfterFs(): void {
  if (preFsPanel !== null) sidePanel.value = preFsPanel
  preFsPanel = null
}
async function toggleFs(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen().catch(() => {})
    restorePanelsAfterFs()
    return
  }
  if (fsFallback.value) {
    fsFallback.value = false
    restorePanelsAfterFs()
    return
  }
  hidePanelsForFs()
  if (wrap.value?.requestFullscreen) {
    try {
      await wrap.value.requestFullscreen()
      return
    } catch {
      /* fall through to css fallback */
    }
  }
  fsFallback.value = true
}
function onFsChange(): void {
  fsNative.value = !!document.fullscreenElement
  if (!fsNative.value) restorePanelsAfterFs() // covers Esc-exit from native fs
  frame.value++
}

function asciiTodayJalali(): string {
  const j = toJalaali(new Date())
  return `${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}`
}

async function reload(force = false): Promise<void> {
  const sym = symbolParam.value
  if (!sym) return
  if (!hasApiKey()) {
    loadError.value = 'کلید API تنظیم نشده است؛ تحلیل زنده در دسترس نیست. VITE_BRSAPI_KEY را در فایل .env قرار دهید.'
    candles.value = []
    isMockNow.value = true
    return
  }
  const my = ++reqToken
  loading.value = true
  loadError.value = null
  try {
    await market.load()
    const [ds, det] = await Promise.all([
      fetchDataset(sym, prefs.set, detail.value?.date_update ?? asciiTodayJalali()),
      fetchSymbolDetail({ l18: sym }).catch(() => null),
    ])
    if (my !== reqToken) return // stale resolution
    detail.value = det
    candles.value = ds.candles
    datasetSource.value = ds.source === 'candlestick-intraday' ? 'کندل‌های ۲دقیقه‌ای امروز (زنده)' : ds.source.includes('unadjusted') ? 'کندل روزانه تعدیل‌نشده (TSETMC)' : 'کندل روزانه تعدیل‌شده (TSETMC)'
    updatedFa.value = `به‌روزرسانی: ${toFaDigits(new Date(ds.fetchedAt).toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit' }))}`
    isMockNow.value = false
    if (!ds.candles.length) loadError.value = null
  } catch (e) {
    if (my !== reqToken) return
    loadError.value = e instanceof Error ? e.message : 'خطای نامشخص'
    candles.value = []
  } finally {
    if (my !== reqToken) return
    loading.value = false
  }
}

// ---- derived series ----
const displayCandles = computed(() => {
  if (prefs.set === 'intraday') return candles.value
  const aggd = resample(candles.value, agg.value)
  if (!prefs.range) return aggd
  return aggd.slice(-prefs.range)
})

const computeBase = computed(() => {
  // full resolution for warm-up; display window sliced per line below
  if (prefs.set === 'intraday') return candles.value
  const aggd = resample(candles.value, agg.value)
  return aggd.slice(-Math.max(prefs.range || aggd.length, 400))
})

const displayTimes = computed(() => new Set(displayCandles.value.map((c) => String(c.time))))

function projectForward(times: WorkspaceCandle['time'][], last: WorkspaceCandle['time'], n: number): WorkspaceCandle['time'][] {
  if (typeof last === 'number') return Array.from({ length: n }, (_, i) => last + (i + 1) * 120)
  const out: WorkspaceCandle['time'][] = []
  const d = new Date(`${last}T00:00:00Z`)
  if (!Number.isFinite(d.getTime())) return out
  let cur = d.getTime()
  while (out.length < n) {
    cur += 86400000
    const w = new Date(cur).getUTCDay()
    if (w === 5) continue // Friday closure
    out.push(new Date(cur).toISOString().slice(0, 10))
  }
  void times
  return out
}

interface BuiltLines {
  overlays: ReturnType<typeof computeInstance>[number][]
  osc: ReturnType<typeof computeInstance>[number][][]
  vol: ReturnType<typeof computeInstance>[number][]
}

const built = computed<BuiltLines>(() => {
  const overlays: BuiltLines['overlays'] = []
  const osc: BuiltLines['osc'] = []
  const vol: BuiltLines['vol'] = []
  const disp = (p: Record<string, number>): number => p.kijun ?? 26
  for (const inst of indicators.value) {
    if (!inst.visible) continue
    const def = getIndicatorDef(inst.key)
    if (!def) continue
    let lines = computeInstance(inst, computeBase.value)
    // Ichimoku forward displacement onto projected slots
    lines = lines.map((ln) => {
      if (!ln.id.endsWith('+shift')) return ln
      const shift = disp(inst.params)
      const src = ln.data
      const slots = projectForward(
        src.map((x) => x.time),
        src.length ? (src[src.length - 1]?.time as WorkspaceCandle['time']) : '',
        shift,
      )
      const data = src.map((pt, i) => ({ time: slots[i] ?? pt.time, value: pt.value })).filter((x) => x.time)
      return { ...ln, label: `${ln.label} (+${toFaDigits(shift)})`, data }
    })
    // slice to display window (plus shifted points always kept)
    const sliced = lines.map((ln) => ({
      ...ln,
      data: ln.id.endsWith('+shift') ? ln.data : ln.data.filter((pt) => displayTimes.value.has(String(pt.time))),
    }))
    if (def.kind === 'overlay') overlays.push(...sliced)
    else if (def.kind === 'volume-overlay') vol.push(...sliced)
    else if (sliced.length) osc.push(sliced)
  }
  return { overlays, osc, vol }
})

const overlayLines = computed(() => built.value.overlays)
const oscGroups = computed(() => built.value.osc)
const volLines = computed(() => built.value.vol)

// legend
const legend = computed(() => hoverBar.value ?? (displayCandles.value.length ? displayCandles.value[displayCandles.value.length - 1]! : null))
const legendChange = computed(() => {
  const l = legend.value
  if (!l) return null
  const prev = [...displayCandles.value].reverse().find((c) => c.time !== l.time)?.close ?? l.open
  return l.close - prev
})
const legendChangePct = computed(() => {
  const l = legend.value
  if (!l || legendChange.value === null) return null
  const base = l.close - (legendChange.value as number)
  return base ? ((legendChange.value as number) / base) * 100 : 0
})

const headerRow = computed(() => market.symbols.find((s) => s.l18 === symbolParam.value))
const headerCompany = computed(() => detail.value?.l30 ?? headerRow.value?.l30 ?? '')
const headerMarket = computed(() => detail.value?.m ?? (headerRow.value?.market === 'etf' ? 'صندوق' : 'بورس'))
const headerPrice = computed(() => detail.value?.pc ?? headerRow.value?.pc ?? legend.value?.close ?? null)
const headerOhlc = computed(() => {
  const l = legend.value
  return l ? { open: l.open, high: l.high, low: l.low, close: l.close, volume: l.volume } : null
})

const watchRows = computed(() => watch.items.map((l18) => market.symbols.find((s) => s.l18 === l18)).filter((s) => s !== undefined))

const aggNote = computed(() => {
  if (prefs.set === 'intraday') return 'فقط روز جاری (سهمیه ۶۰ ثانیه‌ای)'
  if (agg.value === 'weekly') return 'تجمیع هفتگی سمت‌کاربر'
  if (agg.value === 'monthly') return 'تجمیع ماهانه سمت‌کاربر'
  return ''
})

// ---- actions ----
function setKind(k: ChartKind): void {
  prefs.kind = k
  savePrefs({ ...prefs })
}
function setSet(s: CandleSet): void {
  prefs.set = s
  savePrefs({ ...prefs })
  void reload()
}
function setAgg(a: Aggregate): void {
  agg.value = a
}
function setRange(days: number): void {
  prefs.range = days
  savePrefs({ ...prefs })
}
function onToggle(w: 'indicators' | 'volume' | 'magnet' | 'grid'): void {
  if (w === 'indicators') sidePanel.value = sidePanel.value === 'indicators' ? null : 'indicators'
  else if (w === 'volume') {
    prefs.volumeVisible = !prefs.volumeVisible
    savePrefs({ ...prefs })
  } else if (w === 'magnet') {
    prefs.crosshairMagnet = !prefs.crosshairMagnet
    savePrefs({ ...prefs })
    pro.value?.setMagnet(prefs.crosshairMagnet)
  } else {
    prefs.gridVisible = !prefs.gridVisible
    savePrefs({ ...prefs })
    pro.value?.setGrid(prefs.gridVisible)
  }
}
function resetView(): void {
  pro.value?.fitContent()
}

const pro = ref<{ fitContent: () => void; screenshot: () => string | null; setMagnet: (b: boolean) => void; setGrid: (b: boolean) => void } | null>(null)
const proApi = computed(() => {
  const p = pro.value as unknown as {
    timeToX: (t: WorkspaceCandle['time']) => number | null
    xToTime: (x: number) => WorkspaceCandle['time'] | null
    priceToY: (p: number) => number | null
    yToPrice: (y: number) => number | null
    plotSize: () => { w: number; h: number }
  } | null
  return p && candles.value.length ? p : null
})

function shot(): void {
  const url = pro.value?.screenshot()
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `${symbolParam.value}-chart.png`
  a.click()
}

// drawings
function setTool(t: 'cursor' | DrawingObject['type']): void {
  tool.value = t
  if (t === 'cursor') selectedId.value = null
}
function onCreate(d: DrawingObject): void {
  d.symbol = symbolParam.value
  drawings.value = history.commit([...history.current, d])
  selectedId.value = d.id
  syncHistFlags()
}
function onTransient(id: string, patch: Partial<DrawingObject>): void {
  const i = drawings.value.findIndex((x) => x.id === id)
  if (i < 0) return
  drawings.value[i] = { ...drawings.value[i]!, ...patch }
}
function onCommit(): void {
  drawings.value = history.commit([...drawings.value])
  syncHistFlags()
}
function doUndo(): void {
  const prev = history.undo()
  if (prev) {
    drawings.value = prev
    selectedId.value = null
    syncHistFlags()
  }
}
function doRedo(): void {
  const next = history.redo()
  if (next) {
    drawings.value = next
    syncHistFlags()
  }
}
const selected = computed(() => drawings.value.find((d) => d.id === selectedId.value) ?? null)

const TOOL_META: Record<string, { label: string; icon: string }> = {
  trendline: { label: 'خط روند', icon: 'trend' },
  ray: { label: 'پرتوی امتدادیافته', icon: 'ray' },
  hline: { label: 'خط افقی', icon: 'hline' },
  vline: { label: 'خط عمودی', icon: 'vline' },
  channel: { label: 'کانال موازی', icon: 'channel' },
  rect: { label: 'مستطیل', icon: 'rect' },
  'price-range': { label: 'بازه قیمتی', icon: 'pricerange' },
  'time-range': { label: 'بازه زمانی', icon: 'timerange' },
  fib: { label: 'فیبوناچی اصلاحی', icon: 'fib' },
  'fib-ext': { label: 'فیبوناچی گسترشی', icon: 'fibext' },
  text: { label: 'متن', icon: 'text' },
  arrow: { label: 'پیکان', icon: 'arrow' },
  brush: { label: 'قلم آزاد', icon: 'brush' },
}
const toolIcon = computed(() => TOOL_META[tool.value]?.icon ?? 'cursor')
const toolLabel = computed(() => TOOL_META[tool.value]?.label ?? '')
let textTimer = 0
function editSelectedText(v: string): void {
  if (!selectedId.value) return
  onTransient(selectedId.value, { text: v })
  window.clearTimeout(textTimer)
  textTimer = window.setTimeout(() => onCommit(), 600)
}
function toggleLock(): void {
  if (!selectedId.value) return
  const d = selected.value
  if (!d) return
  onTransient(selectedId.value, { locked: !d.locked })
  onCommit()
}
function toggleHide(): void {
  if (!selectedId.value) return
  const d = selected.value
  if (!d) return
  onTransient(selectedId.value, { hidden: !d.hidden })
  onCommit()
}
function removeSelected(): void {
  if (!selectedId.value) return
  drawings.value = history.commit(drawings.value.filter((d) => d.id !== selectedId.value))
  selectedId.value = null
  syncHistFlags()
}
function clearAll(): void {
  if (!drawings.value.length) return
  if (!window.confirm('همه ترسیم‌های این نماد حذف شود؟')) return
  drawings.value = history.commit([])
  selectedId.value = null
  syncHistFlags()
}

// indicators
function addIndicator(key: string): void {
  const inst = makeInstance(key)
  if (!inst) return
  indicators.value.push(inst)
  persistIndicators()
}
function removeIndicator(uid: string): void {
  indicators.value = indicators.value.filter((i) => i.uid !== uid)
  persistIndicators()
}
function toggleIndVisible(uid: string): void {
  const i = indicators.value.find((x) => x.uid === uid)
  if (!i) return
  i.visible = !i.visible
  persistIndicators()
}
function setIndParam(uid: string, key: string, value: number): void {
  const i = indicators.value.find((x) => x.uid === uid)
  if (!i || !Number.isFinite(value)) return
  i.params[key] = value
  persistIndicators()
}
function setIndColor(uid: string, key: string, value: string): void {
  const i = indicators.value.find((x) => x.uid === uid)
  if (!i) return
  i.colors[key] = value
  persistIndicators()
}

// navigation
function goSymbol(): void {
  const s = symbolQ.value.trim()
  if (!s) return
  void router.push(`/stocks/${encodeURIComponent(s)}/analysis`)
}
function goSymbolTo(s: string): void {
  void router.push(`/stocks/${encodeURIComponent(s)}/analysis`)
}

// keyboard
function onKey(e: KeyboardEvent): void {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.key === 'Escape') {
    tool.value = 'cursor'
    selectedId.value = null
    sheet.value = false
    if (sidePanel.value === 'indicators') sidePanel.value = null
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId.value) {
    e.preventDefault()
    removeSelected()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault()
    doUndo()
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault()
    doRedo()
  } else if (e.key.toLowerCase() === 'f') {
    void toggleFs()
  }
}

// auto refresh
function restartAuto(): void {
  window.clearInterval(autoTimer)
  autoTimer = 0
  if (auto.value) {
    autoTimer = window.setInterval(() => {
      if (!document.hidden) void reload()
    }, 90000)
  }
}
vueWatch(auto, restartAuto)

vueWatch(symbolParam, () => {
  reqToken++
  symbolQ.value = ''
  tool.value = 'cursor'
  hoverBar.value = null
  candles.value = []
  detail.value = null
  initDrawings()
  void reload()
  pro.value?.fitContent()
})

onMounted(() => {
  restoreIndicators()
  initDrawings()
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
  void reload()
  restartAuto()
})
onBeforeUnmount(() => {
  reqToken++
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKey)
  window.clearInterval(autoTimer)
  window.clearTimeout(textTimer)
})
</script>

<style scoped>
.analysis-root {
  /* flow layout: page scrolls instead of crushing children on zoom */
  min-height: 60dvh;
}
.fs-fallback {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--base);
  padding: 0.5rem;
  height: 100dvh !important;
  overflow-y: auto;
}
.fs-fallback .analysis-chart {
  height: calc(100dvh - 14rem) !important;
  max-height: none;
  min-height: 420px;
}
.fs-fallback:fullscreen {
  padding: 0.5rem;
}

/* loading spinner */
.loader-ring {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 9999px;
  border: 3px solid var(--line);
  border-top-color: var(--brand);
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .loader-ring {
    animation: none;
  }
}
</style>
