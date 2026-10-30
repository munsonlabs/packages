import { ALL_FORMATS, BlobSource, CanvasSink, Input } from 'mediabunny'

/** What a produced file contains, read back with Mediabunny rather than trusting splice's own plan. */
export interface Probed {
  format: string
  mimeType: string
  duration: number
  /** `rotation` is the track header's display rotation; a clip should always be 0 (turned in the pixels). */
  video: { codec: string | null; width: number; height: number; rotation: number } | null
  audio: { codec: string | null; sampleRate: number; channels: number } | null
}

export async function probe(blob: Blob): Promise<Probed> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const video = await input.getPrimaryVideoTrack()
    const audio = await input.getPrimaryAudioTrack()
    return {
      format: (await input.getFormat()).name,
      mimeType: await input.getMimeType(),
      duration: await input.computeDuration(),
      video: video
        ? {
            codec: await video.getCodecParameterString(),
            width: await video.getDisplayWidth(),
            height: await video.getDisplayHeight(),
            rotation: await video.getRotation(),
          }
        : null,
      audio: audio ? { codec: await audio.getCodecParameterString(), sampleRate: audio.sampleRate, channels: audio.numberOfChannels } : null,
    }
  } finally {
    input.dispose()
  }
}

/**
 * Loads the file into a real `<video>` element, the same way a viewer would play the exported clip,
 * and resolves with what the browser's own media stack reports, or rejects with its error code.
 *
 * It rejects after `timeout` with the element's state and the events it saw, rather than hanging. The
 * timer also holds the element: without it nothing referenced the detached `<video>` but its own
 * listeners, and under a loaded full run WebKit now and then fired neither `loadeddata` nor `error` for
 * a clip, leaving its spec to die at the 30s test timeout (2 of 8 full runs). With the
 * reference held it has not recurred in 40 full runs; if it does, the message says how far loading got.
 */
export function playable(blob: Blob, timeout = 8000): Promise<{ duration: number; videoWidth: number; videoHeight: number }> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  const seen: string[] = []
  for (const type of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'stalled', 'suspend', 'waiting', 'emptied', 'abort']) {
    video.addEventListener(type, () => seen.push(type))
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  return new Promise<{ duration: number; videoWidth: number; videoHeight: number }>((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve({ duration: video.duration, videoWidth: video.videoWidth, videoHeight: video.videoHeight }), {
      once: true,
    })
    video.addEventListener('error', () => reject(new Error(`<video> error ${video.error?.code}: ${video.error?.message}`)), { once: true })
    timer = setTimeout(() => {
      reject(
        new Error(
          `<video> never loaded ${blob.type} (${blob.size}B): readyState=${video.readyState} networkState=${video.networkState} events=${seen.join(',')}`,
        ),
      )
    }, timeout)
    video.src = url
  }).finally(() => {
    clearTimeout(timer)
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  })
}

/** Decodes the frame at `time` from a produced file and returns its pixels. */
export async function pixelsAt(blob: Blob, time: number): Promise<ImageData> {
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) {
      throw new Error('no video track')
    }
    const sink = new CanvasSink(track)
    const wrapped = await sink.getCanvas(time)
    if (!wrapped) {
      throw new Error(`no frame at ${time}`)
    }
    const canvas = wrapped.canvas
    const ctx = (canvas as OffscreenCanvas).getContext('2d') as OffscreenCanvasRenderingContext2D
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    input.dispose()
  }
}

/** The average colour of a `size` x `size` square centred on `(x, y)`. */
export function colourAt(image: ImageData, x: number, y: number, size = 16): [number, number, number] {
  const sum = [0, 0, 0]
  let count = 0
  for (let row = Math.round(y - size / 2); row < Math.round(y + size / 2); row++) {
    for (let col = Math.round(x - size / 2); col < Math.round(x + size / 2); col++) {
      const i = (row * image.width + col) * 4
      sum[0] += image.data[i]
      sum[1] += image.data[i + 1]
      sum[2] += image.data[i + 2]
      count++
    }
  }
  return [sum[0] / count, sum[1] / count, sum[2] / count]
}

