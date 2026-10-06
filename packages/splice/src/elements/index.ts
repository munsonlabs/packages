import { defineCustomElement } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import SpliceEditor from '@/editor/SpliceEditor.vue'
import type { CaptionPosition, CaptionStyle, EndCardOptions, SpliceOrigin, SpliceSource, StampOptions, WatermarkOptions } from '@/types/splice'
import type { EditorLabels, EditorState } from '@/types/editor'

/**
 * <ml-splice-editor> is SpliceEditor as a custom element, without a shadow root like video-player's
 * elements. It clips the player named by the for attribute (an <ml-video-player> id) or set as the
 * player property. Strings and numbers go in as attributes, objects and functions as properties. It
 * fires bubbling splice-open, splice-close, splice-export and splice-error events, reflects open
 * and keeps its state on data-state.
 */
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
  labels: Partial<EditorLabels> | undefined
  open: boolean
  readonly state: EditorState
  show(): void
  close(): void
  export(): Promise<void>
  cancel(): void
}

export const SpliceEditorElement = defineCustomElement(SpliceEditor, { shadowRoot: false }) as unknown as {
  new (): SpliceEditorElement
  prototype: SpliceEditorElement
}

const EMBEDDED_STYLE = '__INLINE_CSS(style.css)__'

/**
 * Registers the tag and adds the editor's stylesheet to the page, once each. If the tag is already
 * taken it's left alone, so two copies of splice don't fight over it.
 */
export function defineSpliceEditor(tag = 'ml-splice-editor'): void {
  if (typeof customElements === 'undefined') return

  if (!document.querySelector('style[data-splice-editor]')) {
    const style = document.createElement('style')
    style.setAttribute('data-splice-editor', '')
    style.textContent = EMBEDDED_STYLE
    document.head.appendChild(style)
  }
  if (!customElements.get(tag)) customElements.define(tag, SpliceEditorElement as unknown as CustomElementConstructor)
}

const isDeferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!isDeferred) defineSpliceEditor()

export * from '@/vue'
