import type { PlayerHandle } from '@munsonlabs/video-player'
import type { CaptionPosition, CaptionStyle, EndCardOptions, SpliceOrigin, SpliceSource, StampOptions, WatermarkOptions } from '@/types/splice'
import type { EditorLabels, EditorState, ShareCaption } from '@/types/editor'

export interface SpliceEditorElement extends HTMLElement {
  player: PlayerHandle | null
  for: string | undefined
  source: SpliceSource | null
  src: string | undefined
  origin: SpliceOrigin | undefined
  endCard: EndCardOptions | false | undefined
  stamp: StampOptions | undefined
  watermark: WatermarkOptions | undefined
  captionPosition: CaptionPosition
  captionStyle: CaptionStyle | undefined
  clipLength: number
  shortestClip: number
  longestClip: number
  timelineSpan: number
  height: number | undefined
  shareCaption: ShareCaption
  labels: Partial<EditorLabels> | undefined
  open: boolean
  readonly state: EditorState
  show(): void
  close(): void
  export(): Promise<void>
  cancel(): void
}
