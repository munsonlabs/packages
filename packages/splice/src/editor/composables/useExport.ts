import { ref, shallowRef, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { loadCore } from '../utils'
import type { SpliceOptions } from '@/types/splice'
import type { EditorExportDetail, EditorLabels, EditorState } from '@/types/editor'

export interface ExportDeps {
  state: Ref<EditorState>
  player: () => PlayerHandle | null
  labels: () => EditorLabels
  request: () => SpliceOptions | null
  setStatus: (text: string, isError?: boolean) => void
  report: (message: string, fatal: boolean) => void
  onExport: (detail: EditorExportDetail) => void
}

/**
 * Runs an export with createSplice for whatever the editor has set, pausing the preview while it
 * works and showing the clip when it's done. Cancelling or failing goes back to editing and resumes
 * the preview if it was playing. Closing the editor aborts it.
 */
export function useExport(deps: ExportDeps) {
  const progress = ref(0)
  const result = shallowRef<EditorExportDetail | null>(null)
  const warning = ref('')
  let job: AbortController | null = null
  let resumePlaying = false

  const play = () =>
    void deps
      .player()
      ?.play()
      .catch(() => {})

  const backToEditing = () => {
    deps.state.value = 'editing'
    if (resumePlaying) play()
  }

  async function exportClip(): Promise<void> {
    const options = deps.request()
    if (deps.state.value !== 'editing' || !options) return

    const controller = new AbortController()
    const { signal } = controller
    const { start = 0, end = 0, origin } = options
    const labels = deps.labels()
    const warnings: string[] = []

    job = controller
    resumePlaying = deps.player()?.isPlaying ?? false
    deps.player()?.pause()
    deps.state.value = 'exporting'
    deps.setStatus(labels.exporting)
    progress.value = 0

    const { createClipLink, createSplice } = await loadCore()
    const onProgress = (fraction: number) => (progress.value = fraction)
    const onWarning = (message: string) => warnings.push(message)

    const onDone = (blob: Blob) => {
      const link = origin ? createClipLink(origin, start, end) : null
      warning.value = warnings.join(' ')
      warnings.forEach((message) => deps.report(message, false))
      result.value = { blob, start, end, link }
      deps.state.value = 'done'
      deps.onExport(result.value)
    }

    const onFailed = (error: unknown) => {
      if (deps.state.value === 'closed') return
      backToEditing()
      if (signal.aborted) return deps.setStatus(labels.cancelled)
      deps.report(error instanceof Error ? error.message : String(error), true)
    }

    await createSplice({ ...options, onProgress, onWarning, signal })
      .then(onDone, onFailed)
      .finally(() => {
        if (job === controller) job = null
      })
  }

  function cancel(): void {
    job?.abort(new DOMException('The export was cancelled.', 'AbortError'))
  }

  /**
   * Stops a running export without going back to editing, for when the editor is closing.
   */
  function abort(): void {
    job?.abort(new DOMException('The editor was closed.', 'AbortError'))
    job = null
    result.value = null
  }

  function editAgain(): void {
    backToEditing()
    deps.setStatus('')
  }

  return { progress, result, warning, exportClip, cancel, abort, editAgain, play }
}
