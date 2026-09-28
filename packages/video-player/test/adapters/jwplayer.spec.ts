import { describe, it, expect, vi, afterEach } from 'vite-plus/test'
import { resolveSource } from '@/adapters/sources/jwplayer'

/** jwplayer.ts caches media config per media id with no reset hook, so each test uses its own id. */
let idCounter = 0
function uniqueMediaId(): string {
  idCounter += 1
  return `media${idCounter}`
}

function mockMedia(item: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ playlist: [item] }) }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveSource caption tracks', () => {
  it('keeps the caption files and drops chapters and thumbnail strips', async () => {
    mockMedia({
      sources: [{ file: 'https://cdn.jwplayer.com/videos/x.mp4', type: 'video/mp4' }],
      tracks: [
        { file: 'https://cdn.jwplayer.com/tracks/chapters.vtt', kind: 'chapters', label: 'Big Buck Bunny' },
        { file: 'https://cdn.jwplayer.com/tracks/cc.vtt', kind: 'captions', label: 'Test Track' },
        { file: 'https://cdn.jwplayer.com/strips/x-120.vtt', kind: 'thumbnails' },
        { kind: 'captions', label: 'No file' },
      ],
    })

    const result = await resolveSource(`jwplayer://${uniqueMediaId()}`)

    expect(result.tracks).toEqual([{ src: 'https://cdn.jwplayer.com/tracks/cc.vtt', kind: 'captions', label: 'Test Track' }])
  })

  it('resolves an empty list when the media has no tracks', async () => {
    mockMedia({ sources: [{ file: 'https://cdn.jwplayer.com/videos/x.mp4', type: 'video/mp4' }] })

    const result = await resolveSource(`jwplayer://${uniqueMediaId()}`)

    expect(result.tracks).toEqual([])
  })
})
