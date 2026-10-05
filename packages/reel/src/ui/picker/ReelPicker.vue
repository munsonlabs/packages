<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch, watchEffect } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { useResolvedPlayer, type PlayerHandle } from '@munsonlabs/video-player'
import { planCrop } from '@/clip/crop'
import type { CaptionStyle, ClipOrigin, ClipSource, EndCardOptions, PlaylistCache, WatermarkOptions } from '@/types'
import { useTrackCues } from '@/ui/picker/features/trackCues'
import { useExport, type ClipRequest, type Reporter } from '@/ui/picker/features/export'
import { useFrameClock } from '@/ui/picker/features/frameClock'
import { loadCore, type Core } from '@/ui/picker/features/core'
import { endCardFor, formatShareCaption, getPickerDefaults } from '@/registries/pickerDefaults'
import { initialRange, timelineWindow, type Range, type RangeLimits } from '@/ui/picker/features/range'
import type { CaptionPosition, PickerState, ReelCopyDetail, ReelErrorDetail, ReelExportDetail, ShareResult } from '@/ui/picker/types'
import ClipResult from '@/ui/picker/ClipResult.vue'
import CropOverlay from '@/ui/picker/CropOverlay.vue'
import ExportPanel from '@/ui/picker/ExportPanel.vue'
import RangeTimeline from '@/ui/picker/RangeTimeline.vue'
import Transport from '@/ui/picker/Transport.vue'
import '@/ui/picker/picker.css'

/**
 * The "clip this" editor, inline on the page's `@munsonlabs/video-player`. The player is the preview:
 * opening pauses it on the moment, loops the range with `setClipRange`, and draws the 9:16 crop window
 * over its picture; the range, toggles, export and finished clip sit in this panel, wherever the page
 * puts it, with the player's own play, mute and captions controls. The captions burned in are the
 * ones the viewer has on, at the position chosen in the panel. Reel's core is `import()`ed on first
 * open. Problems are shown in the panel and emitted as `error`, never thrown.
 */
const props = withDefaults(
  defineProps<{
    open?: boolean
    player?: PlayerHandle | null
    for?: string
    source?: ClipSource | null
    src?: string
    origin?: ClipOrigin
    endCard?: EndCardOptions | boolean
    watermark?: WatermarkOptions
  }>(),
  { open: false, player: null, for: undefined, source: null, src: undefined, origin: undefined, endCard: undefined, watermark: undefined },
)

type Events = {
  'update:open': [open: boolean]
  open: []
  close: []
  range: [range: Range]
  export: [detail: ReelExportDetail]
  cancel: []
  share: [detail: ReelExportDetail]
  download: [detail: ReelExportDetail]
  copy: [detail: ReelCopyDetail]
  error: [detail: ReelErrorDetail]
}

const vueEmit = defineEmits<Events>()

/**
 * As `<ml-reel-picker>`, the host element: events go out as bubbling `reel-*` CustomEvents with the
 * payload as `detail` (Vue's own would be named `error`, `cancel` and `close`, which clash with DOM
 * events), `open` is reflected as an attribute and `state` on `data-state`. `null` as a Vue component.
 */
// Not `useHost()`: it warns in development whenever the picker is used as a plain Vue component.
const host = (getCurrentInstance() as { ce?: HTMLElement } | null)?.ce ?? null
function emit<K extends keyof Events>(type: K, ...[detail]: Events[K]): void {
  if (!host) {
    ;(vueEmit as (type: K, detail: Events[K][0]) => void)(type, detail)
    return
  }
  if (type === 'update:open') {
    if (host.hasAttribute('open') !== detail) host.toggleAttribute('open', detail as boolean)
    return
  }
  host.dispatchEvent(new CustomEvent(`reel-${type}`, { detail, bubbles: true, composed: true }))
}

/**
 * How close to the selection's end a seek may land, so it never lands on the loop point itself.
 */
const END_GAP = 0.05

const titleId = useId()
const root = useTemplateRef<HTMLElement>('root')
const timeline = useTemplateRef<InstanceType<typeof RangeTimeline>>('timeline')
const clip = useTemplateRef<InstanceType<typeof ClipResult>>('clip')
const player = useResolvedPlayer(props)

const state = ref<PickerState>('closed')
if (host) watchEffect(() => (host.dataset.state = state.value))
/**
 * What is read: the `source` given, else the player's own file. A `blob:` source is MediaSource (an
 * HLS stream through hls.js) and cannot be read; the page passes the playlist URL then.
 */
