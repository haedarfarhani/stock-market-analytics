/** Shared chart-workspace domain types (adapter-agnostic). */

export type CandleTime = string | number

export interface WorkspaceCandle {
  time: CandleTime
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type ChartKind = 'candles' | 'hollow' | 'bars' | 'line' | 'area' | 'baseline'

export type CandleSet = 'adjusted' | 'unadjusted' | 'intraday'

export interface IndicatorLine {
  /** series slot id, e.g. 'macd.hist' */
  id: string
  label: string
  color: string
  /** lightweight-charts series type */
  seriesType: 'line' | 'histogram' | 'area'
  data: Array<{ time: CandleTime; value: number }>
  priceLineVisible?: boolean
  lastValueVisible?: boolean
}

export interface IndicatorInstance {
  uid: string
  key: string
  params: Record<string, number>
  colors: Record<string, string>
  visible: boolean
}

export type DrawingPoint = { time: CandleTime; price: number }

export type DrawingType =
  | 'trendline'
  | 'ray'
  | 'hline'
  | 'vline'
  | 'channel'
  | 'rect'
  | 'price-range'
  | 'time-range'
  | 'fib'
  | 'fib-ext'
  | 'text'
  | 'arrow'
  | 'brush'

export interface DrawingObject {
  id: string
  symbol: string
  type: DrawingType
  p1: DrawingPoint
  p2?: DrawingPoint
  p3?: DrawingPoint
  points?: DrawingPoint[] // brush
  text?: string
  color: string
  width: number
  style: 'solid' | 'dashed' | 'dotted'
  opacity: number
  locked: boolean
  hidden: boolean
  createdAt: number
}

export interface ChartPrefs {
  kind: ChartKind
  set: CandleSet
  range: number // 0 = all
  volumeVisible: boolean
  gridVisible: boolean
  crosshairMagnet: boolean
}

/** Minimal chart-coordinate bridge (implemented by ProChart). */
export interface ChartHandle {
  timeToX: (t: CandleTime) => number | null
  xToTime: (x: number) => CandleTime | null
  priceToY: (p: number) => number | null
  yToPrice: (y: number) => number | null
  plotSize: () => { w: number; h: number }
}

export interface PlacedPoint {
  x: number
  y: number
}
