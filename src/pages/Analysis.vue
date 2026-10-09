<template>
  <div ref="wrap" class="analysis-root flex min-h-0 flex-1 flex-col gap-2 pb-14 lg:pb-0" :class="{ 'fs-fallback': fsFallback }">
    <!-- Top Station Header -->
    <header class="overflow-hidden rounded-2xl border border-line bg-surface p-2.5 sm:p-3 shadow-xs">
      <!-- Zone 1: Identity & Navigation & Actions -->
      <div class="flex items-center justify-between gap-2">
        <!-- Right: Back button + Monogram + Title & Market badge -->
        <div class="flex min-w-0 items-center gap-2">
          <RouterLink
            to="/stocks"
            class="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-secondary/60 px-2.5 text-xs font-bold text-ink transition hover:border-brand hover:bg-brand/10 hover:text-brand shrink-0"
            title="بازگشت به فهرست سهام"
          >
            <ChartIcon name="arrowRight" :size="16" />
            <span class="hidden sm:inline">سهام</span>
          </RouterLink>

          <div
            class="brand-gradient grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-xl text-base sm:text-lg font-black text-white shadow-md shadow-brand/25"
            aria-hidden="true"
          >
            {{ (symbolParam || '؟').slice(0, 1) }}
          </div>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <h1 class="text-base sm:text-lg font-black text-ink tracking-tight truncate">
                {{ symbolParam }}
              </h1>
              <span v-if="headerMarket" class="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted">
                {{ headerMarket }}
              </span>
              <span
                v-if="detail?.state"
                class="rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold"
                :title="`وضعیت معاملاتی: ${detail.state}`"
              >
                {{ detail.state }}
              </span>
            </div>
            <p class="truncate text-xs text-muted max-w-[160px] sm:max-w-md" :title="headerCompany">
              {{ headerCompany }}
            </p>
          </div>
        </div>

        <!-- Left: Quick Actions -->
        <div class="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <!-- Star Watchlist toggle -->
          <button
            @click="watch.toggle(symbolParam)"
            class="grid h-9 w-9 place-items-center rounded-xl border border-line transition hover:border-brand"
            :class="watch.has(symbolParam) ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' : 'text-muted hover:text-ink'"
            :title="watch.has(symbolParam) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'"
            :aria-label="watch.has(symbolParam) ? 'حذف از دیده‌بان' : 'افزودن به دیده‌بان'"
          >
            <ChartIcon name="star" :size="18" :stroke="watch.has(symbolParam) ? 2.5 : 1.8" />
          </button>

          <!-- Quick Search Trigger Modal -->
          <button
            @click="searchModalOpen = true"
            class="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-secondary/50 px-2 sm:px-2.5 text-xs font-bold text-muted transition hover:border-brand hover:text-brand"
            title="جستجوی سریع نماد (/)"
          >
            <ChartIcon name="search" :size="16" />
            <span class="hidden md:inline">جستجوی نماد</span>
            <kbd class="hidden md:inline-block rounded bg-surface px-1 text-[10px] font-mono border border-line text-muted">/</kbd>
          </button>

          <!-- Stock Details Fundamental Link -->
          <RouterLink
            :to="`/stocks/${encodeURIComponent(symbolParam)}`"
            class="hidden sm:flex h-9 items-center gap-1 rounded-xl border border-line px-2.5 text-xs font-bold text-muted transition hover:border-brand hover:text-brand"
            title="مشاهده مشخصات و آمار معاملات"
          >
            <ChartIcon name="info" :size="16" />
            <span class="hidden xl:inline">مشخصات</span>
          </RouterLink>

          <!-- Refresh button -->
          <button
            @click="reload(true)"
            :disabled="loading"
            class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
            title="به‌روزرسانی داده‌ها"
            aria-label="به‌روزرسانی"
          >
            <span :class="{ 'animate-spin': loading }">
              <ChartIcon name="refresh" :size="17" />
            </span>
          </button>

          <!-- Fullscreen toggle -->
          <button
            @click="toggleFs"
            class="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted transition hover:border-brand hover:text-brand"
            :title="fsActive ? 'خروج از تمام‌صفحه (F)' : 'تمام‌صفحه (F)'"
            aria-label="تمام‌صفحه"
          >
            <ChartIcon :name="fsActive ? 'exitfull' : 'fullscreen'" :size="18" />
          </button>
        </div>
      </div>

      <!-- Zone 2: Price & Dynamic Live/Hover OHLC Ticker Bar -->
      <div class="mt-2.5 border-t border-line/70 pt-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <!-- Last Price & Change Badge -->
        <div class="flex items-baseline gap-2.5 shrink-0">
          <span class="text-xs text-muted">قیمت پایانی:</span>
          <span class="tnum text-xl sm:text-2xl font-black" :class="changeClass(legendChangePct)">
            {{ formatFaNumber(legend?.close ?? headerPrice) }}
            <span class="text-[11px] font-normal text-muted">ریال</span>
          </span>
          <span
            class="tnum inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold"
            :class="(legendChangePct ?? 0) >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'"
          >
            <span>{{ (legendChangePct ?? 0) >= 0 ? '▲' : '▼' }}</span>
            <span>{{ formatFaPercent(legendChangePct) }}</span>
            <span class="text-[10px] opacity-80">({{ formatFaNumber(legendChange) }})</span>
          </span>
        </div>

        <!-- OHLC Ticker Metrics (Dynamically shows hovered bar, or latest bar) -->
        <div class="no-scrollbar flex items-center gap-2 overflow-x-auto text-xs text-muted py-0.5">
          <span v-if="hoverBar" class="rounded bg-brand/10 text-brand px-1.5 py-0.5 text-[10px] font-bold shrink-0">
            کندل انتخابی: {{ formatCandleTime(hoverBar.time) }}
          </span>
          <div class="flex items-center gap-2 tnum whitespace-nowrap shrink-0">
            <span>باز: <strong class="text-ink font-bold">{{ formatFaNumber(legend?.open) }}</strong></span>
            <span class="text-line" aria-hidden="true">·</span>
            <span>سقف: <strong class="text-emerald-600 dark:text-emerald-400 font-bold">{{ formatFaNumber(legend?.high) }}</strong></span>
            <span class="text-line" aria-hidden="true">·</span>
            <span>کف: <strong class="text-rose-600 dark:text-rose-400 font-bold">{{ formatFaNumber(legend?.low) }}</strong></span>
            <span class="text-line" aria-hidden="true">·</span>
            <span>پایانی: <strong class="text-ink font-bold">{{ formatFaNumber(legend?.close) }}</strong></span>
            <span v-if="legend?.volume != null" class="text-line" aria-hidden="true">·</span>
            <span v-if="legend?.volume != null">حجم: <strong class="text-ink font-bold">{{ formatCompactFa(legend.volume) }}</strong></span>
          </div>
        </div>
      </div>
    </header>

    <!-- Toolbar -->
    <div class="rounded-2xl border border-line bg-surface px-2 shadow-xs">
      <ChartToolbar
        :kind="prefs.kind"
        :set="prefs.set"
        :agg="agg"
        :range="prefs.range"
        :volume="prefs.volumeVisible"
        :magnet="prefs.crosshairMagnet"
        :grid="prefs.gridVisible"
        :auto="auto"
        :panels="sidePanel"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @kind="setKind"
        @set="setSet"
        @agg="setAgg"
        @range="setRange"
        @toggle="onToggleToolbar"
        @undo="doUndo"
        @redo="doRedo"
        @reset="resetView"
        @shot="shot"
        @refresh="reload(true)"
        @fullscreen="toggleFs"
      />
    </div>

    <!-- Workspace (Chart + Rail + Sidepanel) -->
    <div class="flex min-h-0 min-w-0 flex-1 items-stretch gap-2">
      <!-- Chart Container -->
      <div class="analysis-chart relative h-[54dvh] sm:h-[62dvh] min-h-[380px] max-h-[820px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs lg:h-[calc(100dvh-20rem)]">
        <!-- Floating Active Tool HUD (when drawing tool is selected) -->
        <div
          v-if="tool !== 'cursor'"
          class="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex max-w-[95%] flex-wrap items-center justify-center gap-2 rounded-2xl border border-brand/40 bg-surface/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md"
        >
          <div class="flex items-center gap-1.5 font-bold text-brand">
            <ChartIcon :name="toolIcon" :size="18" />
            <span>{{ toolLabel }}</span>
          </div>
          <span class="hidden sm:inline text-[11px] text-muted">· برای ترسیم روی چارت کلیک یا درگ کنید</span>
          <div class="flex items-center gap-1.5">
            <input
              v-model="drawStyle.color"
              type="color"
              class="h-6 w-6 cursor-pointer rounded border border-line bg-transparent p-0"
              title="رنگ ترسیم"
            />
            <select
              v-model.number="drawStyle.width"
              class="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-bold"
              title="ضخامت خط"
            >
              <option :value="1">1</option>
              <option :value="2">2</option>
              <option :value="3">3</option>
              <option :value="4">4</option>
            </select>
          </div>
          <button
            @click="setTool('cursor')"
            class="flex items-center gap-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-1 text-xs font-bold transition hover:bg-rose-500/20"
            title="انصراف (Esc)"
          >
            <ChartIcon name="close" :size="13" />
            <span>انصراف</span>
          </button>
        </div>

        <!-- Drawings count pill -->
        <div
          v-if="drawings.length"
          class="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 rounded-full bg-secondary/90 px-3 py-1 text-[11px] font-bold text-muted backdrop-blur"
        >
          <ChartIcon name="layers" :size="14" />
          <span>{{ toFaDigits(drawings.length) }} لایه ترسیم</span>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface/75 backdrop-blur-xs" role="status">
          <div class="flex flex-col items-center gap-3">
            <span class="loader-ring" aria-hidden="true" />
            <p class="text-xs sm:text-sm font-bold text-ink">در حال دریافت داده‌های نماد…</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="loadError && !candles.length" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface p-4" role="alert">
          <div class="max-w-md text-center">
            <div class="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
              <ChartIcon name="alert" :size="24" />
            </div>
            <p class="text-sm font-bold text-ink">خطا در دریافت کندل‌ها</p>
            <p class="mt-1 text-xs leading-6 text-muted">{{ loadError }}</p>
            <button
              @click="reload(true)"
              class="mt-3 rounded-xl bg-brand-solid px-4 py-2 text-xs font-bold text-white shadow-sm shadow-brand/25 transition hover:bg-brand-strong"
            >
              تلاش مجدد
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!loading && !loadError && !candles.length" class="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface p-4">
          <div class="text-center text-muted">
            <p class="text-sm font-bold">برای این نماد کندلی یافت نشد.</p>
            <p class="mt-1 text-xs">نماد دیگری را انتخاب کنید یا بازه زمانی را تغییر دهید.</p>
          </div>
        </div>

        <!-- ProChart component -->
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
          v-if="proApi && candles.length"
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
      </div>

      <!-- Desktop Drawing Rail (Physical left in RTL) -->
      <div class="hidden min-h-0 w-14 shrink-0 flex-col self-stretch overflow-y-auto rounded-2xl border border-line bg-surface px-1 shadow-xs lg:flex">
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

      <!-- Desktop Side Panel -->
      <aside v-if="sidePanel" class="hidden w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface xl:flex">
        <!-- Tab Bar Header -->
        <div class="flex items-center border-b border-line bg-secondary/40 p-1.5">
          <button
            @click="sidePanel = 'indicators'"
            class="flex-1 rounded-xl py-1.5 text-xs font-bold transition"
            :class="sidePanel === 'indicators' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
          >
            اندیکاتورها ({{ toFaDigits(indicators.length) }})
          </button>
          <button
            @click="sidePanel = 'watch'"
            class="flex-1 rounded-xl py-1.5 text-xs font-bold transition"
            :class="sidePanel === 'watch' ? 'bg-surface text-brand shadow-xs' : 'text-muted hover:text-ink'"
          >
            دیده‌بان ({{ toFaDigits(watchRows.length) }})
          </button>
          <button
            @click="sidePanel = null"
            class="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-secondary hover:text-ink"
            title="بستن پنل"
          >
            <ChartIcon name="close" :size="15" />
          </button>
        </div>

        <!-- Indicators Tab Content -->
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

        <!-- Watchlist Tab Content -->
        <div v-else-if="sidePanel === 'watch'" class="flex h-full flex-col p-3">
          <div class="flex items-center justify-between pb-2 border-b border-line">
            <h3 class="text-sm font-black text-ink">نمادهای دیده‌بان</h3>
            <span class="tnum text-xs text-muted">{{ toFaDigits(watchRows.length) }} نماد</span>
          </div>
          <ul class="mt-2 flex-1 space-y-1 overflow-y-auto">
            <li v-for="s in watchRows" :key="s.l18">
              <button
                @click="goSymbolTo(s.l18)"
                class="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-right text-xs transition hover:bg-secondary"
                :class="s.l18 === symbolParam ? 'bg-brand/10 border border-brand/20 font-bold' : ''"
              >
                <span class="font-bold text-ink">{{ s.l18 }}</span>
                <span class="truncate text-[11px] text-muted max-w-[90px]">{{ s.l30 }}</span>
                <span class="tnum ms-auto font-bold">{{ formatFaNumber(s.pc) }}</span>
                <ChangeBadge :value="s.pcp" />
              </button>
            </li>
          </ul>
          <div v-if="!watchRows.length" class="py-12 text-center text-xs text-muted">
            <p>دیده‌بان شما خالی است.</p>
            <p class="mt-1">با کلیک روی ستاره نمادها را اضافه کنید.</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- Data Footnote -->
    <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted">
      <div class="flex items-center gap-1.5 flex-wrap tnum">
        <span>{{ datasetSource }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ updatedFa }}</span>
        <template v-if="aggNote">
          <span aria-hidden="true">·</span>
          <span>{{ aggNote }}</span>
        </template>
        <template v-if="isMockNow">
          <span aria-hidden="true">·</span>
          <span class="text-amber-500 font-bold">داده نمایشی (آزمایشی)</span>
        </template>
      </div>
      <div class="hidden sm:flex items-center gap-3 text-[11px]">
        <span>میانبر جستجو: <kbd class="rounded border border-line bg-surface px-1 font-mono">/</kbd></span>
        <span>تمام‌صفحه: <kbd class="rounded border border-line bg-surface px-1 font-mono">F</kbd></span>
      </div>
    </div>

    <!-- Mobile Bottom Navigation Dock (Thumb-friendly mobile bar) -->
    <nav class="lg:hidden fixed inset-x-2 bottom-2 z-30 mx-auto max-w-lg" aria-label="دسترسی سریع نمودار">
      <div class="flex items-center justify-around rounded-2xl border border-line bg-surface/95 p-1.5 shadow-xl backdrop-blur-md">
        <!-- Drawings -->
        <button
          @click="openMobileSheet('drawings')"
          class="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition"
          :class="tool !== 'cursor' ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'"
        >
          <ChartIcon name="brush" :size="20" />
          <span>ترسیم</span>
        </button>

        <!-- Indicators -->
        <button
          @click="openMobileSheet('indicators')"
          class="relative flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition"
          :class="activeMobileSheet === 'indicators' ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'"
        >
          <ChartIcon name="indicators" :size="20" />
          <span>اندیکاتورها</span>
          <span
            v-if="indicators.length"
            class="absolute -top-1 start-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand-solid px-1 text-[9px] font-bold text-white shadow-xs"
          >
            {{ toFaDigits(indicators.length) }}
          </span>
        </button>

        <!-- Watchlist -->
        <button
          @click="openMobileSheet('watch')"
          class="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition"
          :class="activeMobileSheet === 'watch' ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'"
        >
          <ChartIcon name="star" :size="20" />
          <span>دیده‌بان</span>
        </button>

        <!-- Chart Settings & Display -->
        <button
          @click="openMobileSheet('settings')"
          class="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition"
          :class="activeMobileSheet === 'settings' ? 'text-brand bg-brand/10' : 'text-muted hover:text-ink'"
        >
          <ChartIcon name="settings" :size="20" />
          <span>تنظیمات</span>
        </button>

        <!-- Fullscreen -->
        <button
          @click="toggleFs"
          class="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[11px] font-bold text-muted transition hover:text-ink"
        >
          <ChartIcon :name="fsActive ? 'exitfull' : 'fullscreen'" :size="20" />
          <span>{{ fsActive ? 'خروج' : 'تمام‌صفحه' }}</span>
        </button>
      </div>
    </nav>

    <!-- Mobile Bottom Sheet Dialog -->
    <div
      v-if="activeMobileSheet"
      class="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      :aria-label="sheetTitle"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" @click="activeMobileSheet = null" />

      <!-- Sheet Container -->
      <div class="absolute inset-x-0 bottom-0 max-h-[82vh] flex flex-col rounded-t-3xl border-t-2 border-brand/40 bg-surface shadow-2xl">
        <!-- Handle & Header -->
        <div class="p-3 border-b border-line shrink-0">
          <div class="mx-auto mb-2 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
          <div class="flex items-center justify-between">
            <h3 class="flex items-center gap-2 text-sm font-black text-ink">
              <ChartIcon :name="sheetIcon" :size="20" />
              <span>{{ sheetTitle }}</span>
            </h3>
            <button
              @click="activeMobileSheet = null"
              class="grid h-8 w-8 place-items-center rounded-xl bg-secondary text-ink hover:bg-brand/10"
              aria-label="بستن"
            >
              <ChartIcon name="close" :size="18" />
            </button>
          </div>
        </div>

        <!-- Sheet Body -->
        <div class="flex-1 overflow-y-auto p-3">
          <!-- 1. Drawings Sheet -->
          <div v-if="activeMobileSheet === 'drawings'" class="space-y-4">
            <div>
              <p class="text-xs font-bold text-muted mb-2">ابزار ترسیم را انتخاب کنید:</p>
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
          </div>

          <!-- 2. Indicators Sheet -->
          <div v-else-if="activeMobileSheet === 'indicators'" class="h-[60vh]">
            <IndicatorPanel
              :instances="indicators"
              @add="addIndicator"
              @remove="removeIndicator"
              @visible="toggleIndVisible"
              @param="setIndParam"
              @color="setIndColor"
            />
          </div>

          <!-- 3. Watchlist Sheet -->
          <div v-else-if="activeMobileSheet === 'watch'" class="space-y-2">
            <div class="flex items-center justify-between pb-1 border-b border-line text-xs text-muted">
              <span>نمادهای برگزیده شما</span>
              <span class="tnum">{{ toFaDigits(watchRows.length) }} نماد</span>
            </div>
            <ul v-if="watchRows.length" class="space-y-1">
              <li v-for="s in watchRows" :key="s.l18">
                <button
                  @click="goSymbolTo(s.l18); activeMobileSheet = null"
                  class="flex w-full items-center gap-2 rounded-xl border border-line p-2.5 text-right transition hover:border-brand hover:bg-secondary"
                  :class="s.l18 === symbolParam ? 'border-brand bg-brand/5' : ''"
                >
                  <span class="font-bold text-sm text-ink">{{ s.l18 }}</span>
                  <span class="truncate text-xs text-muted max-w-[120px]">{{ s.l30 }}</span>
                  <span class="tnum ms-auto font-bold text-xs">{{ formatFaNumber(s.pc) }}</span>
                  <ChangeBadge :value="s.pcp" />
                </button>
              </li>
            </ul>
            <div v-else class="py-10 text-center text-xs text-muted">
              <p>دیده‌بان خالی است.</p>
              <p class="mt-1">با کلیک روی ستاره در سربرگ، نمادها را ذخیره کنید.</p>
            </div>
          </div>

          <!-- 4. Chart Settings Sheet -->
          <div v-else-if="activeMobileSheet === 'settings'" class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="onToggleToolbar('volume')"
                class="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-bold transition"
                :class="prefs.volumeVisible ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>نمایش حجم معاملات</span>
                <span class="tnum font-black">{{ prefs.volumeVisible ? 'فعال' : 'خاموش' }}</span>
              </button>

              <button
                @click="onToggleToolbar('grid')"
                class="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-bold transition"
                :class="prefs.gridVisible ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>خطوط شبکه (Grid)</span>
                <span class="tnum font-black">{{ prefs.gridVisible ? 'فعال' : 'خاموش' }}</span>
              </button>

              <button
                @click="onToggleToolbar('magnet')"
                class="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-bold transition"
                :class="prefs.crosshairMagnet ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>آهنربا (Crosshair Magnet)</span>
                <span class="tnum font-black">{{ prefs.crosshairMagnet ? 'فعال' : 'خاموش' }}</span>
              </button>

              <button
                @click="auto = !auto"
                class="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-bold transition"
                :class="auto ? 'border-brand bg-brand/5 text-brand' : 'text-muted'"
              >
                <span>به‌روزرسانی خودکار (۹۰ث)</span>
                <span class="tnum font-black">{{ auto ? 'فعال' : 'خاموش' }}</span>
              </button>
            </div>

            <div class="pt-2 border-t border-line flex gap-2">
              <button
                @click="resetView(); activeMobileSheet = null"
                class="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-line py-2.5 text-xs font-bold text-ink hover:bg-secondary"
              >
                <ChartIcon name="fit" :size="18" />
                <span>تنظیم مقیاس نما</span>
              </button>
              <button
                @click="shot(); activeMobileSheet = null"
                class="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-brand-solid py-2.5 text-xs font-bold text-white hover:bg-brand-strong"
              >
                <ChartIcon name="camera" :size="18" />
                <span>ذخیره تصویر</span>
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
        <!-- Search Input Bar -->
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

        <!-- Quick Favorites / Popular symbols chips -->
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

        <!-- Search Results List -->
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
import { useWatchlistStore } from '@/stores/watchlist'
import { fetchDataset, resample, type Aggregate } from '@/chart/data.ts'
import { computeInstance, getIndicatorDef, makeInstance } from '@/chart/indicators.ts'
import { DrawingHistory, loadDrawings, loadIndicatorState, loadPrefs, saveIndicatorState, savePrefs } from '@/chart/persistence.ts'
import type { CandleSet, ChartKind, DrawingObject, IndicatorInstance, WorkspaceCandle } from '@/chart/types.ts'
import { fetchSymbolDetail, hasApiKey } from '@/services/api'
import type { TsetmcSymbolDetail } from '@/types/market'
import { changeClass, formatFaNumber, formatFaPercent, toFaDigits, formatCompactFa, gregorianToJalali } from '@/utils/format'
import ProChart from '@/components/chart/ProChart.vue'
import ChartIcon from '@/components/chart/ChartIcon.vue'
import DrawingLayer from '@/components/chart/DrawingLayer.vue'
import ChartToolbar from '@/components/chart/ChartToolbar.vue'
import DrawingToolbar from '@/components/chart/DrawingToolbar.vue'
import IndicatorPanel from '@/components/chart/IndicatorPanel.vue'
import ChangeBadge from '@/components/ChangeBadge.vue'

