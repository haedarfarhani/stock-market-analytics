<template>
  <div ref="wrap" class="tv-workspace flex h-full w-full flex-col overflow-hidden bg-page text-ink select-none" :class="{ 'fs-mode': fsActive }">
    <!-- Top TradingView Toolbar -->
    <header class="flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface px-2 text-xs">
      <!-- Right zone (RTL start): Navigation, Symbol, Timeframes, Chart Type, Indicators -->
      <div class="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
        <!-- Site Menu Drawer Trigger -->
        <button
          @click="openAppSidebar"
          class="flex h-8 items-center gap-1 rounded-lg px-2 font-bold text-muted transition hover:bg-secondary hover:text-ink"
          title="منوی ناوبری سایت"
          aria-label="منوی سایت"
        >
          <span class="text-base leading-none">☰</span>
          <span class="hidden xl:inline">منو</span>
        </button>

        <!-- Back to stocks -->
        <RouterLink
          to="/stocks"
          class="flex h-8 items-center gap-1 rounded-lg px-2 font-bold text-muted transition hover:bg-secondary hover:text-ink"
          title="بازگشت به فهرست سهام"
        >
          <ChartIcon name="arrowRight" :size="16" />
          <span class="hidden md:inline">سهام</span>
        </RouterLink>

        <span class="h-4 w-px bg-line" aria-hidden="true" />

        <!-- Symbol selector trigger -->
        <button
          @click="searchModalOpen = true"
          class="flex h-8 items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 font-black text-ink transition hover:border-brand hover:bg-brand/10 hover:text-brand"
          title="جستجو و تغییر نماد (/)"
        >
          <span class="text-sm font-black text-brand">{{ symbolParam }}</span>
          <span class="text-[10px] text-muted font-normal hidden lg:inline max-w-[120px] truncate">{{ headerCompany }}</span>
          <ChartIcon name="chevron" :size="12" class="text-muted rotate-90" />
        </button>

        <!-- Star Watchlist Toggle -->
        <button
          @click="watch.toggle(symbolParam)"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary"
          :class="watch.has(symbolParam) ? 'text-amber-500' : 'hover:text-ink'"
          :title="watch.has(symbolParam) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'"
        >
          <ChartIcon name="star" :size="16" :stroke="watch.has(symbolParam) ? 2.5 : 1.8" />
        </button>

        <span class="h-4 w-px bg-line" aria-hidden="true" />

        <!-- Timeframe Selector -->
        <div class="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-0.5" role="group" aria-label="تایم‌فریم">
          <button
            @click="setSet('intraday')"
            class="h-7 rounded-md px-2 text-xs font-bold transition"
            :class="prefs.set === 'intraday' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
            title="کندل‌های ۲دقیقه‌ای امروز"
          >
            امروز
          </button>
          <button
            @click="setSetAndAgg('adjusted', 'daily')"
            class="h-7 rounded-md px-2 text-xs font-bold transition"
            :class="prefs.set !== 'intraday' && agg === 'daily' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
            title="تایم‌فریم روزانه (D)"
          >
            D
          </button>
          <button
            @click="setSetAndAgg('adjusted', 'weekly')"
            class="h-7 rounded-md px-2 text-xs font-bold transition"
            :class="prefs.set !== 'intraday' && agg === 'weekly' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
            title="تایم‌فریم هفتگی (W)"
          >
            W
          </button>
          <button
            @click="setSetAndAgg('adjusted', 'monthly')"
            class="h-7 rounded-md px-2 text-xs font-bold transition"
            :class="prefs.set !== 'intraday' && agg === 'monthly' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
            title="تایم‌فریم ماهانه (M)"
          >
            M
          </button>
        </div>

        <span class="h-4 w-px bg-line" aria-hidden="true" />

        <!-- Chart Kind Selector -->
        <div class="flex items-center gap-0.5 rounded-lg bg-secondary/50 p-0.5" role="group" aria-label="نوع نمودار">
          <button
            v-for="k in chartKinds"
            :key="k.key"
            @click="setKind(k.key)"
            :title="k.label"
            class="grid h-7 w-7 place-items-center rounded-md transition"
            :class="prefs.kind === k.key ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
          >
            <ChartIcon :name="k.icon" :size="18" />
          </button>
        </div>

        <span class="h-4 w-px bg-line" aria-hidden="true" />

        <!-- Indicators Trigger Button (fx) -->
        <button
          @click="openIndicators"
          class="flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-bold transition"
          :class="sidePanel === 'indicators' || activeMobileSheet === 'indicators' ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-secondary hover:text-ink'"
          title="افزودن و مدیریت اندیکاتورها (fx)"
        >
          <span class="font-serif italic font-black text-brand text-xs">fx</span>
          <span>اندیکاتورها</span>
          <span v-if="indicators.length" class="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand-solid px-1 text-[10px] font-bold text-white leading-none">
            {{ toFaDigits(indicators.length) }}
          </span>
        </button>

        <!-- Adjusted / Unadjusted Toggle -->
        <button
          v-if="prefs.set !== 'intraday'"
          @click="setSet(prefs.set === 'adjusted' ? 'unadjusted' : 'adjusted')"
          class="hidden sm:flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-muted transition hover:bg-secondary hover:text-ink"
          :title="prefs.set === 'adjusted' ? 'کندل‌های تعدیل‌شده' : 'کندل‌های تعدیل‌نشده'"
        >
          <span>{{ prefs.set === 'adjusted' ? 'تعدیل‌شده' : 'تعدیل‌نشده' }}</span>
        </button>

        <span class="h-4 w-px bg-line hidden sm:inline" aria-hidden="true" />

        <!-- Undo & Redo -->
        <div class="hidden sm:flex items-center gap-0.5">
          <button
            @click="doUndo"
            :disabled="!canUndo"
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary disabled:opacity-30"
            title="واگرد (Ctrl+Z)"
          >
            <ChartIcon name="undo" :size="16" />
          </button>
          <button
            @click="doRedo"
            :disabled="!canRedo"
            class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary disabled:opacity-30"
            title="ازنو (Ctrl+Y)"
          >
            <ChartIcon name="redo" :size="16" />
          </button>
        </div>
      </div>

      <!-- Left zone (RTL end): Actions, Settings, Fullscreen, Screenshot -->
      <div class="flex items-center gap-1 shrink-0">
        <!-- Watchlist panel toggle -->
        <button
          @click="toggleWatchlist"
          class="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition"
          :class="sidePanel === 'watch' || activeMobileSheet === 'watch' ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-secondary hover:text-ink'"
          title="نمادهای دیده‌بان"
        >
          <ChartIcon name="layers" :size="16" />
          <span class="hidden md:inline">دیده‌بان</span>
        </button>

        <!-- Quick Settings Menu / Drawer -->
        <button
          @click="openSettings"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary hover:text-ink"
          title="تنظیمات نمودار (شبکه، آهنربا، حجم)"
        >
          <ChartIcon name="settings" :size="17" />
        </button>

        <!-- Screenshot camera -->
        <button
          @click="shot"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary hover:text-ink"
          title="دانلود تصویر نمودار"
        >
          <ChartIcon name="camera" :size="17" />
        </button>

        <!-- Refresh button -->
        <button
          @click="reload(true)"
          :disabled="loading"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary hover:text-ink disabled:opacity-40"
          title="تازه‌سازی داده‌ها"
        >
          <span :class="{ 'animate-spin': loading }">
            <ChartIcon name="refresh" :size="16" />
          </span>
        </button>

        <!-- Fullscreen toggle -->
        <button
          @click="toggleFs"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-secondary hover:text-ink"
          :title="fsActive ? 'خروج از تمام‌صفحه (F)' : 'تمام‌صفحه (F)'"
        >
          <ChartIcon :name="fsActive ? 'exitfull' : 'fullscreen'" :size="17" />
        </button>
      </div>
    </header>

    <!-- Main Workspace (attached chart canvas + left drawing rail + side panels) -->
    <div class="relative flex min-h-0 flex-1 items-stretch overflow-hidden">
      <!-- Main Chart Area -->
      <div class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-page">
        <!-- Floating In-Chart Legend (TradingView style overlay inside the canvas) -->
        <div class="pointer-events-none absolute top-2 right-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface/80 px-2.5 py-1 text-xs backdrop-blur-xs border border-line/50 tnum select-text shadow-xs">
          <span class="font-black text-ink">{{ headerCompany || symbolParam }}</span>
          <span v-if="headerMarket" class="rounded bg-secondary px-1 text-[10px] font-bold text-muted">{{ headerMarket }}</span>
          <span class="text-line" aria-hidden="true">·</span>
          <span>آخرین: <strong :class="changeClass(legendChangePct)">{{ formatFaNumber(legend?.close ?? headerPrice) }}</strong></span>
          <span
            v-if="legendChangePct != null"
            class="font-bold text-[11px]"
            :class="changeClass(legendChangePct)"
          >
            ({{ formatFaPercent(legendChangePct) }})
          </span>
          <span class="text-line hidden sm:inline" aria-hidden="true">·</span>
          <span class="hidden sm:inline">کمترین: <strong class="text-rose-500 font-bold">{{ formatFaNumber(legend?.low) }}</strong></span>
          <span class="text-line hidden sm:inline" aria-hidden="true">·</span>
          <span class="hidden sm:inline">بیشترین: <strong class="text-emerald-500 font-bold">{{ formatFaNumber(legend?.high) }}</strong></span>
          <span class="text-line hidden md:inline" aria-hidden="true">·</span>
          <span class="hidden md:inline">باز: <strong>{{ formatFaNumber(legend?.open) }}</strong></span>
          <span v-if="legend?.volume" class="text-line hidden md:inline" aria-hidden="true">·</span>
          <span v-if="legend?.volume" class="hidden md:inline">حجم: <strong class="text-ink">{{ formatCompactFa(legend.volume) }}</strong></span>
          <span v-if="isMockNow" class="rounded bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-500">داده آزمایشی</span>
        </div>

        <!-- Floating Active Tool HUD (when drawing tool is selected) -->
        <div
          v-if="tool !== 'cursor'"
          class="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex max-w-[95%] items-center gap-2 rounded-xl border border-brand/50 bg-surface/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md"
        >
          <div class="flex items-center gap-1.5 font-bold text-brand">
            <ChartIcon :name="toolIcon" :size="16" />
            <span>{{ toolLabel }}</span>
          </div>
          <span class="hidden sm:inline text-[11px] text-muted">· برای ترسیم روی نمودار کلیک یا درگ کنید</span>
          <div class="flex items-center gap-1">
            <input
              v-model="drawStyle.color"
              type="color"
              class="h-5 w-5 cursor-pointer rounded border border-line bg-transparent p-0"
              title="رنگ"
            />
            <select
              v-model.number="drawStyle.width"
              class="rounded border border-line bg-surface px-1 text-[11px] font-bold"
              title="ضخامت"
            >
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
              <option :value="4">4</option>
            </select>
          </div>
          <button
            @click="setTool('cursor')"
            class="flex items-center gap-1 rounded-md bg-rose-500/10 text-rose-600 px-2 py-0.5 text-xs font-bold hover:bg-rose-500/20"
          >
            <ChartIcon name="close" :size="12" />
            <span>انصراف</span>
          </button>
        </div>

        <!-- Loading spinner overlay -->
        <div v-if="loading && !candles.length" class="absolute inset-0 z-10 grid place-items-center bg-surface/80 backdrop-blur-xs">
          <div class="flex flex-col items-center gap-3">
            <span class="loader-ring" aria-hidden="true" />
            <p class="text-xs font-bold text-ink">در حال آماده‌سازی نمودار…</p>
          </div>
        </div>

        <!-- Canvas Container -->
        <div class="relative min-h-0 flex-1 w-full overflow-hidden">
          <ProChart
            ref="pro"
            :candles="displayCandles"
            :kind="prefs.kind"
            :volume-visible="prefs.volumeVisible"
            :grid-visible="prefs.gridVisible"
            :magnet="prefs.crosshairMagnet"
            :overlays="overlayLines"
            :oscillators="oscGroups"
            :volume-overlay="volLines"
            @hover="hoverBar = $event"
            @ready="frame++"
            @view-change="frame++"
          />

          <!-- Drawing Layer -->
          <DrawingLayer
            v-if="proApi && (candles.length || displayCandles.length)"
            :frame="frame"
            :drawings="drawings"
            :tool="tool"
            :selected-id="selectedId"
            :style="drawStyle"
            :api="proApi"
            @create="onCreate"
            @update="onTransient"
            @commit="onCommit"
            @select="selectedId = $event"
          />

          <!-- Quota notice (AppLayout hides its banner on this page) -->
          <div
            v-if="quota.limited"
            class="absolute bottom-2 left-1/2 z-20 flex max-w-[95%] -translate-x-1/2 items-center gap-2 rounded-xl border border-rose-500/40 bg-surface/95 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur-md"
            role="alert"
          >
            <span aria-hidden="true">⛔</span>
            <p class="min-w-0 flex-1 text-rose-800 dark:text-rose-200">
              <strong>محدودیت API:</strong> {{ quota.message }}
            </p>
            <button
              @click="quota.dismiss(); reload(true)"
              class="shrink-0 rounded-lg bg-brand-solid px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-strong"
            >
              تلاش مجدد
            </button>
            <button @click="quota.dismiss()" class="shrink-0 rounded-lg px-1.5 py-1 font-bold" aria-label="بستن">✕</button>
          </div>
        </div>

        <!-- Bottom TradingView Bar (Ranges & Timezone & Scale) -->
        <footer class="flex h-8 shrink-0 items-center justify-between border-t border-line bg-surface px-2 text-[11px] text-muted">
          <!-- Left: Auto / Log / Clock -->
          <div class="flex items-center gap-1.5 tnum">
            <button
              @click="resetView"
              class="rounded px-1.5 py-0.5 font-bold transition hover:bg-secondary hover:text-ink text-brand"
              title="تنظیم خودکار مقیاس نما (Fit Content)"
            >
              خودکار
            </button>
            <span class="text-line" aria-hidden="true">·</span>
            <span>(UTC+3:30) {{ tehranClock }}</span>
            <span v-if="datasetSource" class="hidden xl:inline text-line" aria-hidden="true">·</span>
            <span v-if="datasetSource" class="hidden xl:inline text-[10px] text-muted">{{ datasetSource }}</span>
          </div>

          <!-- Right: Range Presets (1M, 3M, 6M, 1Y, 5Y, All) -->
          <div v-if="prefs.set !== 'intraday'" class="flex items-center gap-0.5" role="group" aria-label="بازه تاریخی">
            <button
              v-for="r in rangePresets"
              :key="r.days"
              @click="setRange(r.days)"
              class="rounded px-1.5 py-0.5 font-bold transition"
              :class="prefs.range === r.days ? 'bg-brand/10 text-brand font-black' : 'text-muted hover:text-ink hover:bg-secondary'"
            >
              {{ r.label }}
            </button>
          </div>
        </footer>
      </div>

      <!-- Left Vertical Drawing Rail (Directly attached to canvas, full height) -->
      <div class="hidden h-full w-11 shrink-0 flex-col overflow-y-auto no-scrollbar border-e border-line bg-surface p-0.5 lg:flex">
        <DrawingToolbar
          vertical
          :tool="tool"
          :selected="selected"
          :color="drawStyle.color"
          :width="drawStyle.width"
          :line-style="drawStyle.style"
          @tool="setTool"
          @update:color="drawStyle.color = $event"
          @update:width="drawStyle.width = $event"
          @update:lineStyle="drawStyle.style = $event"
          @edit-text="editSelectedText"
          @lock="toggleLock"
          @hide="toggleHide"
          @remove="removeSelected"
          @clear="clearAll"
        />
      </div>

      <!-- Desktop Side Panel Drawer (Indicators / Watchlist) -->
      <aside v-if="sidePanel" class="hidden h-full w-80 shrink-0 flex-col overflow-hidden border-s border-line bg-surface xl:flex">
        <div class="flex items-center border-b border-line bg-secondary/30 p-1.5">
          <button
            @click="sidePanel = 'indicators'"
            class="flex-1 rounded-lg py-1 text-xs font-bold transition"
            :class="sidePanel === 'indicators' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
          >
            اندیکاتورها ({{ toFaDigits(indicators.length) }})
          </button>
          <button
            @click="sidePanel = 'watch'"
            class="flex-1 rounded-lg py-1 text-xs font-bold transition"
            :class="sidePanel === 'watch' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
          >
            دیده‌بان ({{ toFaDigits(watchRows.length) }})
          </button>
          <button
            @click="sidePanel = null"
            class="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-secondary hover:text-ink"
            title="بستن"
          >
            <ChartIcon name="close" :size="14" />
          </button>
        </div>

        <div v-if="sidePanel === 'indicators'" class="flex-1 overflow-hidden">
          <IndicatorPanel
            :instances="indicators"
            @add="addIndicator"
            @remove="removeIndicator"
            @visible="toggleIndVisible"
            @param="setIndParam"
            @color="setIndColor"
          />
        </div>

        <div v-else-if="sidePanel === 'watch'" class="flex h-full flex-col p-3">
          <div class="flex items-center justify-between pb-2 border-b border-line text-xs font-bold text-ink">
            <span>نمادهای برگزیده</span>
            <span class="tnum text-muted">{{ toFaDigits(watchRows.length) }} نماد</span>
          </div>
          <ul class="mt-2 flex-1 space-y-1 overflow-y-auto">
            <li v-for="s in watchRows" :key="s.l18">
              <button
                @click="goSymbolTo(s.l18)"
                class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-right text-xs transition hover:bg-secondary"
                :class="s.l18 === symbolParam ? 'bg-brand/10 text-brand font-bold' : ''"
              >
                <span class="font-bold">{{ s.l18 }}</span>
                <span class="truncate text-[11px] text-muted max-w-[85px]">{{ s.l30 }}</span>
                <span class="tnum ms-auto font-bold">{{ formatFaNumber(s.pc) }}</span>
                <ChangeBadge :value="s.pcp" />
              </button>
            </li>
          </ul>
          <div v-if="!watchRows.length" class="py-12 text-center text-xs text-muted">
            دیده‌بان خالی است. با ستاره بالای صفحه نماد اضافه کنید.
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile Bottom Sheets (Drawings, Indicators, Watchlist, Settings) -->
    <div
      v-if="activeMobileSheet"
      class="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      :aria-label="sheetTitle"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" @click="activeMobileSheet = null" />
      <div class="absolute inset-x-0 bottom-0 max-h-[82vh] flex flex-col rounded-t-2xl border-t border-brand/40 bg-surface shadow-2xl">
        <div class="p-3 border-b border-line shrink-0 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-sm font-black text-ink">
            <ChartIcon :name="sheetIcon" :size="18" />
            <span>{{ sheetTitle }}</span>
          </h3>
          <button
            @click="activeMobileSheet = null"
            class="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-ink"
          >
            <ChartIcon name="close" :size="16" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3">
          <!-- Indicators -->
          <div v-if="activeMobileSheet === 'indicators'" class="h-[62vh]">
            <IndicatorPanel
              :instances="indicators"
              @add="addIndicator"
              @remove="removeIndicator"
              @visible="toggleIndVisible"
              @param="setIndParam"
              @color="setIndColor"
            />
          </div>

          <!-- Drawings -->
          <div v-else-if="activeMobileSheet === 'drawings'">
            <DrawingToolbar
              :tool="tool"
              :selected="selected"
              :color="drawStyle.color"
              :width="drawStyle.width"
              :line-style="drawStyle.style"
              @tool="(t) => { setTool(t); if (t !== 'cursor') activeMobileSheet = null }"
              @update:color="drawStyle.color = $event"
              @update:width="drawStyle.width = $event"
              @update:lineStyle="drawStyle.style = $event"
              @edit-text="editSelectedText"
              @lock="toggleLock"
              @hide="toggleHide"
              @remove="removeSelected"
              @clear="clearAll"
            />
          </div>

          <!-- Watchlist -->
          <div v-else-if="activeMobileSheet === 'watch'" class="space-y-1">
            <ul v-if="watchRows.length" class="space-y-1">
              <li v-for="s in watchRows" :key="s.l18">
                <button
                  @click="goSymbolTo(s.l18); activeMobileSheet = null"
                  class="flex w-full items-center gap-2 rounded-xl border border-line p-2 text-right transition hover:border-brand"
                  :class="s.l18 === symbolParam ? 'border-brand bg-brand/5' : ''"
                >
                  <span class="font-bold text-sm text-ink">{{ s.l18 }}</span>
                  <span class="truncate text-xs text-muted max-w-[120px]">{{ s.l30 }}</span>
                  <span class="tnum ms-auto font-bold text-xs">{{ formatFaNumber(s.pc) }}</span>
                  <ChangeBadge :value="s.pcp" />
                </button>
              </li>
            </ul>
            <p v-else class="py-10 text-center text-xs text-muted">دیده‌بان خالی است.</p>
          </div>

          <!-- Settings -->
          <div v-else-if="activeMobileSheet === 'settings'" class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="onToggleToolbar('volume')"
                class="flex items-center justify-between rounded-xl border border-line p-2.5 text-xs font-bold"
                :class="prefs.volumeVisible ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>حجم معاملات</span>
                <span>{{ prefs.volumeVisible ? 'فعال' : 'خاموش' }}</span>
              </button>
              <button
                @click="onToggleToolbar('grid')"
                class="flex items-center justify-between rounded-xl border border-line p-2.5 text-xs font-bold"
                :class="prefs.gridVisible ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>شبکه (Grid)</span>
                <span>{{ prefs.gridVisible ? 'فعال' : 'خاموش' }}</span>
              </button>
              <button
                @click="onToggleToolbar('magnet')"
                class="flex items-center justify-between rounded-xl border border-line p-2.5 text-xs font-bold"
                :class="prefs.crosshairMagnet ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>آهنربا (Magnet)</span>
                <span>{{ prefs.crosshairMagnet ? 'فعال' : 'خاموش' }}</span>
              </button>
              <button
                @click="auto = !auto"
                class="flex items-center justify-between rounded-xl border border-line p-2.5 text-xs font-bold"
                :class="auto ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>به‌روزرسانی خودکار</span>
                <span>{{ auto ? 'فعال' : 'خاموش' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Symbol Search Modal -->
    <div
      v-if="searchModalOpen"
      class="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6"
      role="dialog"
      aria-label="جستجوی نماد"
    >
      <div class="fixed inset-0 bg-black/60 backdrop-blur-xs" @click="searchModalOpen = false" />
      <div class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div class="flex items-center gap-2 border-b border-line p-3 bg-secondary/30">
          <ChartIcon name="search" :size="20" class="text-muted shrink-0" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            placeholder="نام نماد یا شرکت را وارد کنید… (مثلاً فولاد)"
            class="flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-muted placeholder:font-normal"
            @keyup.enter="selectFirstSearchResult"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-secondary"
          >
            <ChartIcon name="close" :size="14" />
          </button>
          <kbd class="hidden sm:inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted border border-line">ESC</kbd>
        </div>

        <div v-if="!searchQuery && watchRows.length" class="p-2 border-b border-line bg-secondary/15 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span class="text-[11px] text-muted shrink-0">دیده‌بان:</span>
          <button
            v-for="s in watchRows.slice(0, 6)"
            :key="s.l18"
            @click="goSymbolTo(s.l18); searchModalOpen = false"
            class="rounded-lg bg-surface px-2 py-1 text-xs font-bold text-ink border border-line transition hover:border-brand hover:text-brand shrink-0"
          >
            {{ s.l18 }}
          </button>
        </div>

        <div class="max-h-80 overflow-y-auto p-2">
          <ul v-if="filteredSymbols.length" class="space-y-1">
            <li v-for="s in filteredSymbols" :key="s.l18">
              <button
                @click="goSymbolTo(s.l18); searchModalOpen = false"
                class="flex w-full items-center gap-2 rounded-xl p-2.5 text-right transition hover:bg-secondary"
                :class="s.l18 === symbolParam ? 'bg-brand/10 border border-brand/20 font-bold' : ''"
              >
                <div class="brand-gradient grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white">
                  {{ s.l18.slice(0, 1) }}
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-sm text-ink truncate">{{ s.l18 }}</p>
                  <p class="text-xs text-muted truncate max-w-[220px]">{{ s.l30 }}</p>
                </div>
                <div class="ms-auto text-left tnum">
                  <p class="font-bold text-xs text-ink">{{ formatFaNumber(s.pc) }}</p>
                  <ChangeBadge :value="s.pcp" />
                </div>
              </button>
            </li>
          </ul>
          <div v-else class="py-12 text-center text-xs text-muted">
            <p>نمادی با عنوان «{{ searchQuery }}» یافت نشد.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch as vueWatch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toJalaali } from 'jalaali-js'
import { useMarketStore } from '@/stores/market'
import { useQuotaStore } from '@/stores/quota'
import { useWatchlistStore } from '@/stores/watchlist'
import { fetchDataset, resample, type Aggregate } from '@/chart/data.ts'
import { computeInstance, getIndicatorDef, makeInstance } from '@/chart/indicators.ts'
import { DrawingHistory, loadDrawings, loadIndicatorState, loadPrefs, saveIndicatorState, savePrefs } from '@/chart/persistence.ts'
import type { CandleSet, ChartKind, DrawingObject, IndicatorInstance, WorkspaceCandle } from '@/chart/types.ts'
import { fetchSymbolDetail, hasApiKey } from '@/services/api'
import type { TsetmcSymbolDetail } from '@/types/market'
import { changeClass, formatFaNumber, formatFaPercent, toFaDigits, formatCompactFa, tehranNow } from '@/utils/format'
import { mockCandles } from '@/data/mock.ts'
import ProChart from '@/components/chart/ProChart.vue'
import ChartIcon from '@/components/chart/ChartIcon.vue'
import DrawingLayer from '@/components/chart/DrawingLayer.vue'
import DrawingToolbar from '@/components/chart/DrawingToolbar.vue'
import IndicatorPanel from '@/components/chart/IndicatorPanel.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'

void changeClass

const route = useRoute()
const router = useRouter()
const market = useMarketStore()
const quota = useQuotaStore()
const watch = useWatchlistStore()

const symbolParam = computed(() => decodeURIComponent(String(route.params.symbol ?? '')))

// quick search modal
const searchModalOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

vueWatch(searchModalOpen, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

const filteredSymbols = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) {
    return market.symbols.slice(0, 30)
  }
  return market.symbols.filter((s) => s.l18.includes(q) || (s.l30 && s.l30.includes(q))).slice(0, 30)
})

