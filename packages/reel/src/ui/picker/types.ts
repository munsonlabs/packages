import type { CaptionStyle } from '@/types'

/**
 * Where the captions sit in the clip, chosen in the panel; `CaptionStyle.position`.
 */
export type CaptionPosition = NonNullable<CaptionStyle['position']>

/**
 * What the picker is doing; drives which parts of the panel are shown and enabled.
 */
export type PickerState = 'closed' | 'loading' | 'editing' | 'blocked' | 'exporting' | 'done'

/**
 * `detail` of the `reel-export` event (the `export` event's argument in Vue).
 */
export interface ReelExportDetail {
  blob: Blob
  start: number
  end: number
  link: string | null
}

/**
 * `detail` of the `reel-error` event: a `ClipBlocker` code, `'export-failed'`, `'no-player'` or
 * `'no-source'` (fatal: nothing was made), or one of the non-fatal reasons, where the picker carries
 * on without something optional: `'logo-unavailable'` (the clip was made without the logo),
 * `'thumbnails-unavailable'` (the filmstrip stays plain), `'captions-unavailable'` (the chosen
 * captions would not load, so the clip was made without them) and `'audio-unavailable'` (this
 * browser cannot write the source's sound as AAC, so the clip is silent).
 */
export interface ReelErrorDetail {
  reason: string
  message: string
  fatal: boolean
}

/**
 * `detail` of the `reel-copy` event.
 */
export interface ReelCopyDetail {
  text: string
  result: 'copied' | 'selected'
}

/**
 * What `share()` did: shared through the Web Share API, downloaded instead, or nothing (the sheet
 * was dismissed).
 */
export type ShareResult = 'shared' | 'downloaded' | 'dismissed'

/**
 * What a picker can be asked to do, and what it reports: the methods and read-only state of
 * `<ml-reel-picker>`, and of a `ReelPicker` template ref.
 */
export interface PickerApi {
  show(): void
  close(): void
  export(): Promise<void>
  cancel(): void
  share(): Promise<ShareResult>
  download(): void
  copyCaption(): Promise<ReelCopyDetail['result'] | null>
  readonly state: PickerState
  readonly range: { start: number; end: number }
  readonly cropFocus: { x: number; y: number }
  readonly captionPosition: CaptionPosition
  readonly shareCaption: string | null
}
