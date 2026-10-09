import type { ChartPrefs, DrawingObject } from './types.ts'

/**
 * Local persistence with versioned keys and a documented migration path:
 * if a backend/auth system arrives, replace `readStore`/`writeStore` with
 * API calls — the per-symbol shape ({version, drawings}) stays identical.
 */

const DRAW_KEY = (symbol: string): string => `isa-drawings-v1:${symbol}`
const PREFS_KEY = 'isa-chart-prefs-v1'
const IND_KEY = 'isa-indicators-v1'

interface DrawingStore {
  version: 1
  drawings: DrawingObject[]
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota — drawings for this session stay in memory */
  }
}

export function loadDrawings(symbol: string): DrawingObject[] {
  const s = safeRead<DrawingStore>(DRAW_KEY(symbol))
  if (!s || s.version !== 1 || !Array.isArray(s.drawings)) return []
  return s.drawings.filter((d) => d && typeof d.id === 'string' && d.symbol === symbol)
}

export function saveDrawings(symbol: string, drawings: DrawingObject[]): void {
  safeWrite(DRAW_KEY(symbol), { version: 1, drawings } satisfies DrawingStore)
}

/** Undo/redo over whole-list snapshots (simple, robust for ≤hundreds of drawings). */
export class DrawingHistory {
  private undoStack: DrawingObject[][] = []
  private redoStack: DrawingObject[][] = []
  private symbol: string

  constructor(symbol: string, initial: DrawingObject[]) {
    this.symbol = symbol
    this.undoStack = [structuredClone(initial)]
  }

  reset(symbol: string, initial: DrawingObject[]): void {
    this.symbol = symbol
    this.undoStack = [structuredClone(initial)]
    this.redoStack = []
  }

  get current(): DrawingObject[] {
    return this.undoStack[this.undoStack.length - 1] ?? []
  }

  commit(next: DrawingObject[]): DrawingObject[] {
    const snap = structuredClone(next)
    this.undoStack.push(snap)
    if (this.undoStack.length > 100) this.undoStack.shift()
    this.redoStack = []
    saveDrawings(this.symbol, snap)
    return snap
  }

  undo(): DrawingObject[] | null {
    if (this.undoStack.length <= 1) return null
    const cur = this.undoStack.pop() as DrawingObject[]
    this.redoStack.push(cur)
    const prev = this.current
    saveDrawings(this.symbol, prev)
    return structuredClone(prev)
  }

  redo(): DrawingObject[] | null {
    const next = this.redoStack.pop()
    if (!next) return null
    this.undoStack.push(next)
    saveDrawings(this.symbol, next)
    return structuredClone(next)
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }
}

export const DEFAULT_PREFS: ChartPrefs = {
  kind: 'candles',
  set: 'adjusted',
  range: 365,
  volumeVisible: true,
  gridVisible: true,
  crosshairMagnet: true,
}

export function loadPrefs(): ChartPrefs {
  const s = safeRead<Partial<ChartPrefs>>(PREFS_KEY)
  return { ...DEFAULT_PREFS, ...(s ?? {}) }
}

export function savePrefs(p: ChartPrefs): void {
  safeWrite(PREFS_KEY, p)
}

export function loadIndicatorState(): Array<{ key: string; params: Record<string, number>; colors: Record<string, string>; visible: boolean }> {
  return safeRead(IND_KEY) ?? []
}

export function saveIndicatorState(list: Array<{ key: string; params: Record<string, number>; colors: Record<string, string>; visible: boolean }>): void {
  safeWrite(IND_KEY, list)
}
