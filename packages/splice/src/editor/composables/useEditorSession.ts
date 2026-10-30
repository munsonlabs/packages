import { nextTick, onMounted, watch, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { loadCore, planRange } from '../utils'
import { ERROR_NO_FILE, ERROR_NO_PLAYER } from '@/constants'
import type { useClipRange } from './useClipRange'
import type { useClipSettings } from './useClipSettings'
import type { useExport } from './useExport'
import type { EditorEmit } from './useElementHost'
import type { SpliceSource } from '@/types/splice'
import type { EditorLabels, EditorState } from '@/types/editor'
import type { EditorProps, Filmstrip } from '@/types/internal'

interface EditorSession {
  props: EditorProps
  state: Ref<EditorState>
  player: ComputedRef<PlayerHandle | null>
  source: ComputedRef<SpliceSource | null>
  size: Ref<{ width: number; height: number }>
  filmstrip: ShallowRef<Filmstrip | null>
  settings: ReturnType<typeof useClipSettings>
  clipRange: ReturnType<typeof useClipRange>
  job: ReturnType<typeof useExport>
  labels: ComputedRef<EditorLabels>
  setStatus: (text: string, isError?: boolean) => void
  report: (message: string, fatal: boolean) => void
  emit: EditorEmit
}

/**
 * Opens the editor on the moment the player is at and hands the player back when it closes. It
 * follows the open prop, so v-model:open and the open attribute work as well as show and close.
 */
export function useEditorSession(session: EditorSession) {
  const { props, state, player, source, size, filmstrip, settings, clipRange, job, labels, setStatus, report, emit } = session
  let opened: AbortController | null = null

  function show(): void {
    if (state.value !== 'closed') return
    state.value = 'loading'
    opened = new AbortController()
    emit('update:open', true)
    void prepare(opened.signal)
  }

  /**
   * Closes the editor and hands the player back. Cancels any export that's running, clears the clip
   * range and brings the HUD back.
   */
  function close(): void {
    if (state.value === 'closed') return
    state.value = 'closed'
    job.abort()
    opened?.abort(new DOMException('The editor was closed.', 'AbortError'))
    opened = null
    player.value?.setClipRange(null)
    player.value?.setControls(null)
    emit('update:open', false)
  }

  function block(message: string): void {
    state.value = 'blocked'
    report(message, true)
  }

  /**
   * Gets the editor ready on the moment the player is at. Checks the source can be spliced, works out
   * the range, then takes over the player as the preview and starts the filmstrip.
   */
  async function prepare(signal: AbortSignal): Promise<void> {
    setStatus(labels.value.preparing)
    job.result.value = null
    filmstrip.value = null
    /**
     * Props set in the same tick as opening only arrive on the next render.
     */
    await nextTick()
    if (signal.aborted) return

    const handle = player.value
    const clipSource = source.value
    if (!handle) return block(ERROR_NO_PLAYER)
    if (!clipSource) return block(ERROR_NO_FILE)

    handle.pause()
    const at = handle.currentTime
    settings.reset()

    const core = await loadCore()
    const check = await core.canSplice(clipSource, { crop: { aspect: settings.shape.value, height: props.height } })
    if (signal.aborted) return
    if (!check.ok) return block(check.message)

    const { duration, width, height } = check.info
    const { range, limits } = clipRange
    size.value = { width, height }
    clipRange.setPlan(planRange(at, duration, props))
    state.value = 'editing'
    setStatus('')

    handle.setControls(false)
    handle.setClipRange(range.value, { end: 'loop' })
    handle.seek(at)
    job.play()
    filmstrip.value = { source: clipSource, start: limits.value.min, end: limits.value.max }
  }

  watch(
    () => props.open,
    (open) => (open ? show() : close()),
  )
  onMounted(() => {
    if (props.open) show()
  })

  return { show, close }
}
