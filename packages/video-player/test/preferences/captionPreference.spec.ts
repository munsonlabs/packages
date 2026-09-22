import { describe, it, expect, beforeEach } from 'vite-plus/test'
import {
  getCaptionPreference,
  saveCaptionPreference,
  resolvePreferredCaptionTrack,
  STORAGE_CAPTION_PREFERENCE_KEY,
} from '@/preferences/captionPreference'

const TRACKS = [
  { index: 0, language: 'en' },
  { index: 1, language: 'fr' },
]

beforeEach(() => localStorage.clear())

describe('reading and writing', () => {
  it('reports no preference until one is expressed', () => {
    expect(getCaptionPreference()).toBeNull()
  })

  it('round-trips off', () => {
    saveCaptionPreference({ enabled: false })
    expect(getCaptionPreference()).toEqual({ enabled: false })
  })

  it('round-trips a chosen language', () => {
    saveCaptionPreference({ enabled: true, language: 'fr' })
    expect(getCaptionPreference()).toEqual({ enabled: true, language: 'fr' })
  })

  it('treats unreadable or malformed storage as no preference', () => {
    localStorage.setItem(STORAGE_CAPTION_PREFERENCE_KEY, 'not json')
    expect(getCaptionPreference()).toBeNull()

    localStorage.setItem(STORAGE_CAPTION_PREFERENCE_KEY, JSON.stringify({ language: 'en' }))
    expect(getCaptionPreference()).toBeNull()
  })
})

describe('resolving against one video’s tracks', () => {
  it('leaves the source alone when nothing was ever chosen', () => {
    expect(resolvePreferredCaptionTrack(null, TRACKS)).toBeUndefined()
  })

  it('turns captions off everywhere', () => {
    expect(resolvePreferredCaptionTrack({ enabled: false }, TRACKS)).toBeNull()
  })

  it('finds the chosen language by language, not by index', () => {
    expect(resolvePreferredCaptionTrack({ enabled: true, language: 'fr' }, TRACKS)).toBe(1)
    // The same language sits at a different index on another video.
    expect(
      resolvePreferredCaptionTrack({ enabled: true, language: 'fr' }, [
        { index: 0, language: 'fr' },
        { index: 1, language: 'de' },
      ]),
    ).toBe(0)
  })

  it('leaves the source alone rather than forcing a language it does not offer', () => {
    expect(resolvePreferredCaptionTrack({ enabled: true, language: 'ja' }, TRACKS)).toBeUndefined()
  })
})
