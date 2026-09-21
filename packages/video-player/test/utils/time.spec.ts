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

describe('fmtTime beyond an hour', () => {
  it('widens to h:mm:ss at exactly one hour', () => {
    expect(fmtTime(3600)).toBe('1:00:00')
  })

  it('pads minutes once hours are shown', () => {
    expect(fmtTime(3905)).toBe('1:05:05')
  })

  it('does not widen just below an hour', () => {
    expect(fmtTime(3599)).toBe('59:59')
  })

  it('handles multi-hour durations', () => {
    expect(fmtTime(7325)).toBe('2:02:05')
  })

  it('treats a negative duration as zero', () => {
    expect(fmtTime(-5)).toBe('0:00')
  })
})
