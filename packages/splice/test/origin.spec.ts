import { describe, it, expect } from 'vite-plus/test'
import { createClipLink, createOriginTags } from '@/splice/origin'

describe('createClipLink', () => {
  it('adds the range, in seconds, to the hash', () => {
    expect(createClipLink({ url: 'https://example.com/watch#old' }, 4, 9.12345)).toBe('https://example.com/watch#ml-t=4,9.123')
  })

  it('names the player when given', () => {
    expect(createClipLink({ url: 'https://example.com/', player: 'article' }, 0, 5)).toBe('https://example.com/#ml-t=0,5&ml-player=article')
  })
})

describe('createOriginTags', () => {
  it('writes nothing without an origin', () => {
    expect(createOriginTags(undefined, 0, 5)).toEqual({})
  })

  it('writes the title, publisher and deep link', () => {
    const tags = createOriginTags({ url: 'https://example.com/', title: 'The clock', publisher: 'Splice demo' }, 4, 9)
    expect(tags).toMatchObject({ title: 'The clock', artist: 'Splice demo', comment: 'https://example.com/#ml-t=4,9' })
    expect(tags.description).toBe('Clip of The clock, 4s to 9s: https://example.com/#ml-t=4,9')
  })
})
