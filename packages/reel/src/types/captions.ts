import type { CaptionStyle } from '@/types/render'

/** One caption, timed on the source's timeline (the same times a `<track>` uses), in seconds. */
export interface CaptionCue {
  start: number
  end: number
  text: string
}

/**
 * Captions given as they are: parsed cues, a `TextTrack` (whose cues the browser has loaded, i.e. its
 * `mode` is not `'disabled'`), the text of a WebVTT file, or the URL of one (a `URL`, or a string that
 * is not caption text; see `isCaptionText`), which is fetched. Only WebVTT is read: convert SRT to
 * WebVTT first.
 */
export type CaptionInput = CaptionCue[] | string | URL | TextTrack

/**
 * A caption track passed in, in the shape of video-player's `tracks` prop (`CaptionTrackDef`), with a
 * `src` that may also be the caption text itself.
 */
export interface CaptionTrackSource {
  /** The URL of a WebVTT file (a `URL`, or a string relative to `document.baseURI`), or its text. */
  src: string | URL
  kind?: 'captions' | 'subtitles'
  /** BCP 47 language tag, e.g. `'en'` or `'fr-CA'`. */
  srclang?: string
  /** The name to show; defaults to `srclang`. */
  label?: string
  /** Chosen when no track is asked for (otherwise the one matching `navigator.language`, else the first). */
  default?: boolean
}

export interface CaptionOptions {
  /**
   * The cues to burn in: cues, a `TextTrack`, WebVTT text, or the URL of a WebVTT file
   * (fetched with the clip's `signal`). Takes precedence over `tracks`.
   */
  cues?: CaptionInput
  /**
   * Caption tracks to choose from, in the shape of video-player's `tracks` prop. The one marked
   * `default` is burned in, else the first matching `navigator.language`, else the first.
   */
  tracks?: CaptionTrackSource[]
  /** How they look: overrides on the caption look (see {@link CaptionStyle}). */
  style?: CaptionStyle
}
