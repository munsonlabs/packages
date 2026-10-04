import { describe, expect, it } from 'vite-plus/test'
import { isEmbedUrl, resolveSource } from '@/sources/source'
import { ClipError } from '@/utils/errors'

describe('isEmbedUrl', () => {
  it('spots the embed platforms video-player supports', () => {
    expect(isEmbedUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isEmbedUrl('https://youtu.be/abc')).toBe(true)
    expect(isEmbedUrl('https://vimeo.com/123')).toBe(true)
    expect(isEmbedUrl('https://www.dailymotion.com/video/x8')).toBe(true)
    expect(isEmbedUrl('https://players.brightcove.net/1/default_default/index.html?videoId=2')).toBe(true)
    expect(isEmbedUrl('https://cdn.jwplayer.com/players/abc.html')).toBe(true)
  })

  it('leaves file URLs alone', () => {
    expect(isEmbedUrl('https://cdn.example.com/video.mp4')).toBe(false)
    expect(isEmbedUrl('https://notyoutube.com/x.mp4')).toBe(false)
  })
})

describe('resolveSource', () => {
  it('passes blobs through and makes URLs absolute', async () => {
    const blob = new Blob(['x'])
    expect(await resolveSource(blob)).toBe(blob)
    expect(await resolveSource('https://cdn.example.com/a.mp4')).toBe('https://cdn.example.com/a.mp4')
    expect(await resolveSource(new URL('https://cdn.example.com/b.mp4'))).toBe('https://cdn.example.com/b.mp4')
  })

  it('refuses embeds and DASH with a reason', async () => {
    await expect(resolveSource('https://youtu.be/abc')).rejects.toMatchObject({ reason: 'embed' })
    await expect(resolveSource('https://cdn.example.com/stream.mpd')).rejects.toBeInstanceOf(ClipError)
    await expect(resolveSource('https://cdn.example.com/stream.mpd?x=1')).rejects.toMatchObject({ reason: 'dash' })
  })
})
