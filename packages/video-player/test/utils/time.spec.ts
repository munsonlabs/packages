import { describe, it, expect } from 'vite-plus/test'
import { fmtTime } from '@/utils/time'

describe('fmtTime', () => {
  it('formats zero as 0:00', () => {
    expect(fmtTime(0)).toBe('0:00')
  })

  it('returns 0:00 for NaN', () => {
    expect(fmtTime(NaN)).toBe('0:00')
  })

  it('pads seconds below 10', () => {
    expect(fmtTime(65)).toBe('1:05')
  })

  it('does not pad minutes', () => {
    expect(fmtTime(600)).toBe('10:00')
  })

  it('handles sub-minute durations', () => {
    expect(fmtTime(9)).toBe('0:09')
  })

  it('floors fractional seconds', () => {
    expect(fmtTime(61.9)).toBe('1:01')
  })
})
