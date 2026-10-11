import { describe, expect, it } from 'vite-plus/test'
import { framesFor } from '@/preview/frames'
import { viewports } from '@/preview/usePreview'

const phone = viewports.find((vp) => vp.label === 'Phone')
const preview = {
  viewport: phone,
  followRules: false,
  variantId: 'base',
  variantOptions: [
    { label: 'Base', value: 'base' },
    { label: 'Compact', value: 'compact' },
  ],
  matchingSamples: [
    { data: 'a', index: 0 },
    { data: 'b', index: 2 },
  ],
  describe: (data) => `Story ${data}`,
  sampleIndex: 2,
  previewScheme: 'auto',
  activeScheme: 'dark',
}
const focused = (frames) => frames.filter((f) => f.focused).map((f) => f.key)

describe('framesFor', () => {
  it('is the current preview alone in one', () => {
    const [frame, ...rest] = framesFor('one', preview)
    expect(rest).toEqual([])
    expect(frame).toMatchObject({ width: 375, variant: 'base', sampleIndex: 2, scheme: 'auto', focused: true })
  })

  it('varies one setting per mode, and focuses the frame that matches the preview', () => {
    const widths = framesFor('widths', preview)
    expect(widths.map((f) => f.width)).toEqual([280, 375, 600])
    expect(focused(widths)).toEqual(['Phone'])

    const variants = framesFor('variants', preview)
    expect(variants.map((f) => f.variant)).toEqual(['base', 'compact'])
    expect(variants.every((f) => f.width === 375 && f.sampleIndex === 2)).toBe(true)
    expect(variants[1].focus).toEqual({ variantId: 'compact' })

    const samples = framesFor('samples', preview)
    expect(samples.map((f) => [f.label, f.sampleIndex])).toEqual([
      ['Story a', 0],
      ['Story b', 2],
    ])
    expect(focused(samples)).toEqual(['2'])

    const schemes = framesFor('schemes', preview)
    expect(schemes.map((f) => f.scheme)).toEqual(['light', 'dark'])
    expect(focused(schemes)).toEqual(['dark'])
  })

  it('lets rules pick in every frame but Variants when Rules is on', () => {
    const on = { ...preview, followRules: true }
    expect(framesFor('widths', on).every((f) => f.variant === undefined)).toBe(true)
    expect(framesFor('variants', on).map((f) => f.variant)).toEqual(['base', 'compact'])
  })

  it('focuses the first frame when none matches the preview', () => {
    const fill = { ...preview, viewport: viewports.find((vp) => !vp.width) }
    expect(focused(framesFor('widths', fill))).toEqual(['Narrow'])
  })
})