const clipSource = computed<ClipSource | null>(() => {
  if (props.source) return props.source
  if (props.src) return props.src
  const current = player.value?.mediaElement?.currentSrc
  return current && !current.startsWith('blob:') ? current : null
})
/**
 * The player's shell, where the crop window is drawn over the picture.
 */
const shell = computed(() => {
  const media = player.value?.mediaElement
  return (media?.closest('[data-ml-video-player]')?.parentElement as HTMLElement | null) ?? null
})
const defaults = shallowRef(getPickerDefaults())
const labels = computed(() => defaults.value.labels)
const range = ref<Range>({ start: 0, end: 0 })
const limits = ref<RangeLimits>({ min: 0, max: 0, shortest: 1, longest: 60 })
const focus = ref({ x: 0.5, y: 0.5 })
const size = ref({ width: 16, height: 9 })
const exportSize = computed(() => {
  const plan = planCrop(size.value.width, size.value.height, { aspect: '9:16', height: defaults.value.height })
  return { width: plan.outputWidth, height: plan.outputHeight }
})
const status = ref<{ text: string; kind: 'info' | 'error' }>({ text: '', kind: 'info' })
const notes = ref<Array<{ key: string; text: string }>>([])
const filmstrip = ref<'ready' | 'unavailable'>()
const withCard = ref(true)
const withLogo = ref(false)
const captionPosition = ref<CaptionPosition>('bottom')
/**
 * One per opening. Closing aborts it, which stops what the opening still has in flight (the core's
 * checks, the filmstrip, caption loads) and tells each step after an `await` not to carry on.
 */
let session: AbortController | null = null
let playlists: PlaylistCache | null = null

const editing = computed(() => state.value === 'editing')
const overlaying = computed(() => (state.value === 'editing' || state.value === 'exporting') && shell.value !== null)
const hasCaptions = computed(() => (player.value?.activeCaptionIndex ?? null) !== null)
/**
 * The defaults' caption style at the position chosen in the panel: what the crop window draws and the
 * export burns in.
 */
const captionStyle = computed<CaptionStyle>(() => ({ ...defaults.value.captionStyle, position: captionPosition.value }))
/**
 * While the window is over the picture, the browser's own rendering of the player's captions is
 * hidden (`.reel-previewing` on the shell), so the only captions on show are the clip's, inside the
 * window. The track stays `showing`: the player still reports it and its cues still flow.
 */
const PREVIEWING = 'reel-previewing'
let previewed: HTMLElement | null = null
watchEffect(() => {
  const next = overlaying.value ? shell.value : null
  if (previewed === next) return
  previewed?.classList.remove(PREVIEWING)
  next?.classList.add(PREVIEWING)
  previewed = next
})
onBeforeUnmount(() => previewed?.classList.remove(PREVIEWING))
const stamp = computed(() => {
  const { logo, stamp: placement } = defaults.value
  return withLogo.value && logo ? (typeof placement === 'object' ? placement : {}) : null
})
const { time: previewTime } = useFrameClock(
  () => player.value,
  () => editing.value,
)
const playhead = computed(() => (editing.value ? previewTime.value : null))

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

const report: Reporter = {
  status: (text) => (status.value = { text, kind: 'info' }),
  fail: (reason, text, shown = text) => {
    status.value = { text: shown, kind: 'error' }
    emit('error', { reason, message: text, fatal: true })
  },
  warn: (reason, text) => emit('error', { reason, message: text, fatal: false }),
  clear: (key) => note(key, null),
}

function note(key: string, text: string | null, error?: { reason: string; message: string }): void {
  notes.value = notes.value.filter((item) => item.key !== key)
  if (text === null) return
  notes.value.push({ key, text })
  if (error) report.warn(error.reason, error.message)
}

const captions = useTrackCues({
  player: () => player.value,
  source: () => clipSource.value,
  window: () => limits.value,
  playlists: () => playlists,
  signal: () => session?.signal ?? null,
  active: () => state.value === 'editing' || state.value === 'exporting',
  report: (error) =>
    error === null
      ? note('captions', null)
      : note('captions', labels.value.captionsUnavailable, { reason: 'captions-unavailable', message: message(error) }),
})
const previewCues = captions.previewCues

/**
 * What an export would clip now: the range, the crop, the toggles and the defaults as they stand.
 */
