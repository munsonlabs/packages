import { describe, it, expect } from 'vite-plus/test'
import { pickBestSource } from '@/adapters/sourceHelpers'

describe('pickBestSource', () => {
  it('prefers HLS over MP4', () => {
    const sources = [
      { src: 'video.mp4', type: 'video/mp4' },
      { src: 'video.m3u8', type: 'application/x-mpegURL' },
    ]
    expect(pickBestSource(sources)[0].type).toBe('application/x-mpegURL')
  })

  it('falls back to mp4 when no HLS present', () => {
    const sources = [{ src: 'video.mp4', type: 'video/mp4' }]
    expect(pickBestSource(sources)[0].src).toBe('video.mp4')
  })

  it('filters out unsupported types', () => {
    const sources = [
      { src: 'video.webm', type: 'video/webm' },
      { src: 'video.mp4', type: 'video/mp4' },
    ]
    const result = pickBestSource(sources)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('video/mp4')
  })

  it('returns empty array for empty input', () => {
    expect(pickBestSource([])).toEqual([])
  })
})
