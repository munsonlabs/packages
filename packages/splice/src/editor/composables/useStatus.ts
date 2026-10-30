import { ref } from 'vue'
import type { EditorEmit } from './useElementHost'

/**
 * The status line under the toolbar, and reporting problems. A fatal one shows in the status line
 * too; every one goes out as an error event.
 */
export function useStatus(emit: EditorEmit) {
  const status = ref({ text: '', isError: false })

  const setStatus = (text: string, isError = false) => {
    status.value = { text, isError }
  }

  const report = (message: string, fatal: boolean) => {
    if (fatal) setStatus(message, true)
    emit('error', { message, fatal })
  }

  return { status, setStatus, report }
}
