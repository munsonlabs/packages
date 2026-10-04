import { describe, expect, it } from 'vite-plus/test'
import { ALL_FORMATS, BlobSource, Input, type MetadataTags } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { clipLink, createClip } from '@/index'
import { engine } from '@test/browser/helpers'

const origin = { url: 'https://example.com/watch/42', title: 'Flower timelapse', publisher: 'Munson Labs' }

async function tagsOf(blob: Blob): Promise<MetadataTags> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    return await input.getMetadataTags()
  } finally {
    input.dispose()
  }
}

function printable(tags: MetadataTags): string {
  const raw = Object.fromEntries(
    Object.entries(tags.raw ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value : Object.prototype.toString.call(value)]),
  )
  return JSON.stringify({ ...tags, raw })
}

describe('origin metadata', () => {
  it('writes the origin into MP4 tags that read back intact', async () => {
    const clip = await createClip({ source: flowerUrl, start: 1, end: 4, origin })
    const tags = await tagsOf(clip)
    console.log(`REEL_TAGS ${engine()} mp4 ${printable(tags)}`)
    const link = clipLink(origin, 1, 4)
    expect(tags.title).toBe('Flower timelapse')
    expect(tags.artist).toBe('Munson Labs')
    expect(tags.comment).toBe(link)
    expect(tags.description).toContain(link)
    expect(tags.date).toBeInstanceOf(Date)
    expect(tags.raw?.['©pub']).toBe('Munson Labs')
    expect(tags.raw?.['©too']).toMatch(/^@munsonlabs\/reel /)
  })

  it('carries no source tags without an origin, or with metadata: false', async () => {
    // flower.mp4 has no tags, so the source here is a clip that does.
    const tagged = await createClip({ source: flowerUrl, start: 0, end: 2, origin })
    expect((await tagsOf(tagged)).title).toBe('Flower timelapse')
    for (const options of [{}, { origin, metadata: false }]) {
      const tags = await tagsOf(await createClip({ source: tagged, start: 0, end: 1, ...options }))
      expect(tags.title).toBeUndefined()
      expect(tags.comment).toBeUndefined()
      expect(Object.keys(tags.raw ?? {})).toEqual([])
    }
  })
})