function request(): ClipRequest | null {
  const source = clipSource.value
  if (!source) return null
  const shared = defaults.value
  return {
    source,
    ...range.value,
    crop: { aspect: '9:16', focus: { ...focus.value }, height: shared.height },
    captionStyle: captionStyle.value,
    endCard: withCard.value ? endCardFor(props.endCard, shared) : undefined,
    stamp: stamp.value && shared.logo ? { ...stamp.value, logo: shared.logo } : undefined,
    watermark: props.watermark ?? shared.watermark,
    origin: props.origin,
    cache: playlists ?? undefined,
    stallTimeout: shared.stallTimeout,
  }
}

const job = useExport({
  state,
  player: () => player.value,
  defaults: () => defaults.value,
  request,
  burnInCues: captions.burnInCues,
  report,
  onExport: (detail) => emit('export', detail),
  onCancel: () => emit('cancel'),
})
const { progress, result, filename, warning, stalled } = job

function editAgain(): void {
  job.editAgain()
  void nextTick(() => root.value?.querySelector<HTMLElement>('.reel-handle')?.focus())
}

function show(): void {
  if (state.value !== 'closed') return
  defaults.value = getPickerDefaults()
  state.value = 'loading'
  session = new AbortController()
  const { signal } = session
  emit('update:open', true)
  emit('open')
  void prepare(signal)
}

/**
 * Closes the editor, cancelling an export or a filmstrip in progress, and gives the player back: the
 * clip range comes off, its HUD returns, the viewer's position stays where the editor left it.
 */
function close(): void {
  if (state.value === 'closed') return
  state.value = 'closed'
  job.abort()
  session?.abort(new DOMException('The picker was closed.', 'AbortError'))
  session = null
  playlists?.clear()
  playlists = null
  player.value?.setClipRange(null)
  player.value?.setControls(null)
  emit('update:open', false)
  emit('close')
}

async function prepare(signal: AbortSignal): Promise<void> {
  const shared = defaults.value
  report.status(shared.labels.preparing)
  result.value = null
  focus.value = { x: 0.5, y: 0.5 }
  notes.value = []
  filmstrip.value = undefined
  captions.reset()
  // Props set in the same tick as the opening (an element's properties, then `show()`) reach this
  // component on the next render.
  await nextTick()
  if (signal.aborted) return

  const handle = player.value
  const source = clipSource.value
  if (!handle) {
    state.value = 'blocked'
    report.fail('no-player', 'There is no player to clip: give the picker its `player` (or `for`) first.')
    return
  }
  if (!source) {
    state.value = 'blocked'
    report.fail('no-source', 'There is no file to clip: the player plays a MediaSource, so pass the stream’s URL as `source`.')
    return
  }
  handle.pause()
  const at = handle.currentTime
  withCard.value = props.endCard !== false
  withLogo.value = Boolean(shared.logo) && shared.stamp !== false
  captionPosition.value = shared.captionStyle.position ?? 'bottom'

  const core = await loadCore()
  if (signal.aborted) return
  playlists?.clear()
  playlists = core.createPlaylistCache()
  const check = await core.canClip(source, { crop: { aspect: '9:16' }, cache: playlists })
  if (signal.aborted) return
  if (!check.ok) {
    state.value = 'blocked'
    report.fail(check.reason, check.message)
    return
  }

  const duration = check.info.duration
  size.value = { width: check.info.width, height: check.info.height }
  range.value = initialRange(at, duration, Math.min(shared.length, shared.longest))
  const view = timelineWindow(range.value, duration, shared.span)
  limits.value = { ...view, shortest: Math.min(shared.shortest, duration), longest: shared.longest }
  state.value = 'editing'
  report.status('')
  // The panel has the player's controls while the window is over its picture; the HUD would sit under it.
  handle.setControls(false)
  handle.setClipRange(range.value, { end: 'loop' })
  handle.seek(range.value.start)
  job.play()
  await nextTick()
  await loadFilmstrip(core, source, view, signal)
}

async function loadFilmstrip(core: Core, source: ClipSource, view: { min: number; max: number }, signal: AbortSignal): Promise<void> {
  const strip = timeline.value
  if (!strip) return
  const slots = strip.tiles()
  try {
    await core.createStoryboard({
      source,
      start: view.min,
      end: view.max,
      interval: (view.max - view.min) / strip.TILES,
      tileWidth: 96,
      columns: strip.TILES,
      signal,
      cache: playlists ?? undefined,
      onTile: (index, image) => {
        if (!signal.aborted) slots.draw(index, image)
      },
    })
    if (!signal.aborted) filmstrip.value = 'ready'
  } catch (error) {
    if (signal.aborted) return
    filmstrip.value = 'unavailable'
    note('thumbnails', labels.value.thumbnailsUnavailable, {
      reason: 'thumbnails-unavailable',
      message: `The filmstrip's thumbnails could not be made. (${message(error)})`,
    })
  }
}

