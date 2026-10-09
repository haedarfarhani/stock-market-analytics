import { reactive } from 'vue'
import { describe, expect, it } from 'vitest'
import { DrawingHistory, loadDrawings } from '../persistence.ts'
import type { DrawingObject } from '../types.ts'

function makeDrawing(id: string, type: DrawingObject['type'] = 'trendline'): DrawingObject {
  return {
    id,
    symbol: 'TEST',
    type,
    p1: { time: '2024-01-01', price: 100 },
    p2: { time: '2024-01-05', price: 120 },
    color: '#f472b6',
    width: 2,
    style: 'solid',
    opacity: 1,
    locked: false,
    hidden: false,
    createdAt: 1,
  }
}

describe('DrawingHistory', () => {
  it('commits drawings and exposes undo/redo flags', () => {
    const h = new DrawingHistory('S1', [])
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
    h.commit([makeDrawing('a')])
    expect(h.canUndo).toBe(true)
    expect(h.current).toHaveLength(1)
  })

  it('undo returns the previous snapshot and redo restores it', () => {
    const h = new DrawingHistory('S2', [])
    h.commit([makeDrawing('a')])
    h.commit([makeDrawing('a'), makeDrawing('b')])
    const undone = h.undo()
    expect(undone?.map((d) => d.id)).toEqual(['a'])
    expect(h.canRedo).toBe(true)
    const redone = h.redo()
    expect(redone?.map((d) => d.id)).toEqual(['a', 'b'])
    expect(h.canRedo).toBe(false)
  })

  it('undo on a fresh history returns null', () => {
    const h = new DrawingHistory('S3', [])
    expect(h.undo()).toBeNull()
    expect(h.redo()).toBeNull()
  })

  it('accepts Vue reactive (proxy) objects without throwing DataCloneError', () => {
    // Regression test: drafts are emitted from reactive component state and
    // structuredClone() throws on Vue proxies, silently dropping drawings.
    const h = new DrawingHistory('S4', [])
    const reactiveDrawing = reactive(makeDrawing('rx'))
    expect(() => h.commit([reactiveDrawing])).not.toThrow()
    expect(h.current).toHaveLength(1)
    expect(h.current[0]?.id).toBe('rx')
  })

  it('persists committed drawings per symbol and reloads them', () => {
    const h = new DrawingHistory('SYM-P', [])
    const d = makeDrawing('p1', 'hline')
    d.symbol = 'SYM-P' // callers stamp the active symbol before committing
    h.commit([d])
    const loaded = loadDrawings('SYM-P')
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.type).toBe('hline')
    // other symbols are isolated
    expect(loadDrawings('SYM-OTHER')).toHaveLength(0)
  })
})
