import { describe, expect, it } from 'vite-plus/test'
import { even, parseAspect, planCrop } from '@/clip/crop'

describe('parseAspect', () => {
  it('reads width:height pairs and source', () => {
    expect(parseAspect('9:16')).toEqual([9, 16])
    expect(parseAspect('1.91:1')).toEqual([1.91, 1])
    expect(parseAspect('source')).toBeNull()
  })

  it('rejects anything else', () => {
    expect(() => parseAspect('portrait')).toThrow(RangeError)
    expect(() => parseAspect('0:16')).toThrow(RangeError)
  })
})

describe('even', () => {
  it('rounds down to an even number of at least 2', () => {
    expect(even(405)).toBe(404)
    expect(even(720)).toBe(720)
    expect(even(1)).toBe(2)
  })
})

describe('planCrop', () => {
  it('cuts a centred 9:16 window out of 720p and scales it up to 1080x1920 by default', () => {
    expect(planCrop(1280, 720)).toEqual({ left: 438, top: 0, width: 405, height: 720, outputWidth: 1080, outputHeight: 1920 })
  })

  it('gives 1080x1920 for 9:16 of 1080p, not the rounded window size of 1078x1918', () => {
    expect(planCrop(1920, 1080)).toMatchObject({ width: 608, height: 1080, outputWidth: 1080, outputHeight: 1920 })
  })

  it('never scales a window down that is already bigger than 1080x1920', () => {
    expect(planCrop(3840, 2160)).toMatchObject({ width: 1215, height: 2160, outputWidth: 1214, outputHeight: 2160 })
  })

  it('fits other aspects in 1080x1920, or 1920x1080 when landscape', () => {
    const size = (aspect: Parameters<typeof planCrop>[2]) => {
      const plan = planCrop(1280, 720, aspect)
      return [plan.outputWidth, plan.outputHeight]
    }
    expect(size({ aspect: '1:1' })).toEqual([1080, 1080])
    expect(size({ aspect: '4:5' })).toEqual([1080, 1350])
    expect(size({ aspect: '16:9' })).toEqual([1920, 1080])
    expect(size({ aspect: 'source' })).toEqual([1920, 1080])
    expect(size({ aspect: '1:4' })).toEqual([480, 1920])
    expect(size({ aspect: '4:1' })).toEqual([1920, 480])
  })

  it('slides the window with a horizontal focus and clamps it to the frame', () => {
    expect(planCrop(1280, 720, { focus: 0 }).left).toBe(0)
    expect(planCrop(1280, 720, { focus: 1 }).left).toBe(1280 - 405)
    expect(planCrop(1280, 720, { focus: 0.25 }).left).toBe(118)
  })

  it('scales to a requested output height, below or above the default', () => {
    expect(planCrop(1280, 720, { height: 720 })).toMatchObject({ outputWidth: 404, outputHeight: 720 })
    expect(planCrop(1280, 720, { height: 2560 })).toMatchObject({ outputWidth: 1440, outputHeight: 2560 })
    expect(planCrop(3840, 2160, { height: 1920 })).toMatchObject({ outputWidth: 1080, outputHeight: 1920 })
  })

  it('crops height when the source is narrower than the target', () => {
    expect(planCrop(1080, 1920, { aspect: '1:1', focus: { y: 0.3 } })).toEqual({
      left: 0,
      top: 36,
      width: 1080,
      height: 1080,
      outputWidth: 1080,
      outputHeight: 1080,
    })
  })

  it('keeps the whole frame for source, scaled up to 1920x1080', () => {
    expect(planCrop(960, 540, { aspect: 'source' })).toMatchObject({
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      outputWidth: 1920,
      outputHeight: 1080,
    })
  })
})
