import type { CaptionStyle } from '@/types/render'

/**
 * One caption, timed on the source's timeline (the same times a `<track>` uses), in seconds.
 */
export interface CaptionCue {
  start: number
  end: number
  text: string
}

/**
 * Captions given as they are: parsed cues, a `TextTrack` (whose cues the browser has loaded, i.e. its
 * `mode` is not `'disabled'`), the text of a WebVTT file, or the URL of one (a `URL`, or a string that
 * does not start with `WEBVTT`; see `isVttFile`), which is fetched. Only WebVTT is read: convert SRT to
 * WebVTT first.
 */
export type CaptionInput = CaptionCue[] | string | URL | TextTrack

/**
 * A caption track passed in, in the shape of video-player's `tracks` prop (`CaptionTrackDef`), with a
 * `src` that may also be the caption text itself.
 */
export interface CaptionTrackSource {
  src: string | URL
  kind?: 'captions' | 'subtitles'
  srclang?: string
  label?: string
  default?: boolean
}

export interface CaptionOptions {
  cues?: CaptionInput
  tracks?: CaptionTrackSource[]
  track?: string
  style?: CaptionStyle
}

/**
 * A caption track a source offers, as listed by `listCaptionTracks()`.
 */
export interface CaptionTrackInfo {
  id: string
  kind: 'passed' | 'hls' | 'text-track'
  language: string
  label: string
  default: boolean
}
