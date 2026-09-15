import { describe, it, expect } from 'vite-plus/test'
import { parseAspectRatio } from '@/utils/aspectRatio'

describe('parseAspectRatio', () => {
  it('returns landscape for 16:9', () => {
    const { isPortrait, cssRatio } = parseAspectRatio('16:9')
    expect(isPortrait).toBe(false)
    expect(cssRatio).toBe('16/9')
  })

  it('returns portrait for 9:16', () => {
    const { isPortrait, cssRatio } = parseAspectRatio('9:16')
    expect(isPortrait).toBe(true)
    expect(cssRatio).toBe('9/16')
  })

  it('returns landscape for square 1:1', () => {
    expect(parseAspectRatio('1:1').isPortrait).toBe(false)
  })

  it('formats cssRatio with a slash not a colon', () => {
    expect(parseAspectRatio('4:3').cssRatio).toBe('4/3')
  })
})
