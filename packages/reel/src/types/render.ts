/**
 * How burned-in captions look: overrides on reel's one caption look, white bold text on a translucent
 * dark box near the bottom, made for desktop and TV viewing. Values left out (or `undefined`) keep the
 * defaults below. Sizes and vertical distances are fractions of the output height, widths fractions of
 * its width, so a caption looks the same at every output size. Long cues wrap onto more lines.
 */
export interface CaptionStyle {
  fontFamily?: string
  fontWeight?: number | string
  size?: number
  color?: string
  background?: string | null
  position?: 'top' | 'middle' | 'bottom'
  margin?: number
  maxWidth?: number
}

/**
 * Colours and font of the end card.
 */
export interface EndCardTheme {
  background?: string
  color?: string
  accent?: string
  font?: string
}

/**
 * An image reel can draw: anything `drawImage` takes, a `Blob`, or a URL (fetched, so CORS
 * applies).
 */
export type ImageSource = CanvasImageSource | Blob | string | URL

export interface EndCardOptions {
  duration?: number
  title?: string
  displayUrl?: string
  publisher?: string
  cta?: string
  logo?: ImageSource
  theme?: EndCardTheme
  draw?: (ctx: OffscreenCanvasRenderingContext2D, info: EndCardInfo) => void
}

/**
 * Everything the end card renderer gets for one frame. Values are resolved: defaults applied, logo
 * loaded.
 */
export interface EndCardInfo {
  width: number
  height: number
  time: number
  duration: number
  progress: number
  title: string | null
  url: string | null
  displayUrl: string | null
  publisher: string | null
  cta: string
  logo: ImageBitmap | null
  theme: Required<EndCardTheme>
  lastFrame: OffscreenCanvas
}

export interface WatermarkOptions {
  text: string
  position?: 'top' | 'bottom'
  background?: string
  color?: string
  size?: number
  font?: string
}

/**
 * A corner of the frame.
 */
export type StampPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * A logo stamped over every frame of a clip. Sizes and margins are fractions of the output, so the
 * stamp sits the same at 404x720 and 1080x1920.
 */
export interface StampOptions {
  logo: ImageSource
  position?: StampPosition
  size?: number
  margin?: number | { x?: number; y?: number }
  opacity?: number
}
