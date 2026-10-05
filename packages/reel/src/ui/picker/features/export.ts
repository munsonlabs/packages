import { nextTick, ref, shallowRef, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { clipLink } from '@/clip/origin'
import { endCardFor, type PickerDefaults, type PickerStamp } from '@/registries/pickerDefaults'
import type { CaptionStyle, ClipOrigin, ClipSource, ClipWarning, EndCardOptions, PlaylistCache, WatermarkOptions } from '@/types'
import { loadCore, type Core } from '@/ui/picker/features/core'
import type { Range } from '@/ui/picker/features/range'
import type { PickerState, ReelExportDetail } from '@/ui/picker/types'

export interface ExportDeps {
  state: Ref<PickerState>
  player: () => PlayerHandle | null
  source: () => ClipSource | null
  defaults: () => PickerDefaults
  range: () => Range
  focus: () => { x: number; y: number }
  captionStyle: () => CaptionStyle
  stamp: () => PickerStamp | null
  withCard: () => boolean
  props: () => { endCard?: EndCardOptions | boolean; watermark?: WatermarkOptions; origin?: ClipOrigin }
  playlists: () => PlaylistCache | null
  burnInCues: (core: Core, signal: AbortSignal) => Promise<import('@/types').CaptionCue[] | null>
  root: () => HTMLElement | null
  setStatus: (text: string) => void
  clearCaptionsNote: () => void
  /** A fatal error: `reel-error` with `message`; the status line shows `shown`, else the message. */
  fail: (reason: string, message: string, shown?: string) => void
  emit: (type: 'export', detail: ReelExportDetail) => void
  emitCancel: () => void
  emitWarning: (reason: string, message: string) => void
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

  function showResult(detail: ReelExportDetail, warnings: ClipWarning[], captionsFailed: boolean): void {
    const defaults = deps.defaults()
    const reasons = Object.keys(LEFT_OUT) as Array<keyof typeof LEFT_OUT>
    const of = (reason: ClipWarning['reason']) => warnings.filter((item) => item.reason === reason)
    warning.value = reasons
      .filter((reason) => of(reason).length > 0 || (reason === 'captions-unavailable' && captionsFailed))
      .map((reason) => defaults.labels[LEFT_OUT[reason]])
      .join(' ')
    filename.value = `${defaults.filename(deps.props().origin?.title, detail.start, detail.end)}.mp4`
    result.value = detail
    deps.state.value = 'done'
    deps.emit('export', detail)
    for (const reason of reasons) {
      const items = of(reason)
      if (items.length) deps.emitWarning(reason, items.map((item) => item.message).join(' '))
    }
  }

  async function exportClip(): Promise<void> {
    const source = deps.source()
    if (deps.state.value !== 'editing' || !source) return
    const shared = deps.defaults()
    const { endCard, watermark, origin } = deps.props()
    const own = new AbortController()
    job = own
    // The preview rests while the encoder works and picks up afterwards if it was playing.
    resumePlaying = deps.player()?.isPlaying ?? false
    deps.player()?.pause()
    deps.state.value = 'exporting'
    deps.setStatus(shared.labels.exporting)
    progress.value = 0
    stalled.value = false
    deps.clearCaptionsNote()
    const { start, end } = deps.range()
    const stamp = deps.stamp()
    const warnings: ClipWarning[] = []
    try {
      const core = await loadCore()
      const cues = await deps.burnInCues(core, own.signal)
      const blob = await core.createClip({
        source,
        start,
        end,
        crop: { aspect: '9:16', focus: { ...deps.focus() }, height: shared.height },
        // The style the crop window draws with: the defaults', at the position chosen in the panel.
        captions: cues?.length ? { cues, style: deps.captionStyle() } : undefined,
        endCard: deps.withCard() ? endCardFor(endCard, shared) : undefined,
        stamp: stamp && shared.logo ? { ...stamp, logo: shared.logo } : undefined,
        watermark: watermark ?? shared.watermark,
        origin,
        cache: deps.playlists() ?? undefined,
        stallTimeout: shared.stallTimeout,
        onProgress: (fraction) => (progress.value = fraction),
        onWarning: (item) => warnings.push(item),
        signal: own.signal,
      })
      // A cancel that came too late to stop the clip is still a cancel: back to editing, not stuck here.
      if (own.signal.aborted) throw own.signal.reason
      if (deps.state.value !== 'exporting') return
      showResult({ blob, start, end, link: origin ? clipLink(origin, start, end) : null }, warnings, cues === null)
    } catch (error) {
      // Closing the picker aborts the export too, and leaves nothing to go back to.
      if ((deps.state.value as PickerState) === 'closed') return
      backToEditing()
      if (own.signal.aborted) {
        deps.setStatus(shared.labels.cancelled)
        deps.emitCancel()
        return
      }
      const reason = (error as { reason?: string }).reason ?? 'export-failed'
      const message = error instanceof Error ? error.message : String(error)
      // The encoder gave up mid-export; the same export usually works the second time.
      stalled.value = reason === 'encoder-stalled'
      deps.fail(reason, message, stalled.value ? shared.labels.exportStalled : undefined)
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
    deps.setStatus('')
    void nextTick(() => deps.root()?.querySelector<HTMLElement>('.reel-handle')?.focus())
  }

  return { progress, result, filename, warning, stalled, exportClip, cancel, abort, editAgain, play }
}
