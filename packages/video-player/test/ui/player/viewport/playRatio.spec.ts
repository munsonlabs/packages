import { describe, it, expect } from 'vite-plus/test'
import { DEFAULT_PLAY_RATIO, playThresholds, reachedPlayRatio, resolvePlayRatio } from '@/ui/player/viewport/playRatio'

/** An entry for a box `height` tall in a 1000x800 viewport, with `ratio` of it on screen. */
function entry(ratio: number, height = 400, width = 600): IntersectionObserverEntry {
  return {
    isIntersecting: ratio > 0,
    intersectionRatio: ratio,
    rootBounds: { width: 1000, height: 800 },
    boundingClientRect: { width, height },
  } as unknown as IntersectionObserverEntry
}

describe('resolvePlayRatio', () => {
  it('keeps a ratio above 0 and up to 1', () => {
    expect(resolvePlayRatio(1)).toBe(1)
    expect(resolvePlayRatio(0.25)).toBe(0.25)
  })

  it('falls back to the default for nothing, 0, above 1 or not a number', () => {
    for (const ratio of [undefined, 0, -1, 1.5, Number.NaN]) expect(resolvePlayRatio(ratio)).toBe(DEFAULT_PLAY_RATIO)
  })
})

describe('playThresholds', () => {
  it('runs in hundredths from 0 up to the ratio', () => {
    const thresholds = playThresholds(0.5)
    expect(thresholds[0]).toBe(0)
    expect(thresholds.at(-1)).toBe(0.5)
    expect(thresholds).toHaveLength(51)
    expect(thresholds).toContain(0.29)
  })
})

describe('reachedPlayRatio', () => {
  it('needs the ratio on screen', () => {
    expect(reachedPlayRatio(entry(0.49), 0.5)).toBe(false)
    expect(reachedPlayRatio(entry(0.5), 0.5)).toBe(true)
  })

  it('takes a hair under all of it as all of it', () => {
    expect(reachedPlayRatio(entry(0.985), 1)).toBe(true)
    expect(reachedPlayRatio(entry(0.9), 1)).toBe(false)
  })

  it('takes a box taller than the screen as in view once it fills it', () => {
    // 1600 tall in an 800 viewport: half of it is the most that fits.
    expect(reachedPlayRatio(entry(0.5, 1600), 1)).toBe(true)
    expect(reachedPlayRatio(entry(0.4, 1600), 1)).toBe(false)
  })

  it('is never reached off screen', () => {
    expect(reachedPlayRatio(entry(0), 0.01)).toBe(false)
  })
})
