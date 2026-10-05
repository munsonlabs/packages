import { describe, it, expect } from 'vite-plus/test'
import { planCrop } from '@/splice/crop'

describe('planCrop', () => {
  it('keeps the whole frame without a crop, at least 1920x1080', () => {
    const { width, height, draw } = planCrop(1280, 720)
    expect([width, height]).toEqual([1920, 1080])
    expect([draw.x + 0, draw.y + 0, draw.width, draw.height]).toEqual([0, 0, 1920, 1080])
  })

  it('cuts a centred 9:16 window, at least 1080x1920', () => {
    const { width, height, draw } = planCrop(1280, 720, { aspect: '9:16' })
    expect([width, height]).toEqual([1080, 1920])
    // The window is centred, so the frame overhangs the canvas equally on both sides (to a source pixel).
    const overhangLeft = -draw.x
    const overhangRight = draw.x + draw.width - width
    const sourcePixel = draw.width / 1280
    expect(Math.abs(overhangLeft - overhangRight)).toBeLessThanOrEqual(sourcePixel + 1e-9)
  })

  it('keeps the window inside the frame at the edges', () => {
    const left = planCrop(1280, 720, { aspect: '9:16', focus: { x: 0 } })
    const right = planCrop(1280, 720, { aspect: '9:16', focus: { x: 1 } })
    expect(left.draw.x + 0).toBe(0)
    expect(right.draw.x + right.draw.width).toBeCloseTo(right.width, 0)
  })

  it('scales to a requested height, in either direction', () => {
    const { width, height } = planCrop(1280, 720, { aspect: '9:16', height: 720 })
    expect([width, height]).toEqual([404, 720])
  })
})
