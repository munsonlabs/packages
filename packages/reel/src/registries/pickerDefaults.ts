import type { CaptionStyle, EndCardOptions, ImageSource, StampOptions, WatermarkOptions } from '@/types'

/**
 * The words the picker shows, so a page can translate or reword them.
 */
export interface PickerLabels {
  title: string
  close: string
  crop: string
  cropHint: string
  start: string
  end: string
  thumbnailsUnavailable: string
  captionsUnavailable: string
  play: string
  pause: string
  mute: string
  unmute: string
  captions: string
  captionsOff: string
  captionPosition: string
  positionTop: string
  positionMiddle: string
  positionBottom: string
  endCard: string
  logo: string
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
  copyFallback: string
  captionField: string
  logoUnavailable: string
  captionsLeftOut: string
  audioLeftOut: string
  again: string
}

/**
 * What a share caption template is filled in from.
 */
export interface ShareCaptionInfo {
  title: string
  url: string
  publisher: string
  start: number
  end: number
}

/**
 * Where the picker's stamp goes and how it looks; the logo itself is `PickerDefaults.logo`.
 */
export type PickerStamp = Omit<StampOptions, 'logo'>

/**
 * Page-wide settings every picker starts from; a picker's own props win.
 */
export interface PickerDefaults {
  labels: PickerLabels
  length: number
  shortest: number
  longest: number
  span: number
  height?: number
  endCard: EndCardOptions | true
  captionStyle: CaptionStyle
  watermark?: WatermarkOptions
  logo?: ImageSource
  stamp: boolean | PickerStamp
  displayUrl?: string
  shareCaption: string | ((info: ShareCaptionInfo) => string)
  filename: (title: string | undefined, start: number, end: number) => string
}

const defaults: PickerDefaults = {
  labels: {
    title: 'Clip this moment',
    close: 'Close',
    crop: 'Crop position',
    cropHint: 'Drag to reframe',
    start: 'Clip start',
    end: 'Clip end',
    thumbnailsUnavailable: 'Thumbnails unavailable',
    captionsUnavailable: 'These captions could not be loaded',
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    captions: 'Captions',
    captionsOff: 'Off',
    captionPosition: 'Caption position',
    positionTop: 'Top',
    positionMiddle: 'Middle',
    positionBottom: 'Bottom',
    endCard: 'End card with a link back',
    logo: 'Logo on the clip',
    export: 'Export clip',
    cancel: 'Cancel',
    preparing: 'Preparing…',
    exporting: 'Exporting…',
    cancelled: 'Export cancelled.',
    done: 'Your clip is ready.',
    download: 'Download',
    share: 'Share',
    copyCaption: 'Copy caption with link',
    copied: 'Copied',
    copyFallback: 'Could not copy automatically: the caption is selected below, ready to copy.',
    captionField: 'Caption with link',
    logoUnavailable: 'The logo could not be loaded, so the clip was made without it.',
    captionsLeftOut: 'The captions could not be loaded, so the clip was made without them.',
    audioLeftOut: 'This browser cannot write the sound as AAC, so the clip is silent.',
    again: 'Edit again',
  },
  length: 10,
  shortest: 1,
  longest: 60,
  span: 90,
  endCard: true,
  captionStyle: {},
  stamp: true,
  shareCaption: '{title}\n\n{url}',
  filename: (title, start, end) => {
    const slug = (title ?? 'clip')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)
    return `${slug || 'clip'}-${Math.round(start)}-${Math.round(end)}`
  },
}

/**
 * What lives on the page-wide instance; kept to plain data and two functions so any copy of reel
 * can read it.
 */
interface Shared {
  pickerDefaults: PickerDefaults
}

const KEY = Symbol.for('@munsonlabs/reel')
const shared = globalThis as { [KEY]?: Shared }
const instance: Shared = (shared[KEY] ??= { pickerDefaults: defaults })

/**
 * Shared by every copy of reel on the page through a well-known `globalThis` symbol (like sigil's
 * registry), so a script the app did not bundle can still reword or retheme the picker.
 */
export function getPickerDefaults(): PickerDefaults {
  return instance.pickerDefaults
}

/**
 * Merges `changes` into the shared picker defaults. `labels` merges key by key. Pickers read the
 * defaults when they open, so a change applies from the next open.
 */
export function setPickerDefaults(changes: Partial<Omit<PickerDefaults, 'labels'>> & { labels?: Partial<PickerLabels> }): void {
  const current = instance.pickerDefaults
  instance.pickerDefaults = { ...current, ...changes, labels: { ...current.labels, ...changes.labels } }
}

/**
 * Fills the template (or calls the function) and removes the blank lines an empty `{title}` or `{url}`
 * leaves, so a clip without a title still copies just its link.
 */
export function formatShareCaption(template: PickerDefaults['shareCaption'], info: ShareCaptionInfo): string {
  const text =
    typeof template === 'function'
      ? template(info)
      : template.replace(/\{(title|url|publisher)\}/g, (_match, key: 'title' | 'url' | 'publisher') => info[key])
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * The picker's own `endCard` object or the shared one, with the shared logo and display address filled
 * in where the card has none.
 */
export function endCardFor(own: EndCardOptions | boolean | undefined, defaults: PickerDefaults): EndCardOptions {
  const chosen = typeof own === 'object' ? own : defaults.endCard
  const card: EndCardOptions = chosen === true ? {} : { ...chosen }
  if (card.logo === undefined && defaults.logo !== undefined) {
    card.logo = defaults.logo
  }
  if (card.displayUrl === undefined && defaults.displayUrl !== undefined) {
    card.displayUrl = defaults.displayUrl
  }
  return card
}
