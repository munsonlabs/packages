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

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/**
 * Rounds to tenths, the precision the handles move in and that `#ml-t=` links carry.
 */
export function tenths(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * `length` seconds starting a third of that before `time`, so the moment being watched has some lead-in,
 * moved back inside the source at either end.
 */
export function initialRange(time: number, duration: number, length: number): Range {
  const span = Math.min(length, duration)
  const start = clamp(time - span / 3, 0, Math.max(0, duration - span))
  return { start: tenths(start), end: Math.min(duration, tenths(start + span)) }
}

/**
 * `span` seconds centred on the range, inside `[0, duration]`: a ten second clip of a two hour film
 * still has handles you can grab.
 */
export function timelineWindow(range: Range, duration: number, span: number): { min: number; max: number } {
  const width = Math.min(duration, Math.max(span, range.end - range.start))
  const centre = (range.start + range.end) / 2
  const min = clamp(centre - width / 2, 0, duration - width)
  return { min, max: min + width }
}

/**
 * Moves one handle, inside the window and between the shortest and longest clip; the other handle never
 * moves, so a handle that would cross it or stretch past `longest` stops.
 */
export function moveHandle(range: Range, handle: 'start' | 'end', value: number, limits: RangeLimits): Range {
  if (handle === 'start') {
    const low = Math.max(limits.min, range.end - limits.longest)
    const high = Math.max(low, range.end - limits.shortest)
    return { start: clamp(tenths(clamp(value, low, high)), low, high), end: range.end }
  }
  const high = Math.min(limits.max, range.start + limits.longest)
  const low = Math.min(high, range.start + limits.shortest)
  return { start: range.start, end: clamp(tenths(clamp(value, low, high)), low, high) }
}

export function shiftRange(range: Range, delta: number, limits: RangeLimits): Range {
  const length = range.end - range.start
  const start = clamp(tenths(range.start + delta), limits.min, limits.max - length)
  return { start, end: Math.min(limits.max, start + length) }
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, tenths(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total - minutes * 60
  const whole = Math.floor(rest)
  const tenth = Math.round((rest - whole) * 10)
  const base = `${minutes}:${String(whole).padStart(2, '0')}`
  return tenth ? `${base}.${tenth}` : base
}
