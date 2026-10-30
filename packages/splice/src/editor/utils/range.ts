export interface Range {
  start: number
  end: number
}

export interface RangeLimits {
  min: number
  max: number
  shortest: number
  longest: number
}

export interface RangeOptions {
  clipLength: number
  shortestClip: number
  longestClip: number
  timelineSpan: number
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/**
 * Rounds to tenths. That's how far the handles move and what #ml-t= links store.
 */
export function roundTenths(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Makes the first range. It's length seconds long and starts a third of that before time, so
 * there's a bit of lead-in, and it stays inside the source.
 */
export function createInitialRange(time: number, duration: number, length: number): Range {
  const span = Math.min(length, duration)
  const start = clamp(time - span / 3, 0, Math.max(0, duration - span))
  return { start: roundTenths(start), end: Math.min(duration, roundTenths(start + span)) }
}

/**
 * Works out how much of the source the timeline shows: span seconds centred on the range, so a
 * short clip of a long video still has handles big enough to grab.
 */
export function getTimelineWindow(range: Range, duration: number, span: number): { min: number; max: number } {
  const width = Math.min(duration, Math.max(span, range.end - range.start))
  const centre = (range.start + range.end) / 2
  const min = clamp(centre - width / 2, 0, duration - width)
  return { min, max: min + width }
}

/**
 * Plans the first range around time, plus the limits the handles can move within.
 */
export function planRange(time: number, duration: number, options: RangeOptions): { range: Range; limits: RangeLimits } {
  const { clipLength, shortestClip, longestClip, timelineSpan } = options
  const range = createInitialRange(time, duration, Math.min(clipLength, longestClip))
  const view = getTimelineWindow(range, duration, timelineSpan)
  return { range, limits: { ...view, shortest: Math.min(shortestClip, duration), longest: longestClip } }
}

/**
 * Moves one handle, staying inside the timeline and between the shortest and longest clip. The
 * other handle stays put, so if this one would cross it or make the clip too long it stops.
 */
export function moveHandle(range: Range, handle: 'start' | 'end', value: number, limits: RangeLimits): Range {
  if (handle === 'start') {
    const low = Math.max(limits.min, range.end - limits.longest)
    const high = Math.max(low, range.end - limits.shortest)
    return { start: clamp(roundTenths(clamp(value, low, high)), low, high), end: range.end }
  }
  const high = Math.min(limits.max, range.start + limits.longest)
  const low = Math.min(high, range.start + limits.shortest)
  return { start: range.start, end: clamp(roundTenths(clamp(value, low, high)), low, high) }
}

export function shiftRange(range: Range, delta: number, limits: RangeLimits): Range {
  const length = range.end - range.start
  const start = clamp(roundTenths(range.start + delta), limits.min, limits.max - length)
  return { start, end: Math.min(limits.max, start + length) }
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, roundTenths(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total - minutes * 60
  const whole = Math.floor(rest)
  const tenth = Math.round((rest - whole) * 10)
  const base = `${minutes}:${String(whole).padStart(2, '0')}`
  return tenth ? `${base}.${tenth}` : base
}
