import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setPickerDefaults } from '@/elements'
import { engine, pixelsAt } from '@test/browser/helpers'
import { PickerHarness, sampleTimes, sleep, waitFor } from '@test/browser/picker-harness'

const harness = new PickerHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)
const video = () => harness.video()
/** The player's captions: one cue over the whole fixture, one line at the export's 1080x1920. */
const track = (text: string) => ({ src: harness.vtt(text), srclang: 'en', label: 'English', default: true })
const openEditing = (text?: string) => harness.open({ endCard: false }, { tracks: text ? [track(text)] : undefined })

const captions = 'WEBVTT\n\n00:00:00.000 --> 00:00:05.100\nSame caption in both\n'

beforeEach(() => {
  setPickerDefaults({ length: 2, longest: 3 })
})

afterEach(() => {
  harness.cleanup()
  vi.restoreAllMocks()
})

const pause = () => harness.pause()
const seekTo = (at: number) => harness.seekTo(at)

/** The white caption fill as a coarse grid over the frame: each cell the fraction of its pixels that are fill. */
type Grid = number[][]
const COLUMNS = 27
const ROWS = 48

function grid(width: number, height: number, isFill: (x: number, y: number) => boolean): Grid {
  const cells: Grid = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => 0))
  const counts: Grid = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => 0))
  for (let y = 0; y < height; y++) {
    const row = Math.min(ROWS - 1, Math.floor((y / height) * ROWS))
    for (let x = 0; x < width; x++) {
      const column = Math.min(COLUMNS - 1, Math.floor((x / width) * COLUMNS))
      counts[row][column]++
      if (isFill(x, y)) cells[row][column]++
    }
  }
  return cells.map((row, r) => row.map((value, c) => value / counts[r][c]))
}

/** The overlay canvas's fill: opaque, white pixels. */
function overlayGrid(canvas: HTMLCanvasElement): Grid {
  const image = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
  const d = image.data
  return grid(image.width, image.height, (x, y) => {
    const i = (y * image.width + x) * 4
    return d[i + 3] > 200 && d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200
  })
}

/** The export's fill: white pixels that the captionless export does not have. */
function exportGrid(captioned: ImageData, plain: ImageData): Grid {
  const a = captioned.data
  const b = plain.data
  return grid(captioned.width, captioned.height, (x, y) => {
    const i = (y * captioned.width + x) * 4
    const white = a[i] > 200 && a[i + 1] > 200 && a[i + 2] > 200
    return white && Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60
  })
}

/** The cells with fill in them (over 5% of their pixels), and their bounds as fractions of the frame. */
function shape(cells: Grid) {
  const on = new Set<string>()
  let top = ROWS
  let bottom = -1
  let left = COLUMNS
  let right = -1
  cells.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value <= 0.05) return
      on.add(`${r},${c}`)
      top = Math.min(top, r)
      bottom = Math.max(bottom, r)
      left = Math.min(left, c)
      right = Math.max(right, c)
    }),
  )
  return { on, top: top / ROWS, bottom: (bottom + 1) / ROWS, left: left / COLUMNS, right: (right + 1) / COLUMNS }
}

describe('<ml-reel-picker> playhead, frame by frame', () => {
  it('moves the playhead on every frame, far more often than timeupdate, and loops within a frame or two', async () => {
    const picker = await openEditing()
    await harness.playing()
    const playhead = part('.reel-playhead')
    let moves = 0
    const observer = new MutationObserver(() => moves++)
    observer.observe(playhead, { attributes: true, attributeFilter: ['style'] })
    let timeupdates = 0
    const onTimeupdate = () => timeupdates++
    video().addEventListener('timeupdate', onTimeupdate)
    // At least 2.5s, and until the preview has looped: on a loaded machine playback runs slower than
    // the wall clock, and a fixed window could end before the 2s range came round.
    const looped = (times: number[]) => times.some((time, i) => i > 0 && time < times[i - 1] - 1)
    const times = await sampleTimes(video(), looped, 'the player to loop the range', { atLeast: 2500 })
    observer.disconnect()
    video().removeEventListener('timeupdate', onTimeupdate)
    console.log(
      `REEL_PLAYHEAD ${engine()} playhead moves=${moves} timeupdates=${timeupdates} in 2.5s, max past end=${((Math.max(...times) - picker.range.end) * 1000).toFixed(0)}ms`,
    )
    expect(moves).toBeGreaterThan(timeupdates * 2)
    expect(moves).toBeGreaterThan(25)
    expect(Math.max(...times)).toBeLessThanOrEqual(picker.range.end + 0.1)
    expect(looped(times)).toBe(true)
  })
})

/** The cells two shapes share, over the cells either has. */
function iouOf(a: ReturnType<typeof shape>, b: ReturnType<typeof shape>): number {
  const shared = [...a.on].filter((cell) => b.on.has(cell)).length
  return shared / new Set([...a.on, ...b.on]).size
}

