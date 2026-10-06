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