function selectFirstSearchResult(): void {
  const first = filteredSymbols.value[0]
  if (first) {
    goSymbolTo(first.l18)
    searchModalOpen.value = false
  }
}

// mobile sheet state
type MobileSheetType = 'drawings' | 'indicators' | 'watch' | 'settings' | null
const activeMobileSheet = ref<MobileSheetType>(null)

function openMobileSheet(type: MobileSheetType): void {
  activeMobileSheet.value = activeMobileSheet.value === type ? null : type
}

function openAppSidebar(): void {
  window.dispatchEvent(new CustomEvent('open-app-sidebar'))
}

function openIndicators(): void {
  if (window.innerWidth < 1280) {
    openMobileSheet('indicators')
  } else {
    sidePanel.value = sidePanel.value === 'indicators' ? null : 'indicators'
  }
}

function toggleWatchlist(): void {
  if (window.innerWidth < 1280) {
    openMobileSheet('watch')
  } else {
    sidePanel.value = sidePanel.value === 'watch' ? null : 'watch'
  }
}

function openSettings(): void {
  if (window.innerWidth < 1280) {
    openMobileSheet('settings')
  } else {
    onToggleToolbar('volume')
  }
}

const sheetTitle = computed(() => {
  switch (activeMobileSheet.value) {
    case 'drawings':
      return 'ابزارهای ترسیم'
    case 'indicators':
      return 'اندیکاتورها (fx)'
    case 'watch':
      return 'نمادهای دیده‌بان'
    case 'settings':
      return 'تنظیمات نمودار'
    default:
      return ''
  }
})

