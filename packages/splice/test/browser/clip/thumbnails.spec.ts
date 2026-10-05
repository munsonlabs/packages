import { describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createThumbnails } from '@/index'
import { trackFrames } from '@test/browser/helpers'

describe('createThumbnails', () => {
  it('hands over evenly spaced thumbnails, in order, at the width asked for', async () => {
    const frames = trackFrames()
    const seen: Array<{ index: number; time: number; width: number; height: number }> = []

    await createThumbnails({
      source: flowerUrl,
      count: 5,
      width: 120,
      onThumbnail: (index, image, time) => {
        const { width, height } = image as OffscreenCanvas
        seen.push({ index, time, width, height })
      },
    }).finally(() => frames.restore())

    expect(frames.open, 'VideoFrames left open').toBe(0)
    expect(seen.map((thumbnail) => thumbnail.index)).toEqual([0, 1, 2, 3, 4])
    // flower.mp4 is 5.06s long: a thumbnail roughly every second.
    expect(seen.map((thumbnail) => Math.round(thumbnail.time))).toEqual([0, 1, 2, 3, 4])
    // 960x540 at 120 wide is 67.5 high, made even.
    expect(seen.every((thumbnail) => thumbnail.width === 120 && thumbnail.height === 66)).toBe(true)
  })

  it('stays inside start and end', async () => {
    const times: number[] = []
    await createThumbnails({ source: flowerUrl, start: 2, end: 4, count: 4, onThumbnail: (_index, _image, time) => times.push(time) })
    expect(times).toEqual([2, 2.5, 3, 3.5])
  })
})
