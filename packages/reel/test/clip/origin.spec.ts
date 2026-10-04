import { describe, expect, it } from 'vite-plus/test'
import { clipLink, originTags } from '@/clip/origin'

describe('clipLink', () => {
  it('appends ml-t=start,end to the hash', () => {
    expect(clipLink('https://example.com/watch/42', 12.5, 22.5)).toBe('https://example.com/watch/42#ml-t=12.5,22.5')
    expect(clipLink({ url: 'https://example.com/v?id=1' }, 1 / 3, 2)).toBe('https://example.com/v?id=1#ml-t=0.333,2')
  })

  it('names the player the origin came from', () => {
    expect(clipLink({ url: 'https://example.com/a', player: 'interview' }, 1, 2)).toBe('https://example.com/a#ml-t=1,2&ml-player=interview')
    expect(clipLink({ url: 'https://example.com/a', player: 'hero 2' }, 1, 2)).toBe('https://example.com/a#ml-t=1,2&ml-player=hero%202')
  })

  it('keeps an existing hash and replaces an existing ml-t= or ml-player=', () => {
    expect(clipLink('https://example.com/#/video/9', 0, 5)).toBe('https://example.com/#/video/9&ml-t=0,5')
    expect(clipLink('https://example.com/a#ml-t=1,2&ml-player=old', 3, 4)).toBe('https://example.com/a#ml-t=3,4')
  })
})

describe('originTags', () => {
  const origin = { url: 'https://example.com/watch/42', title: 'Flower timelapse', publisher: 'Munson Labs' }

  it('maps an origin onto MP4 ilst atoms', () => {
    const tags = originTags(origin, 1, 4)
    expect(tags).toMatchObject({
      title: 'Flower timelapse',
      artist: 'Munson Labs',
      comment: 'https://example.com/watch/42#ml-t=1,4',
      description: 'Clip of Flower timelapse, 1s to 4s: https://example.com/watch/42#ml-t=1,4',
      raw: { '©pub': 'Munson Labs' },
    })
    expect(tags.raw?.['©too']).toMatch(/^@munsonlabs\/reel /)
    expect(tags.date).toBeInstanceOf(Date)
  })

  it('leaves out what the origin does not say', () => {
    const tags = originTags({ url: 'https://example.com/watch/42' }, 1, 4)
    expect(tags.title).toBeUndefined()
    expect(tags.artist).toBeUndefined()
    expect(Object.keys(tags.raw ?? {})).toEqual(['©too'])
  })
})