describe('<ml-reel-picker> caption overlay', () => {
  for (const [name, captionStyle] of [
    ['default', {}],
    ['raised', { margin: 0.28 }],
  ] as const) {
    it(`draws the ${name} captions over the picture as the export burns them in`, async () => {
      setPickerDefaults({ captionStyle })
      const picker = await openEditing(captions)
      await harness.playing()
      await pause()
      const at = picker.range.start + 0.5
      // Seek by clicking the selection, then let the overlay draw that frame's cues.
      await seekTo(at)
      const canvas = part<HTMLCanvasElement>('.reel-crop canvas.reel-captions')
      await waitFor(() => shape(overlayGrid(canvas)).on.size > 0, 'the overlay to draw the cue')
      // The track the player shows is the one drawn over the picture.
      expect(video().textTracks[0].mode).toBe('showing')
      const preview = shape(overlayGrid(canvas))

      const captioned = await harness.export()
      part<HTMLButtonElement>('.reel-again').click()
      await waitFor(() => picker.state === 'editing', 'the editor again')
      await harness.chooseCaptions('Off')
      const plain = await harness.export()
      const offset = at - picker.range.start
      const clip = shape(exportGrid(await pixelsAt(captioned, offset), await pixelsAt(plain, offset)))

      const shared = [...preview.on].filter((cell) => clip.on.has(cell)).length
      const iou = shared / new Set([...preview.on, ...clip.on]).size
      const fmt = (s: typeof preview) =>
        `${s.top.toFixed(3)}-${s.bottom.toFixed(3)} x ${s.left.toFixed(3)}-${s.right.toFixed(3)} (${s.on.size} cells)`
      console.log(
        `REEL_PREVIEW_CAPTIONS ${engine()} ${name} canvas ${canvas.width}x${canvas.height}: preview ${fmt(preview)}, export ${fmt(clip)}, IoU ${iou.toFixed(2)}`,
      )
      for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
        expect(Math.abs(preview[edge] - clip[edge]), edge).toBeLessThanOrEqual(1.5 / ROWS + 0.01)
      }
      expect(iou).toBeGreaterThan(0.6)
    })
  }

  it('wraps a long cue onto more lines over the preview as the export does', async () => {
    // The editor opens on 1.3-3.3s (two seconds around 2s); one cue over exactly that, far too long for one line.
    const text = 'A caption far too long for one line wraps onto several lines over the preview, breaking exactly where the export breaks it.'
    const picker = await openEditing(`WEBVTT\n\n00:00:01.300 --> 00:00:03.300\n${text}\n`)
    await harness.playing()
    await pause()
    const { start, end } = picker.range
    expect([start, end]).toEqual([1.3, 3.3])
    const at = (start + end) / 2
    const canvas = part<HTMLCanvasElement>('.reel-crop canvas.reel-captions')
    await seekTo(at)
    await waitFor(() => shape(overlayGrid(canvas)).on.size > 0, 'the overlay to draw the cue')
    const preview = shape(overlayGrid(canvas))

    const captioned = await harness.export()
    part<HTMLButtonElement>('.reel-again').click()
    await waitFor(() => picker.state === 'editing', 'the editor again')
    await harness.chooseCaptions('Off')
    const plain = await harness.export()
    const clip = shape(exportGrid(await pixelsAt(captioned, at - start), await pixelsAt(plain, at - start)))

    console.log(
      `REEL_PREVIEW_LONG ${engine()} preview ${preview.top.toFixed(3)}-${preview.bottom.toFixed(3)}, export ${clip.top.toFixed(3)}-${clip.bottom.toFixed(3)}, IoU ${iouOf(preview, clip).toFixed(2)}`,
    )
    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
      expect(Math.abs(preview[edge] - clip[edge]), edge).toBeLessThanOrEqual(1.5 / ROWS + 0.01)
    }
    expect(iouOf(preview, clip)).toBeGreaterThan(0.6)
    // Lines of 86px text are 112px apart in the 1920px-high export: three or more lines span over two of them.
    expect(clip.bottom - clip.top).toBeGreaterThan((2 * 112) / 1920)
    // The block still ends 14% above the frame's bottom.
    expect(clip.bottom).toBeLessThanOrEqual(0.86 + 1 / ROWS)
  })

  it('draws nothing with captions off, and the cue again when they come back on', async () => {
    await openEditing(captions)
    const canvas = part<HTMLCanvasElement>('.reel-crop canvas.reel-captions')
    await waitFor(() => shape(overlayGrid(canvas)).on.size > 0, 'the overlay to draw the cue')
    await harness.chooseCaptions('Off')
    await sleep(300)
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    expect(pixels.some((value, i) => i % 4 === 3 && value > 0)).toBe(false)
    await harness.chooseCaptions('English')
    await waitFor(() => shape(overlayGrid(canvas)).on.size > 0, 'the cue back')
  })
})
