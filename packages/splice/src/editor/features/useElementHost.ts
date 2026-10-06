import { getCurrentInstance, watchEffect, type Ref } from 'vue'
import type { EditorErrorDetail, EditorExportDetail, EditorState } from '@/types/editor'

export type EditorEvents = {
  'update:open': [open: boolean]
  export: [detail: EditorExportDetail]
  error: [detail: EditorErrorDetail]
}

type Emit = <K extends keyof EditorEvents>(type: K, ...[detail]: EditorEvents[K]) => void

/**
 * Wraps emit for when the editor runs as <ml-splice-editor>. In Vue it emits as normal. As an
 * element it fires bubbling splice-* events with the payload in detail, since Vue's error event
 * would clash with the DOM one. Opening and closing also toggle the open attribute and fire
 * splice-open or splice-close, and data-state follows the state.
 */
export function useElementHost(vueEmit: Emit, state: Ref<EditorState>): Emit {
  /**
   * Not using useHost() because it warns in dev whenever the editor is used as a normal component.
   */
  const host = (getCurrentInstance() as { ce?: HTMLElement } | null)?.ce ?? null
  if (!host) return vueEmit

  watchEffect(() => (host.dataset.state = state.value))

  return (type, ...[detail]) => {
    const isOpen = type === 'update:open'
    const name = isOpen ? (detail ? 'open' : 'close') : type
    if (isOpen) host.toggleAttribute('open', detail as boolean)
    host.dispatchEvent(new CustomEvent(`splice-${name}`, { detail: isOpen ? undefined : detail, bubbles: true, composed: true }))
  }
}
