import type { EditorLabels } from '@/types/editor'

export const DEFAULT_LABELS: EditorLabels = {
  title: 'Clip this moment',
  close: 'Close',
  crop: 'Crop position',
  cropHint: 'Drag to reframe',
  start: 'Clip start',
  end: 'Clip end',
  play: 'Play',
  pause: 'Pause',
  mute: 'Mute',
  unmute: 'Unmute',
  captions: 'Captions',
  captionsOff: 'Off',
  endCard: 'End card',
  logo: 'Logo',
  captionPosition: 'Caption position',
  positionTop: 'Top',
  positionMiddle: 'Middle',
  positionBottom: 'Bottom',
  export: 'Export',
  cancel: 'Cancel',
  preparing: 'Preparing…',
  exporting: 'Exporting…',
  cancelled: 'Export cancelled.',
  done: 'Your clip is ready.',
  download: 'Download',
  share: 'Share',
  copyCaption: 'Copy caption with link',
  copied: 'Copied',
  captionCopied: 'The caption is copied, to paste with your post.',
  copyFailed: 'Could not copy the caption.',
  again: 'Edit again',
}

export const CLIP_LENGTH = 10
export const SHORTEST_CLIP = 1
export const LONGEST_CLIP = 60
export const TIMELINE_SPAN = 90
export const SHARE_CAPTION = '{title}\n\n{url}'
export const END_GAP = 0.05