/** Names a saturated colour by its strongest channels: `'red'`, `'green'`, `'blue'`, `'yellow'` or `'other'`. */
export function hue([r, g, b]: [number, number, number]): string {
  const high = (value: number) => value > 150
  const low = (value: number) => value < 90
  if (high(r) && high(g) && low(b)) {
    return 'yellow'
  }
  if (high(r) && low(g) && low(b)) {
    return 'red'
  }
  if (low(r) && high(g) && low(b)) {
    return 'green'
  }
  if (low(r) && low(g) && high(b)) {
    return 'blue'
  }
  return 'other'
}

/** Mean absolute per-channel difference between two equally sized images over rows `[fromRow, toRow)`. */
export function meanDifference(a: ImageData, b: ImageData, fromRow: number, toRow: number): number {
  let total = 0
  let count = 0
  for (let y = fromRow; y < toRow; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4
      total += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
      count += 3
    }
  }
  return total / count
}

/** Fraction of pixels in rows `[fromRow, toRow)` whose summed RGB difference exceeds `threshold`. */
export function changedFraction(a: ImageData, b: ImageData, fromRow: number, toRow: number, threshold = 60): number {
  let changed = 0
  let count = 0
  for (let y = fromRow; y < toRow; y++) {
    for (let x = 0; x < a.width; x++) {
      const i = (y * a.width + x) * 4
      const diff = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
      if (diff > threshold) {
        changed++
      }
      count++
    }
  }
  return changed / count
}

/**
 * Counts `VideoFrame`s that are opened and not yet closed while installed: frames constructed by
 * script, cloned, or emitted by a `VideoDecoder`. The constructors are wrapped in Proxies (not
 * subclasses) so `instanceof VideoFrame` keeps working for frames the browser creates.
 */
export function trackFrames() {
  const open = new Set<VideoFrame>()
  const Frame = globalThis.VideoFrame
  const Decoder = globalThis.VideoDecoder
  const close = Frame.prototype.close
  const clone = Frame.prototype.clone

  Frame.prototype.close = function (this: VideoFrame) {
    open.delete(this)
    return close.call(this)
  }
  Frame.prototype.clone = function (this: VideoFrame) {
    const copy = clone.call(this)
    open.add(copy)
    return copy
  }
  globalThis.VideoFrame = new Proxy(Frame, {
    construct(target, args, newTarget) {
      const frame = Reflect.construct(target, args, newTarget) as VideoFrame
      open.add(frame)
      return frame
    },
  })
  globalThis.VideoDecoder = new Proxy(Decoder, {
    construct(target, [init], newTarget) {
      const output = (frame: VideoFrame) => {
        open.add(frame)
        init.output(frame)
      }
      return Reflect.construct(target, [{ ...init, output }], newTarget)
    },
  })

  return {
    get open() {
      return open.size
    },
    restore() {
      Frame.prototype.close = close
      Frame.prototype.clone = clone
      globalThis.VideoFrame = Frame
      globalThis.VideoDecoder = Decoder
    },
  }
}

/**
 * `image` drawn at `width` x `height` with the browser's best smoothing: a clip made at a small size,
 * as a phone shows it full screen.
 */
