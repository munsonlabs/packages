import { describe, expect, it } from 'vite-plus/test'
import { engine } from '@test/browser/helpers'

/**
 * Pins down the engine behaviour reel works around in `clip.ts`: drawing a sub-rectangle of a
 * `VideoFrame` with the 9-argument `drawImage`. Chromium honours the source rectangle; WebKit (26.5)
 * ignores it and draws the whole frame. If this test starts failing in WebKit, the bug is fixed.
 */
describe('drawImage(VideoFrame, sx, sy, sw, sh, dx, dy, dw, dh)', () => {
  it('honours the source rectangle, except in WebKit', async () => {
    const source = new OffscreenCanvas(100, 100)
    const s = source.getContext('2d') as OffscreenCanvasRenderingContext2D
    s.fillStyle = '#f00'
    s.fillRect(0, 0, 50, 100)
    s.fillStyle = '#00f'
    s.fillRect(50, 0, 50, 100)
    const frame = new VideoFrame(source, { timestamp: 0 })
    const target = new OffscreenCanvas(100, 100)
    const t = target.getContext('2d') as OffscreenCanvasRenderingContext2D
    t.drawImage(frame, 50, 0, 50, 100, 0, 0, 100, 100)
    frame.close()
    const [r, , b] = t.getImageData(10, 50, 1, 1).data
    const honoured = b > 200 && r < 50
    console.log(`REEL_DRAWIMAGE ${engine()} source rect honoured: ${honoured}`)
    expect(honoured).toBe(!engine().startsWith('webkit'))
  })
})
