import { ref, shallowRef, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { clipLink } from '@/clip/origin'
import type { PickerDefaults } from '@/registries/pickerDefaults'
import type { CaptionCue, CaptionStyle, ClipOptions, ClipSource, ClipWarning } from '@/types'
import { loadCore, type Core } from '@/ui/picker/features/core'
import type { PickerState, ReelExportDetail } from '@/ui/picker/types'

/**
 * What the picker would clip right now: `createClip`'s options without the captions and callbacks,
 * which the job adds, and the caption style the crop window draws with.
 */
export type ClipRequest = Omit<ClipOptions, 'source' | 'start' | 'end' | 'captions' | 'onProgress' | 'onWarning' | 'signal'> & {
  source: ClipSource
  start: number
  end: number
  captionStyle: CaptionStyle
}

/**
 * How the picker shows and reports what happens: the status line, a fatal `error` (the status line
 * shows `shown`, else the message), a non-fatal one, and clearing a note.
 */
export interface Reporter {
  status: (text: string) => void
  fail: (reason: string, message: string, shown?: string) => void
  warn: (reason: string, message: string) => void
  clear: (note: string) => void
}

export interface ExportDeps {
  state: Ref<PickerState>
  player: () => PlayerHandle | null
  defaults: () => PickerDefaults
  request: () => ClipRequest | null
  burnInCues: (core: Core, signal: AbortSignal) => Promise<CaptionCue[] | null>
  report: Reporter
  onExport: (detail: ReelExportDetail) => void
  onCancel: () => void
}

/**
 * The note on the finished clip for each thing `createClip` can leave out.
 */
const LEFT_OUT = { 'logo-unavailable': 'logoUnavailable', 'captions-unavailable': 'captionsLeftOut', 'audio-unavailable': 'audioLeftOut' } as const

/**
 * The export job: runs `createClip` for the range with the crop, captions and toggles, with the
 * preview paused meanwhile; shows the result or goes back to editing on cancel, failure or a cancel
 * that landed after the clip was made. Closing the picker aborts it too.
 */
export function useExport(deps: ExportDeps) {
  const progress = ref(0)
  const result = shallowRef<ReelExportDetail | null>(null)
  const filename = ref('')
  const warning = ref('')
  /** The last export stalled: the export button offers to try again. */
  const stalled = ref(false)
  let job: AbortController | null = null
  let resumePlaying = false

  function play(): void {
    void deps
      .player()
      ?.play()
      .catch(() => {})
  }

  function backToEditing(): void {
    deps.state.value = 'editing'
    if (resumePlaying) play()
  }

  function showResult(detail: ReelExportDetail, title: string | undefined, warnings: ClipWarning[], captionsFailed: boolean): void {
    const defaults = deps.defaults()
    const reasons = Object.keys(LEFT_OUT) as Array<keyof typeof LEFT_OUT>
    const of = (reason: ClipWarning['reason']) => warnings.filter((item) => item.reason === reason)
    warning.value = reasons
      .filter((reason) => of(reason).length > 0 || (reason === 'captions-unavailable' && captionsFailed))
      .map((reason) => defaults.labels[LEFT_OUT[reason]])
      .join(' ')
    filename.value = `${defaults.filename(title, detail.start, detail.end)}.mp4`
    result.value = detail
    deps.state.value = 'done'
    deps.onExport(detail)
    for (const reason of reasons) {
      const items = of(reason)
      if (items.length) deps.report.warn(reason, items.map((item) => item.message).join(' '))
    }
  }

  async function exportClip(): Promise<void> {
    const request = deps.request()
    if (deps.state.value !== 'editing' || !request) return
    const { captionStyle, ...options } = request
    const { start, end, origin } = options
    const labels = deps.defaults().labels
    const own = new AbortController()
    job = own
    // The preview rests while the encoder works and picks up afterwards if it was playing.
    resumePlaying = deps.player()?.isPlaying ?? false
    deps.player()?.pause()
    deps.state.value = 'exporting'
    deps.report.status(labels.exporting)
    progress.value = 0
    stalled.value = false
    deps.report.clear('captions')
    const warnings: ClipWarning[] = []
    try {
      const core = await loadCore()
      const cues = await deps.burnInCues(core, own.signal)
      const blob = await core.createClip({
        ...options,
        captions: cues?.length ? { cues, style: captionStyle } : undefined,
        onProgress: (fraction) => (progress.value = fraction),
        onWarning: (item) => warnings.push(item),
        signal: own.signal,
      })
      // A cancel that came too late to stop the clip is still a cancel: back to editing, not stuck here.
      if (own.signal.aborted) throw own.signal.reason
      if (deps.state.value !== 'exporting') return
      showResult({ blob, start, end, link: origin ? clipLink(origin, start, end) : null }, origin?.title, warnings, cues === null)
    } catch (error) {
      // Closing the picker aborts the export too, and leaves nothing to go back to.
      if ((deps.state.value as PickerState) === 'closed') return
      backToEditing()
      if (own.signal.aborted) {
        deps.report.status(labels.cancelled)
        deps.onCancel()
        return
      }
      const reason = (error as { reason?: string }).reason ?? 'export-failed'
      const message = error instanceof Error ? error.message : String(error)
      // The encoder gave up mid-export; the same export usually works the second time.
      stalled.value = reason === 'encoder-stalled'
      deps.report.fail(reason, message, stalled.value ? labels.exportStalled : undefined)
    } finally {
      if (job === own) job = null
    }
  }

  function cancel(): void {
    job?.abort(new DOMException('The export was cancelled.', 'AbortError'))
  }

  /**
   * Aborts a running export without going back to editing: the picker is closing.
   */
  function abort(): void {
    job?.abort(new DOMException('The picker was closed.', 'AbortError'))
    job = null
    result.value = null
    stalled.value = false
  }

  function editAgain(): void {
    backToEditing()
    deps.report.status('')
  }

  return { progress, result, filename, warning, stalled, exportClip, cancel, abort, editAgain, play }
}
