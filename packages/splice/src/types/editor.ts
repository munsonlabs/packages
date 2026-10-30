import type { PlayerHandle } from '@munsonlabs/video-player'
import type {
  CaptionPosition,
  CaptionStyle,
  CropOptions,
  EndCardOptions,
  SpliceOrigin,
  SpliceSource,
  StampOptions,
  WatermarkOptions,
} from '@/types/splice'

export interface SpliceEditorProps {
  open?: boolean
  player?: PlayerHandle | null
  for?: string
  source?: SpliceSource | null
  src?: string
  origin?: SpliceOrigin
  endCard?: EndCardOptions | false
  stamp?: StampOptions
  watermark?: WatermarkOptions
  captionPosition?: CaptionPosition
  captionStyle?: CaptionStyle
  aspect?: CropOptions['aspect']
  aspects?: CropOptions['aspect'][]
  clipLength?: number
  shortestClip?: number
  longestClip?: number
  timelineSpan?: number
  height?: number
  shareCaption?: ShareCaption
  labels?: Partial<EditorLabels>
}

export interface EditorLabels {
  title: string
  close: string
  crop: string
  cropHint: string
  start: string
  end: string
  play: string
  pause: string
  mute: string
  unmute: string
  captions: string
  captionsOff: string
  endCard: string
  logo: string
  shape: string
  captionPosition: string
  positionTop: string
  positionMiddle: string
  positionBottom: string
  export: string
  cancel: string
  preparing: string
  exporting: string
  cancelled: string
  done: string
  download: string
  share: string
  copyCaption: string
  copied: string
  captionCopied: string
  copyFailed: string
  again: string
}

export interface ShareCaptionInfo {
  title: string
  url: string
  publisher: string
  start: number
  end: number
}

export type ShareCaption = string | ((info: ShareCaptionInfo) => string)

export type EditorState = 'closed' | 'loading' | 'editing' | 'blocked' | 'exporting' | 'done'

export interface EditorExportDetail {
  blob: Blob
  start: number
  end: number
  link: string | null
}

export interface EditorErrorDetail {
  message: string
  fatal: boolean
}
