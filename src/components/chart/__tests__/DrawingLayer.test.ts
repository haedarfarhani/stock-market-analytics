import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DrawingLayer from '../DrawingLayer.vue'
import type { CandleTime, ChartHandle, DrawingObject } from '@/chart/types.ts'

/**
 * Deterministic chart bridge: pixel x <-> time `t{x}`, pixel y <-> price.
 * Mirrors the ProChart contract (screen px relative to the chart container).
 */
function mockApi(): ChartHandle {
  return {
    timeToX: (t: CandleTime): number | null => {
      const m = /^t(-?\d+(?:\.\d+)?)$/.exec(String(t))
      return m ? Number(m[1]) : null
    },
    xToTime: (x: number): CandleTime | null => (x < 0 || x > 2000 ? null : `t${Math.round(x)}`),
    priceToY: (p: number): number | null => (Number.isFinite(p) ? 1000 - p : null),
    yToPrice: (y: number): number | null => (y < 0 || y > 2000 ? null : 1000 - y),
    plotSize: () => ({ w: 800, h: 600 }),
  }
}

function nullApi(): ChartHandle {
  return {
    timeToX: () => null,
    xToTime: () => null,
    priceToY: () => null,
    yToPrice: () => null,
    plotSize: () => ({ w: 800, h: 600 }),
  }
}

const STYLE = { color: '#f472b6', width: 2, style: 'solid' as const, opacity: 1 }

/** jsdom has no ResizeObserver; the component guards with optional usage. */
class ROStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function ptr(type: string, x: number, y: number): Event {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>
  e.clientX = x
  e.clientY = y
  e.button = 0
  e.pointerId = 7
  e.pointerType = 'mouse'
  return e
}

async function mountLayer(tool: DrawingObject['type'] | 'cursor' = 'trendline', api: ChartHandle | null = mockApi()): Promise<Mounted> {
  vi.stubGlobal('ResizeObserver', ROStub)
  const wrapper = mount(DrawingLayer, {
    props: {
      frame: 0,
      drawings: [],
      tool,
      selectedId: null,
      style: { ...STYLE },
      api,
    },
    attachTo: document.body,
  })
  await wrapper.vm.$nextTick()
  const svg = wrapper.find('svg').element as SVGSVGElement
  // container offset: pointer math must be relative to the chart box, not viewport
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 10, top: 20, right: 810, bottom: 620, width: 800, height: 600, x: 10, y: 20, toJSON: () => {},
  })
  return wrapper
}

type Mounted = ReturnType<typeof mount>

function lastCreate(wrapper: Pick<Mounted, 'emitted'>): DrawingObject {
  const creates = wrapper.emitted('create') as unknown as DrawingObject[][]
  const last = creates[creates.length - 1]
  if (!last || !last[0]) throw new Error('no create emitted')
  return last[0]
}

