import type { ImageSource } from '@/types'

/**
 * The size an SVG without an intrinsic size is rasterised at, before its transparent margin is
 * trimmed.
 */
/**
 * Vector images are rasterised so their longer side is at least this, so they stay sharp at
 * 1080x1920.
 */
const VECTOR_SIZE = 1024

export type LoadedImage = { ok: true; bitmap: ImageBitmap } | { ok: false; message: string }

function describe(source: ImageSource): string {
  if (typeof source === 'string') {
    return source.startsWith('data:') ? 'a data: URL' : source
  }
  if (source instanceof URL) {
    return source.href
  }
  if (source instanceof Blob) {
    return `a ${source.type || 'untyped'} Blob`
  }
  return 'the image'
}

function isSvg(source: ImageSource): boolean {
  if (typeof source === 'string' || source instanceof URL) {
    const href = String(source)
    return /^data:image\/svg\+xml/i.test(href) || /\.svgz?(?:[?#]|$)/i.test(href)
  }
  return source instanceof Blob && source.type === 'image/svg+xml'
}

/**
 * Loads a URL into an `<img>` with `crossOrigin = 'anonymous'`, so a CORS-enabled image stays
 * readable.
 */
function loadElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('it did not load (a network error, or a cross-origin image without CORS headers)'))
    image.src = src
  })
}

/**
 * Throws when drawing `image` would taint a canvas. A tainted canvas cannot be read back, and the clip's
 * canvas becomes a `VideoFrame` for every frame, which throws a `SecurityError` once it is tainted; so
 * this is found out here, on a 1x1 canvas, rather than mid-export.
 */
function assertReadable(image: CanvasImageSource): void {
  const probe = new OffscreenCanvas(1, 1)
  const ctx = probe.getContext('2d') as OffscreenCanvasRenderingContext2D
  ctx.drawImage(image, 0, 0, 1, 1)
  try {
    ctx.getImageData(0, 0, 1, 1)
  } catch {
    throw new Error('it is cross-origin without CORS headers, so drawing it would taint the clip')
  }
}

/**
 * A vector image is drawn at {@link VECTOR_SIZE} on its longer side; one with no intrinsic size (an
 * SVG with only a `viewBox`) is drawn into a square of that size.
 */
async function rasterise(image: HTMLImageElement, vector: boolean): Promise<ImageBitmap> {
  const natural = image.naturalWidth > 0 && image.naturalHeight > 0
  let width = natural ? image.naturalWidth : VECTOR_SIZE
  let height = natural ? image.naturalHeight : VECTOR_SIZE
  if (vector) {
    const scale = VECTOR_SIZE / Math.max(width, height)
    width = Math.max(1, Math.round(width * scale))
    height = Math.max(1, Math.round(height * scale))
  }
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
  ctx.drawImage(image, 0, 0, width, height)
  return createImageBitmap(canvas)
}

async function decode(source: ImageSource): Promise<ImageBitmap> {
  if (typeof source === 'string' || source instanceof URL) {
    return rasterise(await loadElement(new URL(String(source), globalThis.location?.href).href), isSvg(source))
  }
  if (source instanceof Blob) {
    if (!isSvg(source)) {
      try {
        return await createImageBitmap(source)
      } catch {
        // Fall through to the <img> path, which decodes what createImageBitmap would not.
      }
    }
    // SVG (which createImageBitmap does not decode from a Blob in most engines) goes through an <img>.
    const url = URL.createObjectURL(source)
    try {
      return await rasterise(await loadElement(url), isSvg(source))
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  if (source instanceof HTMLImageElement) {
    if (!source.complete) {
      await source.decode()
    }
    if (source.naturalWidth === 0 && !/\.svg/i.test(source.currentSrc)) {
      throw new Error('the <img> has no picture (it failed to load)')
    }
    assertReadable(source)
    return rasterise(source, /\.svgz?(?:[?#]|$)|^data:image\/svg/i.test(source.currentSrc))
  }
  return createImageBitmap(source as ImageBitmapSource)
}

/**
 * Any {@link ImageSource} as an `ImageBitmap`, proven not to taint the clip's canvas: a URL loads
 * through `<img crossOrigin="anonymous">`, so a cross-origin image without CORS headers fails here
 * instead of making every `VideoFrame` throw later. Never rejects: failure is `{ ok: false, message }`,
 * since a logo is not worth failing a clip over.
 */
export async function loadImage(source: ImageSource): Promise<LoadedImage> {
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await decode(source)
    assertReadable(bitmap)
    return { ok: true, bitmap }
  } catch (error) {
    bitmap?.close()
    const why = error instanceof Error ? error.message : String(error)
    return { ok: false, message: `${describe(source)} could not be used: ${why}.` }
  }
}

/**
 * One load per distinct image for a clip (the same logo URL for stamp and card decodes once); `dispose`
 * closes every bitmap.
 */
export function createImageCache() {
  const cache = new Map<unknown, Promise<LoadedImage>>()
  return {
    load(source: ImageSource): Promise<LoadedImage> {
      const key = source instanceof URL ? source.href : source
      let pending = cache.get(key)
      if (!pending) {
        pending = loadImage(source)
        cache.set(key, pending)
      }
      return pending
    },
    async dispose(): Promise<void> {
      for (const pending of cache.values()) {
        const result = await pending
        if (result.ok) {
          result.bitmap.close()
        }
      }
      cache.clear()
    },
  }
}

export type ImageCache = ReturnType<typeof createImageCache>
