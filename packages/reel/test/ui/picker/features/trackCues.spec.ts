import { describe, expect, it } from 'vite-plus/test'
import { matchRendition } from '@/ui/picker/features/trackCues'
import type { CaptionTrackInfo } from '@/types'

const tracks: CaptionTrackInfo[] = [
  { id: 'text:0', kind: 'text-track', language: 'en', label: 'English', default: false },
  { id: 'hls:0', kind: 'hls', language: 'en', label: 'English', default: false },
  { id: 'hls:1', kind: 'hls', language: 'fr', label: 'Français', default: false },
  { id: 'hls:2', kind: 'hls', language: 'fr', label: 'Français (forced)', default: false },
]

describe('matchRendition', () => {
  it('prefers the rendition with the same name', () => {
    expect(matchRendition(tracks, { label: 'Français (forced)', language: 'fr' })?.id).toBe('hls:2')
  })

  it('falls back to the same language, ignoring case', () => {
    expect(matchRendition(tracks, { label: 'French', language: 'FR' })?.id).toBe('hls:1')
  })

  it('looks only at HLS renditions', () => {
    expect(
      matchRendition(
        tracks.filter((track) => track.kind !== 'hls'),
        { label: 'English', language: 'en' },
      ),
    ).toBeUndefined()
  })

  it('does not match an unnamed language to an unnamed rendition', () => {
    expect(
      matchRendition([{ id: 'hls:0', kind: 'hls', language: '', label: 'Subs', default: false }], { label: 'Other', language: '' }),
    ).toBeUndefined()
  })
})
