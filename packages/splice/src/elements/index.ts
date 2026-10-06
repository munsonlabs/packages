import { defineCustomElement } from 'vue'
import SpliceEditor from '@/editor/SpliceEditor.vue'
import type { SpliceEditorElement as SpliceEditorElementType } from '@/types/element'

export const SpliceEditorElement = defineCustomElement(SpliceEditor, { shadowRoot: false }) as unknown as {
  new (): SpliceEditorElementType
  prototype: SpliceEditorElementType
}
export type SpliceEditorElement = SpliceEditorElementType

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

export type * from '@/types/editor'
