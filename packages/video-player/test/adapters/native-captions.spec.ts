import { describe, it, expect } from 'vite-plus/test'
import { createNativeAdapter } from '@/adapters/native'

function makeAdapter() {
  const videoEl = document.createElement('video')
  const adapter = createNativeAdapter(videoEl, { src: 'video.mp4' })
  return { videoEl, adapter }
}

describe('native adapter — captions', () => {
  it('reports no captions support with no text tracks', () => {
    const { adapter } = makeAdapter()
    expect(adapter.supportsCaptions()).toBe(false)
    expect(adapter.getCaptionTracks()).toEqual([])
  })

  it('lists caption/subtitle tracks and ignores other kinds (e.g. chapters)', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')
    videoEl.addTextTrack('subtitles', 'French', 'fr')
    videoEl.addTextTrack('chapters', 'Chapters', 'en')

    expect(adapter.supportsCaptions()).toBe(true)
    expect(adapter.getCaptionTracks()).toEqual([
      { index: 0, label: 'English', language: 'en' },
      { index: 1, label: 'French', language: 'fr' },
    ])
  })

  it('falls back to language, then a positional label, when a track has no label', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', '', 'de')
    videoEl.addTextTrack('captions', '', '')

    expect(adapter.getCaptionTracks()).toEqual([
      { index: 0, label: 'de', language: 'de' },
      { index: 1, label: 'Track 2', language: '' },
    ])
  })

  /**
   * jsdom's TextTrack.mode setter only reliably supports the disabled <-> showing transition —
   * assigning 'hidden' is silently ignored there (unlike real browsers, which support all three
   * freely). These assert what jsdom can actually represent: which track is showing, not the
   * literal 'hidden' string on the others.
   */
  it('setCaptionTrack shows only the selected track', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')
    videoEl.addTextTrack('subtitles', 'French', 'fr')

    adapter.setCaptionTrack(1)

    expect(videoEl.textTracks[0].mode).not.toBe('showing')
    expect(videoEl.textTracks[1].mode).toBe('showing')
  })

  it('setCaptionTrack(null) leaves no track showing', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')

    adapter.setCaptionTrack(null)

    expect(videoEl.textTracks[0].mode).not.toBe('showing')
  })

  it('getActiveCaptionTrack reports null when nothing is showing', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')

    expect(adapter.getActiveCaptionTrack()).toBe(null)
  })

  it('getActiveCaptionTrack finds a track the browser set to showing on its own (e.g. a <track default>), not just ones set via setCaptionTrack', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')
    const frenchTrack = videoEl.addTextTrack('subtitles', 'French', 'fr')
    frenchTrack.mode = 'showing'

    expect(adapter.getActiveCaptionTrack()).toBe(1)
  })

  it('getActiveCaptionTrack reflects setCaptionTrack too', () => {
    const { videoEl, adapter } = makeAdapter()
    videoEl.addTextTrack('captions', 'English', 'en')
    videoEl.addTextTrack('subtitles', 'French', 'fr')

    adapter.setCaptionTrack(1)

    expect(adapter.getActiveCaptionTrack()).toBe(1)
  })
})
