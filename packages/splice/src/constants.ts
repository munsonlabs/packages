export const ERROR_NO_VIDEO_TRACK = 'The source has no video track.'
export const ERROR_UNREACHABLE = (url: string) =>
  `Could not fetch ${url}. If it is on another origin it must send Access-Control-Allow-Origin (and allow Range requests).`
export const ERROR_UNDECODABLE_VIDEO = (codec: string | null) => `This browser cannot decode the source's ${codec ?? 'unknown'} video.`
export const ERROR_EMPTY_RANGE = (start: number, end: number, duration: number) =>
  `End (${end}) must be after start (${start}) and within the source (${duration}s).`
export const ERROR_ENCODER_STALLED = (seconds: number) =>
  `The video encoder stopped responding for ${seconds}s, so the clip was abandoned. This is usually the device's hardware encoder being busy; try again.`
export const ERROR_NO_VIDEO_ENCODER = (width: number, height: number) => `This browser has no H.264 encoder for a ${width}x${height} clip.`

export const WARNING_AUDIO_UNAVAILABLE = (codec: string | null) =>
  `The audio is left out, this browser has no AAC encoder for the source's ${codec} audio.`
export const ERROR_CAPTIONS_UNREACHABLE = (url: string) =>
  `Could not fetch the captions at ${url}. If they are on another origin it must send Access-Control-Allow-Origin.`
export const ERROR_CAPTIONS_STATUS = (url: string, status: number) => `The captions at ${url} could not be loaded: the server answered ${status}.`
export const ERROR_CAPTIONS_NOT_VTT = (url: string) => `The file at ${url} is not WebVTT captions (it has no WEBVTT header).`

export const WARNING_CAPTIONS_UNAVAILABLE = (detail: string) => `The captions are left out. ${detail}`

export const CAPTION_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
export const CAPTION_COLOR = '#ffffff'
export const CAPTION_BACKGROUND = 'rgba(0, 0, 0, 0.6)'
export const CAPTION_SIZE = 0.045
export const CAPTION_LINE_HEIGHT = 1.3
export const CAPTION_MARGIN = 0.14
export const CAPTION_MAX_WIDTH = 0.86

export const ERROR_IMAGE_UNLOADABLE = (src: string) => `${src} did not load (a network error, or a cross-origin image without CORS headers).`
export const WARNING_LOGO_UNAVAILABLE = (name: string, detail: string) => `The ${name} is left out. ${detail}`

export const IMAGE_SIZE = 1024

export const WATERMARK_SIZE = 0.022
export const WATERMARK_COLOR = '#ffffff'
export const WATERMARK_BACKGROUND = 'rgba(0, 0, 0, 0.45)'

export const STAMP_SIZE = 0.18
export const STAMP_OPACITY = 0.9
export const STAMP_MARGINS = {
  'top-left': { x: 0.05, y: 0.11 },
  'top-right': { x: 0.05, y: 0.11 },
  'bottom-left': { x: 0.05, y: 0.24 },
  'bottom-right': { x: 0.2, y: 0.24 },
} as const

export const END_CARD_DURATION = 2.5
export const END_CARD_FADE = 0.35
export const END_CARD_FRAME = 1 / 30
export const END_CARD_CTA = 'Watch the full video at'
export const END_CARD_THEME = { background: '#10241a', color: '#ffffff', accent: '#e2a32e' }

export const STALL_TIMEOUT = 15
export const MIN_FRAME = [1080, 1920] as const
