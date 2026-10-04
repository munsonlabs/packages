import { defineCustomElement } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import ReelPicker from '@/ui/picker/ReelPicker.vue'
import type { PickerApi } from '@/ui/picker/types'
import type { ClipOrigin, ClipSource, EndCardOptions, WatermarkOptions } from '@/types'

/**
 * `<ml-reel-picker>`: `ReelPicker` as a custom element, rendered without a shadow root like
 * video-player's elements. It clips the page's player, found through the `for` attribute (the id of
 * an `<ml-video-player>`) or a `player` property holding its handle. Properties: `source` (attribute
 * `src` for a URL; defaults to the player's own), `origin`, `endCard`, `watermark` and `open`
 * (attribute), which opens and closes it. Methods and read-only state are {@link PickerApi}'s
 * (`state` is also on `data-state`). Events are bubbling `reel-*` `CustomEvent`s with the same `detail`
 * the Vue component emits.
 */
export interface ReelPickerElement extends HTMLElement, PickerApi {
  player: PlayerHandle | null
  for: string | undefined
  source: ClipSource | null
  src: string | undefined
  origin: ClipOrigin | undefined
  endCard: EndCardOptions | boolean | undefined
  watermark: WatermarkOptions | undefined
  open: boolean
}

export const ReelPickerElement = defineCustomElement(ReelPicker, { shadowRoot: false }) as unknown as {
  new (): ReelPickerElement
  prototype: ReelPickerElement
}

const EMBEDDED_STYLE = '__INLINE_CSS(style.css)__'

/**
 * Registers the tag once and puts reel's stylesheet on the page once. An already defined tag is left
 * alone, so two copies of reel coexist.
 */
export function defineReelPicker(tag = 'ml-reel-picker'): void {
  if (typeof customElements === 'undefined') return
  if (!document.querySelector('style[data-reel-picker]')) {
    const style = document.createElement('style')
    style.setAttribute('data-reel-picker', '')
    style.textContent = EMBEDDED_STYLE
    document.head.appendChild(style)
  }
  if (!customElements.get(tag)) customElements.define(tag, ReelPickerElement as unknown as CustomElementConstructor)
}

const deferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!deferred) defineReelPicker()

export * from '@/vue'