describe('DrawingLayer interaction state machine', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('activating a tool arms the layer (pointer events + crosshair)', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg').element as SVGSVGElement
    expect(svg.style.pointerEvents).toBe('auto')
    expect(svg.style.cursor).toBe('crosshair')
    expect(svg.style.touchAction).toBe('none')
    wrapper.unmount()
  })

  it('cursor mode disables the overlay so normal chart interaction resumes', async () => {
    const wrapper = await mountLayer('cursor')
    const svg = wrapper.find('svg').element as SVGSVGElement
    expect(svg.style.pointerEvents).toBe('none')
    wrapper.unmount()
  })

  it('pointer down establishes the first anchor and shows a live preview', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120)) // -> (100,100)
    await svg.element.dispatchEvent(ptr('pointermove', 160, 170))
    await wrapper.vm.$nextTick()
    // preview pin + preview line use pixel coords, no chart conversion needed
    expect(wrapper.findAll('circle').length).toBeGreaterThan(0)
    expect(wrapper.findAll('line').length).toBeGreaterThan(0)
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })

  it('pointer movement updates the preview geometry', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointermove', 160, 170))
    await wrapper.vm.$nextTick()
    const before = wrapper.findAll('line').map((l) => l.attributes('x2'))
    await svg.element.dispatchEvent(ptr('pointermove', 260, 270))
    await wrapper.vm.$nextTick()
    const after = wrapper.findAll('line').map((l) => l.attributes('x2'))
    expect(after).not.toEqual(before)
    wrapper.unmount()
  })

  it('drag + release completes a trend line between two distinct points', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointermove', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerup', 210, 220))
    const d = lastCreate(wrapper)
    expect(d.type).toBe('trendline')
    expect(d.p1).toEqual({ time: 't100', price: 900 })
    expect(d.p2).toEqual({ time: 't200', price: 800 })
    wrapper.unmount()
  })

  it('click-click (no drag) also completes a two-point drawing', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointerup', 110, 120))
    expect(wrapper.emitted('create')).toBeUndefined() // still armed
    await svg.element.dispatchEvent(ptr('pointerdown', 310, 320))
    const d = lastCreate(wrapper)
    expect(d.p1).toEqual({ time: 't100', price: 900 })
    expect(d.p2).toEqual({ time: 't300', price: 700 })
    wrapper.unmount()
  })

  it('single click creates a horizontal line at the pointer price', async () => {
    const wrapper = await mountLayer('hline')
    await wrapper.find('svg').element.dispatchEvent(ptr('pointerdown', 210, 220))
    const d = lastCreate(wrapper)
    expect(d.type).toBe('hline')
    expect(d.p1).toEqual({ time: 't200', price: 800 })
    // committed hline spans the full overlay width at the mapped y
    await wrapper.setProps({ drawings: [d] })
    const line = wrapper.find('g.drawing-item line')
    expect(line.attributes('y1')).toBe('200')
    expect(line.attributes('y2')).toBe('200')
    wrapper.unmount()
  })

  it('single click creates a vertical line at the pointer time', async () => {
    const wrapper = await mountLayer('vline')
    await wrapper.find('svg').element.dispatchEvent(ptr('pointerdown', 210, 220))
    const d = lastCreate(wrapper)
    expect(d.type).toBe('vline')
    await wrapper.setProps({ drawings: [d] })
    const line = wrapper.find('g.drawing-item line')
    expect(line.attributes('x1')).toBe('200')
    expect(line.attributes('x2')).toBe('200')
    wrapper.unmount()
  })

  it('channel resolves in three clicks (base p1, base p2, offset p3)', async () => {
    const wrapper = await mountLayer('channel')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointerup', 110, 120))
    await svg.element.dispatchEvent(ptr('pointerdown', 310, 320))
    expect(wrapper.emitted('create')).toBeUndefined() // waiting for p3
    await svg.element.dispatchEvent(ptr('pointerdown', 310, 120))
    const d = lastCreate(wrapper)
    expect(d.type).toBe('channel')
    expect(d.p3).toEqual({ time: 't300', price: 900 })
    wrapper.unmount()
  })

  it('freehand brush commits a multi-point stroke on release', async () => {
    const wrapper = await mountLayer('brush')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointermove', 130, 140))
    await svg.element.dispatchEvent(ptr('pointermove', 160, 150))
    await svg.element.dispatchEvent(ptr('pointerup', 160, 150))
    const d = lastCreate(wrapper)
    expect(d.type).toBe('brush')
    expect((d.points ?? []).length).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('invalid coordinate conversions never crash and never create', async () => {
    const wrapper = await mountLayer('trendline', nullApi())
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointermove', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerup', 210, 220))
    expect(wrapper.emitted('create')).toBeUndefined()
    wrapper.unmount()
  })

  it('Escape cancels an unfinished drawing', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointerup', 110, 120)) // armed, waiting p2
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    // next two clicks belong to a brand-new drawing, the armed one is gone
    await svg.element.dispatchEvent(ptr('pointerdown', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerup', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerdown', 310, 320))
    const creates = wrapper.emitted('create') as unknown as DrawingObject[][]
    expect(creates).toHaveLength(1)
    const first = creates[0]?.[0]
    expect(first?.p1).toEqual({ time: 't200', price: 800 })
    wrapper.unmount()
  })

  it('switching tools discards a stale in-progress draft', async () => {
    const wrapper = await mountLayer('trendline')
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointerup', 110, 120)) // armed trendline
    await wrapper.setProps({ tool: 'rect' })
    await svg.element.dispatchEvent(ptr('pointerdown', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerup', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerdown', 310, 320))
    const creates = wrapper.emitted('create') as unknown as DrawingObject[][]
    expect(creates).toHaveLength(1)
    const first = creates[0]?.[0]
    expect(first?.type).toBe('rect')
    wrapper.unmount()
  })

  it('repeated prop updates do not duplicate event handling (one gesture, one drawing)', async () => {
    const wrapper = await mountLayer('trendline')
    await wrapper.setProps({ frame: 1 })
    await wrapper.setProps({ frame: 2 })
    await wrapper.setProps({ tool: 'trendline' })
    const svg = wrapper.find('svg')
    await svg.element.dispatchEvent(ptr('pointerdown', 110, 120))
    await svg.element.dispatchEvent(ptr('pointermove', 210, 220))
    await svg.element.dispatchEvent(ptr('pointerup', 210, 220))
    expect((wrapper.emitted('create') as unknown[])).toHaveLength(1)
    wrapper.unmount()
  })

  it('committed drawings re-resolve after view changes (resize/pan safe)', async () => {
    const wrapper = await mountLayer('cursor')
    const d: DrawingObject = {
      id: 'd1', symbol: '', type: 'trendline',
      p1: { time: 't10', price: 990 }, p2: { time: 't110', price: 880 },
      color: '#f472b6', width: 2, style: 'solid', opacity: 1,
      locked: false, hidden: false, createdAt: 1,
    }
    await wrapper.setProps({ drawings: [d] })
    const line = () => wrapper.find('g.drawing-item line')
    expect(line().attributes('x1')).toBe('10')
    expect(line().attributes('y1')).toBe('10')
    expect(line().attributes('x2')).toBe('110')
    expect(line().attributes('y2')).toBe('120')
    // a frame bump (pan/zoom/resize signal) keeps geometry glued to data coords
    await wrapper.setProps({ frame: 7 })
    expect(line().attributes('x2')).toBe('110')
    expect(line().attributes('y2')).toBe('120')
    wrapper.unmount()
  })

  it('unmounting removes global listeners without errors', async () => {
    const wrapper = await mountLayer('trendline')
    wrapper.unmount()
    expect(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow()
  })
})
