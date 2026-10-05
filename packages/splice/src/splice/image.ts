import { ERROR_IMAGE_UNLOADABLE, IMAGE_SIZE } from '@/constants'
import type { ImageSource } from '@/types/splice'

/**
 * Loads a logo as an ImageBitmap with its longer side at IMAGE_SIZE, so SVGs stay sharp at
 * 1080x1920. It goes through an <img crossOrigin="anonymous">, so a cross-origin image without CORS
 * headers fails here instead of tainting the canvas later.
 */
export async function loadImage(source: ImageSource): Promise<ImageBitmap> {
  const isBlob = source instanceof Blob
  const url = isBlob ? URL.createObjectURL(source) : new URL(source, globalThis.location?.href).href
  const image = await loadElement(url).finally(() => {
    if (isBlob) URL.revokeObjectURL(url)
  })

  const hasSize = image.naturalWidth > 0 && image.naturalHeight > 0
  const naturalWidth = hasSize ? image.naturalWidth : IMAGE_SIZE
  const naturalHeight = hasSize ? image.naturalHeight : IMAGE_SIZE
  const scale = IMAGE_SIZE / Math.max(naturalWidth, naturalHeight)
  const width = Math.max(1, Math.round(naturalWidth * scale))
  const height = Math.max(1, Math.round(naturalHeight * scale))

  const canvas = new OffscreenCanvas(width, height)
  canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
  return createImageBitmap(canvas)
}

/**
 * Loads a URL into an <img> with crossOrigin set to anonymous, so an image with CORS headers can
 * still be read off a canvas.
 */
function loadElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(ERROR_IMAGE_UNLOADABLE(src.startsWith('blob:') ? 'The image' : src)))
    image.src = src
  })
}
