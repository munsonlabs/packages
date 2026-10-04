import { describe, expect, it } from 'vite-plus/test'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { createStoryboard, parseVtt } from '@/index'
import { trackFrames } from '@test/browser/helpers'

describe('createStoryboard', () => {
  it('builds a sprite and a VTT that points into it', async () => {
    const frames = trackFrames()
    try {
      const board = await createStoryboard({ source: flowerUrl, interval: 1, tileWidth: 120, columns: 3, imageUrl: 'thumbs.jpg' })
      expect(frames.open, 'VideoFrames left open').toBe(0)
      expect(board.count).toBe(6)
      expect(board.tileHeight).toBe(66)
      expect(board.image.type).toBe('image/jpeg')

      const bitmap = await createImageBitmap(board.image)
      expect([bitmap.width, bitmap.height]).toEqual([360, 132])
      bitmap.close()

      const cues = parseVtt(board.vtt)
      expect(cues).toHaveLength(6)
      expect(cues[0]).toEqual({ start: 0, end: 1, text: 'thumbs.jpg#xywh=0,0,120,66' })
      expect(cues[4]).toEqual({ start: 4, end: 5, text: 'thumbs.jpg#xywh=120,66,120,66' })
    } finally {
      frames.restore()
    }
  })
})