void changeClass

const route = useRoute()
const router = useRouter()
const market = useMarketStore()
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

// mobile bottom sheet state
type MobileSheetType = 'drawings' | 'indicators' | 'watch' | 'settings' | null
const activeMobileSheet = ref<MobileSheetType>(null)

function openMobileSheet(type: MobileSheetType): void {
  activeMobileSheet.value = activeMobileSheet.value === type ? null : type
}

const sheetTitle = computed(() => {
  switch (activeMobileSheet.value) {
    case 'drawings':
      return 'ابزارهای ترسیم و تحلیل'
    case 'indicators':
      return 'مدیریت و افزودن اندیکاتورها'
    case 'watch':
      return 'نمادهای دیده‌بان'
    case 'settings':
      return 'تنظیمات نمایش نمودار'
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

function formatCandleTime(t: WorkspaceCandle['time']): string {
  if (typeof t === 'number') {
    return new Date(t * 1000).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  }
  return gregorianToJalali(String(t))
}

async function reload(force = false): Promise<void> {
  void force
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
    if (my !== reqToken) return
    detail.value = det
    candles.value = ds.candles
    datasetSource.value =
      ds.source === 'candlestick-intraday'
        ? 'کندل‌های ۲دقیقه‌ای امروز (زنده)'
        : ds.source.includes('unadjusted')
          ? 'کندل روزانه تعدیل‌نشده (TSETMC)'
          : 'کندل روزانه تعدیل‌شده (TSETMC)'
    updatedFa.value = `به‌روزرسانی: ${toFaDigits(
      new Date(ds.fetchedAt).toLocaleTimeString('fa-IR', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    )}`
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

const headerRow = computed(() => market.symbols.find((s) => s.l18 === symbolParam.value))
const headerCompany = computed(() => detail.value?.l30 ?? headerRow.value?.l30 ?? '')
const headerMarket = computed(() => detail.value?.m ?? (headerRow.value?.market === 'etf' ? 'صندوق' : 'بورس'))
const headerPrice = computed(() => detail.value?.pc ?? headerRow.value?.pc ?? legend.value?.close ?? null)

const watchRows = computed(() => watch.items.map((l18) => market.symbols.find((s) => s.l18 === l18)).filter((s) => s !== undefined))

const aggNote = computed(() => {
  if (prefs.set === 'intraday') return 'کندل‌های ۲دقیقه‌ای امروز'
  if (agg.value === 'weekly') return 'تجمیع هفتگی'
  if (agg.value === 'monthly') return 'تجمیع ماهانه'
  return ''
})

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
function setAgg(a: Aggregate): void {
  agg.value = a
}
function setRange(days: number): void {
  prefs.range = days
  savePrefs({ ...prefs })
}

function onToggleToolbar(w: 'indicators' | 'volume' | 'magnet' | 'grid'): void {
  if (w === 'indicators') {
    // on mobile, open mobile bottom sheet; on desktop toggle sidePanel
    if (window.innerWidth < 1280) {
      openMobileSheet('indicators')
    } else {
      sidePanel.value = sidePanel.value === 'indicators' ? null : 'indicators'
    }
  } else if (w === 'volume') {
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
} | null>(null)

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
  min-height: 60dvh;
}

.fs-fallback {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--page);
  padding: 0.5rem;
  height: 100dvh !important;
  overflow-y: auto;
}

.fs-fallback .analysis-chart {
  height: calc(100dvh - 12rem) !important;
  max-height: none;
  min-height: 400px;
}

.loader-ring {
  width: 2.5rem;
  height: 2.5rem;
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