function setRange(next: Range, seekTo: number): void {
  range.value = next
  emit('range', { ...next })
  if (!editing.value) return
  player.value?.setClipRange(next, { end: 'loop' })
  player.value?.seek(seekTo)
}

function seekPreview(time: number): void {
  const { start, end } = range.value
  player.value?.seek(Math.min(Math.max(start, time), Math.max(start, end - END_GAP)))
}

/**
 * From the `shareCaption` default as it is now, not as the picker opened; `null` before an export.
 */
function shareCaption(): string | null {
  const done = result.value
  if (!done) return null
  return formatShareCaption(getPickerDefaults().shareCaption, {
    title: props.origin?.title ?? '',
    url: done.link ?? '',
    publisher: props.origin?.publisher ?? '',
    start: done.start,
    end: done.end,
  })
}

watch(
  () => props.open,
  (open) => (open ? show() : close()),
)
onMounted(() => {
  if (props.open) show()
})

defineExpose({
  show,
  close,
  export: job.exportClip,
  cancel: job.cancel,
  share: (): Promise<ShareResult> => clip.value?.share() ?? Promise.resolve('dismissed'),
  download: (): void => clip.value?.download(),
  copyCaption: (): Promise<ReelCopyDetail['result'] | null> => clip.value?.copyCaption() ?? Promise.resolve(null),
  state: computed(() => state.value),
  range: computed(() => ({ ...range.value })),
  cropFocus: computed(() => ({ ...focus.value })),
  captionPosition: computed(() => captionPosition.value),
  shareCaption: computed(shareCaption),
})
</script>

<template>
  <section v-if="state !== 'closed'" ref="root" class="reel-picker" :data-state="state" :aria-labelledby="titleId">
    <Teleport v-if="overlaying" :to="shell!">
      <CropOverlay
        v-model:focus="focus"
        :size="size"
        :export-size="exportSize"
        :disabled="!editing"
        :label="labels.crop"
        :hint="labels.cropHint"
        :logo="defaults.logo"
        :stamp="stamp"
        :cues="previewCues"
        :time="previewTime"
        :caption-style="captionStyle"
      />
    </Teleport>

    <header class="reel-header">
      <h2 :id="titleId" class="reel-title">{{ labels.title }}</h2>
      <button type="button" class="reel-button reel-close" :aria-label="labels.close" @click="close">
        <Sigil name="close" library="mlv" class="reel-icon" />
      </button>
    </header>

    <div v-if="state !== 'done'" class="reel-body">
      <RangeTimeline
        ref="timeline"
        :range="range"
        :limits="limits"
        :time="playhead"
        :aspect="size.width / size.height"
        :disabled="!editing"
        :filmstrip="filmstrip"
        :labels="{ start: labels.start, end: labels.end }"
        @change="setRange"
        @seek="seekPreview"
      />
      <Transport :player="player" :range="range" :disabled="!editing" :labels="labels" />
      <ExportPanel
        v-model:with-card="withCard"
        v-model:with-logo="withLogo"
        v-model:caption-position="captionPosition"
        :state="state"
        :progress="progress"
        :has-logo="Boolean(defaults.logo)"
        :has-captions="hasCaptions"
        :labels="labels"
        :retry="stalled"
        @export="job.exportClip"
        @cancel="job.cancel"
      />
      <p class="reel-status reel-editor-status" role="status" aria-live="polite" :data-kind="status.kind">{{ status.text }}</p>
      <div class="reel-notes" role="status" aria-live="polite">
        <p v-for="item in notes" :key="item.key" class="reel-note" :data-note="item.key">{{ item.text }}</p>
      </div>
    </div>

    <ClipResult
      v-if="state === 'done' && result"
      ref="clip"
      class="reel-body"
      :result="result"
      :filename="filename"
      :get-caption="() => shareCaption() ?? ''"
      :title="origin?.title"
      :warning="warning"
      :labels="labels"
      @share="emit('share', $event)"
      @download="emit('download', $event)"
      @copy="emit('copy', $event)"
      @again="editAgain"
    />
  </section>
</template>
