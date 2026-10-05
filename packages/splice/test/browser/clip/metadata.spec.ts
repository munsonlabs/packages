import { describe, expect, it } from 'vite-plus/test'
import { ALL_FORMATS, BlobSource, Input, type MetadataTags } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createClipLink, createSplice } from '@/index'

const origin = { url: 'https://example.com/watch/42', title: 'Flower timelapse', publisher: 'Munson Labs' }

async function readTags(blob: Blob): Promise<MetadataTags> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  const tags = await input.getMetadataTags()
  input.dispose()
  return tags
}

describe('origin metadata', () => {
  it('writes the origin into MP4 tags that read back intact', async () => {
    const tags = await readTags(await createSplice({ source: flowerUrl, start: 1, end: 4, origin }))
    const link = createClipLink(origin, 1, 4)

    expect(tags.title).toBe('Flower timelapse')
    expect(tags.artist).toBe('Munson Labs')
    expect(tags.comment).toBe(link)
    expect(tags.description).toContain(link)
    expect(tags.date).toBeInstanceOf(Date)
  })

  it('carries none of the source’s tags without an origin', async () => {
    // flower.mp4 has no tags, so the source here is a clip that does.
    const tagged = await createSplice({ source: flowerUrl, start: 0, end: 2, origin })
    expect((await readTags(tagged)).title).toBe('Flower timelapse')

    const tags = await readTags(await createSplice({ source: tagged, start: 0, end: 1 }))
    expect(tags.title).toBeUndefined()
    expect(tags.comment).toBeUndefined()
    expect(Object.keys(tags.raw ?? {})).toEqual([])
  })
})