export function scaled(image: ImageData, width: number, height: number): ImageData {
  const source = new OffscreenCanvas(image.width, image.height)
  ;(source.getContext('2d') as OffscreenCanvasRenderingContext2D).putImageData(image, 0, 0)
  const target = new OffscreenCanvas(width, height)
  const ctx = target.getContext('2d') as OffscreenCanvasRenderingContext2D
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

/**
 * How crisp the hardest edges in a region are (left/top/right/bottom as fractions of the frame): the
 * `percentile` of the luma's Sobel gradient magnitude over it. Text drawn at the frame's own size steps
 * from fill to background within a pixel or two, a high gradient; text drawn small and scaled up ramps
 * over several pixels, a low one. Flat background counts as zero, so keep the region around the text.
 */
export function edgeSharpness(image: ImageData, region: { left: number; top: number; right: number; bottom: number }, percentile = 0.99): number {
  const { width, data } = image
  const luma = (x: number, y: number) => {
    const i = (y * width + x) * 4
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }
  const magnitudes: number[] = []
  const [x0, x1] = [Math.max(1, Math.round(region.left * width)), Math.min(width - 1, Math.round(region.right * width))]
  const [y0, y1] = [Math.max(1, Math.round(region.top * image.height)), Math.min(image.height - 1, Math.round(region.bottom * image.height))]
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const gx = luma(x + 1, y - 1) + 2 * luma(x + 1, y) + luma(x + 1, y + 1) - luma(x - 1, y - 1) - 2 * luma(x - 1, y) - luma(x - 1, y + 1)
      const gy = luma(x - 1, y + 1) + 2 * luma(x, y + 1) + luma(x + 1, y + 1) - luma(x - 1, y - 1) - 2 * luma(x, y - 1) - luma(x + 1, y - 1)
      magnitudes.push(Math.hypot(gx, gy))
    }
  }
  magnitudes.sort((a, b) => a - b)
  return magnitudes[Math.min(magnitudes.length - 1, Math.floor(magnitudes.length * percentile))]
}

/** Which engine is running, for labelling logged evidence. */
export function engine(): string {
  const ua = navigator.userAgent
  if (/Firefox\//.test(ua)) {
    return `firefox ${/Firefox\/([\d.]+)/.exec(ua)?.[1]}`
  }
  if (/Chrome\//.test(ua)) {
    return `chromium ${/Chrome\/([\d.]+)/.exec(ua)?.[1]}`
  }
  if (/AppleWebKit/.test(ua)) {
    return `webkit ${/Version\/([\d.]+)/.exec(ua)?.[1] ?? ''}`.trim()
  }
  return ua
}

/**
 * Makes every `VideoEncoder` created from now on stall the way macOS's hardware encoder did under load:
 * it takes frames and never outputs or errors. `'flush'`: `encode()` returns at once, and the flush
 * after the last frame never settles (WebKit's stall). `'queue'`: the queue fills and never drains, so
 * the encoder's backpressure holds the next frame. `stalls` picks which configurations stall (say, all
 * but `prefer-software`); the others are the real encoder. A stalled `flush()` rejects on `close()`, as
 * WebCodecs specifies; the queue never fires `dequeue`, the worst case for whoever waits on it.
 */
export function stallVideoEncoders(mode: 'flush' | 'queue', stalls: (config: VideoEncoderConfig) => boolean = () => true) {
  const Encoder = globalThis.VideoEncoder
  const realQueue = Object.getOwnPropertyDescriptor(Encoder.prototype, 'encodeQueueSize')!.get!
  const made: Array<{ encoder: VideoEncoder; stalled: boolean; config?: VideoEncoderConfig }> = []
  globalThis.VideoEncoder = new Proxy(Encoder, {
    construct(target, args, newTarget) {
      const encoder = Reflect.construct(target, args, newTarget) as VideoEncoder
      const record: (typeof made)[number] = { encoder, stalled: false }
      made.push(record)
      let held = 0
      const aborts: Array<() => void> = []
      const configure = encoder.configure.bind(encoder)
      const encode = encoder.encode.bind(encoder)
      const flush = encoder.flush.bind(encoder)
      const close = encoder.close.bind(encoder)
      encoder.configure = (config) => {
        record.config = config
        record.stalled = stalls(config)
        return configure(config)
      }
      // The caller closes its frame after encode(), as Mediabunny does; a stalled encoder keeps nothing.
      encoder.encode = (frame, options) => (record.stalled ? void held++ : encode(frame, options))
      encoder.flush = () =>
        record.stalled ? new Promise<void>((_resolve, reject) => aborts.push(() => reject(new DOMException('Aborted', 'AbortError')))) : flush()
      encoder.close = () => {
        aborts.splice(0).forEach((abort) => abort())
        close()
      }
      if (mode === 'queue') {
        Object.defineProperty(encoder, 'encodeQueueSize', { get: () => (record.stalled ? held : realQueue.call(encoder)) })
      }
      return encoder
    },
  })
  return {
    made,
    restore() {
      globalThis.VideoEncoder = Encoder
    },
  }
}