const sheetIcon = computed(() => {
  switch (activeMobileSheet.value) {
    case 'drawings':
      return 'brush'
    case 'indicators':
      return 'indicators'
    case 'watch':
      return 'star'
    case 'settings':
      return 'settings'
    default:
      return 'info'
  }
})

// prefs + ui state
const prefs = reactive(loadPrefs())
const agg = ref<Aggregate>('daily')
const tool = ref<'cursor' | DrawingObject['type']>('cursor')
const drawStyle = reactive({ color: '#f472b6', width: 2 as number, style: 'solid' as 'solid' | 'dashed' | 'dotted', opacity: 1 })
const sidePanel = ref<'indicators' | 'watch' | null>(null)
const auto = ref(false)
const frame = ref(0)

// live clock
const tehranClock = ref(toFaDigits(new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' })))
let clockInterval = 0

// data state
const candles = ref<WorkspaceCandle[]>([])
const datasetSource = ref('')
const loading = ref(false)
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
  activeMobileSheet.value = null
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
  if (!fsNative.value) restorePanelsAfterFs()
  frame.value++
}

function asciiTodayJalali(): string {
  const j = toJalaali(new Date())
  return `${j.jy}-${String(j.jm).padStart(2, '0')}-${String(j.jd).padStart(2, '0')}`
}

const headerRow = computed(() => market.symbols.find((s) => s.l18 === symbolParam.value))
const headerCompany = computed(() => detail.value?.l30 ?? headerRow.value?.l30 ?? '')
const headerMarket = computed(() => detail.value?.m ?? (headerRow.value?.market === 'etf' ? 'صندوق' : 'بورس'))
const headerPrice = computed(() => detail.value?.pc ?? headerRow.value?.pc ?? legend.value?.close ?? null)

async function reload(force = false): Promise<void> {
  void force
  const sym = symbolParam.value
  if (!sym) return

  const my = ++reqToken
  loading.value = true
  try {
    await market.load(false, { indices: false })
    if (!hasApiKey()) {
      applyMockFallback()
      return
    }
    const [ds, det] = await Promise.all([
      fetchDataset(sym, prefs.set, detail.value?.date_update ?? asciiTodayJalali()),
      fetchSymbolDetail({ l18: sym }).catch(() => null),
    ])
    if (my !== reqToken) return
    detail.value = det
    if (ds.candles.length) {
      candles.value = ds.candles
      if (ds.stale) {
        // Real data from the persistent cache (API limited or unreachable).
        // Never badge this as mock: it is the symbol's own last-known candles.
        const f = tehranNow(new Date(ds.fetchedAt))
        datasetSource.value = `داده ذخیره‌شده (${f.dateFa} ${f.timeFa})`
      } else {
        datasetSource.value =
          ds.source === 'candlestick-intraday'
            ? 'کندل‌های ۲دقیقه‌ای امروز (زنده)'
            : ds.source.includes('unadjusted')
              ? 'کندل روزانه تعدیل‌نشده (TSETMC)'
              : 'کندل روزانه تعدیل‌شده (TSETMC)'
      }
      isMockNow.value = false
    } else {
      applyMockFallback()
    }
  } catch {
    if (my !== reqToken) return
    // Always fallback to mock on API errors or quota limits so chart is NEVER blank!
    applyMockFallback()
  } finally {
    if (my === reqToken) {
      loading.value = false
      nextTick(() => pro.value?.fitContent())
    }
  }
}

function applyMockFallback(): void {
  const base = headerPrice.value ?? 18500
  const points = mockCandles(base, 365)
  candles.value = points.map((p) => ({
    time: p.time,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
  }))
  datasetSource.value = 'کندل‌های روزانه شبیه‌سازی‌شده (پشتیبان)'
  isMockNow.value = true
}

// derived series
const displayCandles = computed(() => {
  if (prefs.set === 'intraday') return candles.value
  const aggd = resample(candles.value, agg.value)
  if (!prefs.range) return aggd
  return aggd.slice(-prefs.range)
})

const computeBase = computed(() => {
  if (prefs.set === 'intraday') return candles.value
  const aggd = resample(candles.value, agg.value)
  return aggd.slice(-Math.max(prefs.range || aggd.length, 400))
})

const displayTimes = computed(() => new Set(displayCandles.value.map((c) => String(c.time))))

function projectForward(times: WorkspaceCandle['time'][], last: WorkspaceCandle['time'], n: number): WorkspaceCandle['time'][] {
  void times
  if (typeof last === 'number') return Array.from({ length: n }, (_, i) => last + (i + 1) * 120)
  const out: WorkspaceCandle['time'][] = []
  const d = new Date(`${last}T00:00:00Z`)
  if (!Number.isFinite(d.getTime())) return out
  let cur = d.getTime()
  while (out.length < n) {
    cur += 86400000
    const w = new Date(cur).getUTCDay()
    if (w === 5) continue
    out.push(new Date(cur).toISOString().slice(0, 10))
  }
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

const watchRows = computed(() => watch.items.map((l18) => market.symbols.find((s) => s.l18 === l18)).filter((s) => s !== undefined))

// actions
function setKind(k: ChartKind): void {
  prefs.kind = k
  savePrefs({ ...prefs })
}
function setSet(s: CandleSet): void {
  prefs.set = s
  savePrefs({ ...prefs })
  void reload()
}
function setSetAndAgg(s: CandleSet, a: Aggregate): void {
  prefs.set = s
  agg.value = a
  savePrefs({ ...prefs })
  void reload()
}
function setRange(days: number): void {
  prefs.range = days
  savePrefs({ ...prefs })
}

function onToggleToolbar(w: 'volume' | 'magnet' | 'grid'): void {
  if (w === 'volume') {
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

const pro = ref<{
  fitContent: () => void
  screenshot: () => string | null
  setMagnet: (b: boolean) => void
  setGrid: (b: boolean) => void
  timeToX: (t: WorkspaceCandle['time']) => number | null
  xToTime: (x: number) => WorkspaceCandle['time'] | null
  priceToY: (p: number) => number | null
  yToPrice: (y: number) => number | null
  plotSize: () => { w: number; h: number }
} | null>(null)

const proApi = computed(() => {
  const p = pro.value
  return p && (candles.value.length > 0 || displayCandles.value.length > 0) ? p : null
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
    activeMobileSheet.value = null
    searchModalOpen.value = false
    if (sidePanel.value === 'indicators') sidePanel.value = null
  } else if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault()
    searchModalOpen.value = true
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
  tool.value = 'cursor'
  hoverBar.value = null
  candles.value = []
  detail.value = null
  initDrawings()
  void reload()
})

const chartKinds: Array<{ key: ChartKind; label: string; icon: string }> = [
  { key: 'candles', label: 'کندل‌استیک', icon: 'candle' },
  { key: 'bars', label: 'میله‌ای', icon: 'bars' },
  { key: 'line', label: 'خطی', icon: 'line' },
  { key: 'area', label: 'ناحیه‌ای', icon: 'area' },
  { key: 'baseline', label: 'خط مبنا', icon: 'baseline' },
]

const rangePresets = [
  { days: 1, label: '۱روز' },
  { days: 7, label: '۷روز' },
  { days: 30, label: '۱ماه' },
  { days: 90, label: '۳ماه' },
  { days: 180, label: '۶ماه' },
  { days: 365, label: '۱سال' },
  { days: 0, label: 'همه' },
]

onMounted(() => {
  restoreIndicators()
  initDrawings()
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
  void reload()
  restartAuto()
  clockInterval = window.setInterval(() => {
    tehranClock.value = toFaDigits(new Date().toLocaleTimeString('fa-IR', { timeZone: 'Asia/Tehran' }))
  }, 1000)
})

onBeforeUnmount(() => {
  reqToken++
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKey)
  window.clearInterval(autoTimer)
  window.clearInterval(clockInterval)
  window.clearTimeout(textTimer)
})
</script>

<style scoped>
.tv-workspace {
  height: 100dvh;
  width: 100%;
}

.fs-mode {
  position: fixed;
  inset: 0;
  z-index: 100;
  height: 100dvh !important;
  width: 100vw !important;
}

.loader-ring {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  border: 3px solid var(--line);
  border-top-color: var(--brand);
  animation: spin 0.85s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .loader-ring {
    animation: none;
  }
}
</style>
