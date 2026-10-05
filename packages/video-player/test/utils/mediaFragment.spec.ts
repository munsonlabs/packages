import { describe, it, expect } from 'vite-plus/test'
import { parseClock, parseDeepLink } from '@/utils/mediaFragment'

const at = (hash: string) => parseDeepLink({ hash })

describe('parseClock', () => {
  it('reads seconds, npt: seconds and clock time', () => {
    expect(parseClock('42')).toBe(42)
    expect(parseClock('42.5')).toBe(42.5)
    expect(parseClock('npt:10')).toBe(10)
    expect(parseClock('1:02')).toBe(62)
    expect(parseClock('1:02:03.5')).toBe(3723.5)
  })

  it('refuses anything else', () => {
    expect(parseClock('-1')).toBeNull()
    expect(parseClock('abc')).toBeNull()
    expect(parseClock('1:2:3:4')).toBeNull()
    expect(parseClock('')).toBeNull()
  })
})

describe('parseDeepLink', () => {
  it('reads ml-t from the hash', () => {
    expect(at('#ml-t=42,52')).toEqual({ start: 42, end: 52, target: null })
    expect(at('#ml-t=42')).toEqual({ start: 42, end: null, target: null })
    expect(at('#ml-t=,10')).toEqual({ start: 0, end: 10, target: null })
    expect(at('#ml-t=1:00,1:10.5')).toEqual({ start: 60, end: 70.5, target: null })
  })

  it('keeps an app hash route in front of the range', () => {
    expect(at('#/article/7&ml-t=4,9')).toEqual({ start: 4, end: 9, target: null })
  })

  it('names a target player with ml-player', () => {
    expect(at('#ml-t=1,2&ml-player=hero')).toEqual({ start: 1, end: 2, target: 'hero' })
    expect(at('#ml-player=hero&ml-t=1,2')).toEqual({ start: 1, end: 2, target: 'hero' })
  })

  it('ignores other keys, the query form and malformed or empty ranges', () => {
    expect(at('#t=42,52')).toBeNull()
    expect(at('#ml-t=52,42')).toBeNull()
    expect(at('#ml-t=5,5')).toBeNull()
    expect(at('#ml-t=abc')).toBeNull()
    expect(at('#section-2')).toBeNull()
    expect(at('')).toBeNull()
  })
})
