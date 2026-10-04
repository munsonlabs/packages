import { describe, expect, it } from 'vite-plus/test'
import { formatTime, initialRange, moveHandle, shiftRange, timelineWindow } from '@/ui/picker/features/range'

const limits = { min: 0, max: 100, shortest: 1, longest: 30 }

describe('initialRange', () => {
  it('starts a third of the length before the current time', () => {
    expect(initialRange(42, 600, 9)).toEqual({ start: 39, end: 48 })
  })

  it('stays inside the source at either end', () => {
    expect(initialRange(1, 600, 10)).toEqual({ start: 0, end: 10 })
    expect(initialRange(598, 600, 10)).toEqual({ start: 590, end: 600 })
    expect(initialRange(2, 5, 10)).toEqual({ start: 0, end: 5 })
  })
})

describe('timelineWindow', () => {
  it('centres a span on the range, inside the source', () => {
    expect(timelineWindow({ start: 300, end: 310 }, 600, 90)).toEqual({ min: 260, max: 350 })
    expect(timelineWindow({ start: 5, end: 15 }, 600, 90)).toEqual({ min: 0, max: 90 })
    expect(timelineWindow({ start: 0, end: 5 }, 5, 90)).toEqual({ min: 0, max: 5 })
  })
})

describe('moveHandle', () => {
  it('moves one handle and never the other', () => {
    expect(moveHandle({ start: 10, end: 20 }, 'start', 12.34, limits)).toEqual({ start: 12.3, end: 20 })
    expect(moveHandle({ start: 10, end: 20 }, 'end', 25, limits)).toEqual({ start: 10, end: 25 })
  })

  it('stops at the shortest clip instead of crossing', () => {
    expect(moveHandle({ start: 10, end: 20 }, 'start', 50, limits)).toEqual({ start: 19, end: 20 })
    expect(moveHandle({ start: 10, end: 20 }, 'end', 0, limits)).toEqual({ start: 10, end: 11 })
  })

  it('stops at the longest clip and at the window', () => {
    expect(moveHandle({ start: 10, end: 20 }, 'end', 80, limits)).toEqual({ start: 10, end: 40 })
    expect(moveHandle({ start: 50, end: 60 }, 'start', -Infinity, limits)).toEqual({ start: 30, end: 60 })
    expect(moveHandle({ start: 2, end: 20 }, 'start', -Infinity, limits)).toEqual({ start: 0, end: 20 })
    expect(moveHandle({ start: 90, end: 95 }, 'end', Infinity, limits)).toEqual({ start: 90, end: 100 })
  })
})

describe('shiftRange', () => {
  it('slides both ends, keeping the length, up to the window edges', () => {
    expect(shiftRange({ start: 10, end: 20 }, 5, limits)).toEqual({ start: 15, end: 25 })
    expect(shiftRange({ start: 10, end: 20 }, -50, limits)).toEqual({ start: 0, end: 10 })
    expect(shiftRange({ start: 10, end: 20 }, 500, limits)).toEqual({ start: 90, end: 100 })
  })
})

describe('formatTime', () => {
  it('writes m:ss with a tenth only when there is one', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(62)).toBe('1:02')
    expect(formatTime(62.5)).toBe('1:02.5')
    expect(formatTime(3599.9)).toBe('59:59.9')
  })
})
