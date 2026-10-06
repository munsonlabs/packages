<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import { Sigil } from '@munsonlabs/sigil/vue'
import { useResolvedPlayer, type PlayerHandle } from '@munsonlabs/video-player'
import { loadCore, type Core } from './features/loadCore'
import { useElementHost, type EditorEvents } from './features/useElementHost'
import { useExport } from './features/useExport'
import { useFrameClock } from './features/useFrameClock'
import { usePreviewing } from './features/usePreviewing'
import { useShownCues } from './features/useShownCues'
import { registerIcons } from './icons'
import { formatShareCaption } from './features/caption'
import { planRange, type Range, type RangeLimits } from './features/range'
import { CLIP_LENGTH, DEFAULT_LABELS, END_GAP, LONGEST_CLIP, SHARE_CAPTION, SHORTEST_CLIP, TIMELINE_SPAN } from './labels'
import { ERROR_FILMSTRIP, ERROR_NO_FILE, ERROR_NO_PLAYER } from '@/constants'
import ClipResult from './ClipResult.vue'
import CropOverlay from './CropOverlay.vue'
import ExportPanel from './ExportPanel.vue'
import RangeTimeline from './RangeTimeline.vue'
import Transport from './Transport.vue'
import type {
  CaptionPosition,
  CaptionStyle,
  EndCardOptions,
  SpliceOptions,
  SpliceOrigin,
  SpliceSource,
  StampOptions,
  WatermarkOptions,
} from '@/types/splice'
import type { EditorLabels, EditorState, ShareCaption } from '@/types/editor'
import './editor.css'

/**
 * The clip editor. It sits inline on the page's video player and uses it as the preview: opening
 * pauses it, loops the range with setClipRange and draws the 9:16 crop window over the picture. The
 * range, toggles, export and finished clip live in this panel. It burns in whichever captions the
 * viewer has on and only loads splice's core when it first opens. Errors show in the panel and go
 * out as an error event, it never throws.
 */
const props = withDefaults(
  defineProps<{
    open?: boolean
    player?: PlayerHandle | null
    for?: string
    source?: SpliceSource | null
    src?: string
    origin?: SpliceOrigin
    endCard?: EndCardOptions | false
    stamp?: StampOptions
    watermark?: WatermarkOptions
    captionPosition?: CaptionPosition
    captionStyle?: CaptionStyle
    clipLength?: number
    shortestClip?: number
    longestClip?: number
    timelineSpan?: number
    height?: number
    shareCaption?: ShareCaption
    labels?: Partial<EditorLabels>
  }>(),
  {
    /**
     * endCard can be false, which makes Vue treat it as a Boolean prop and turn a missing value
     * into false. This keeps it undefined.
     */
    endCard: undefined,
    captionPosition: 'bottom',
    clipLength: CLIP_LENGTH,
    shortestClip: SHORTEST_CLIP,
    longestClip: LONGEST_CLIP,
    timelineSpan: TIMELINE_SPAN,
    shareCaption: SHARE_CAPTION,
  },
)

const vueEmit = defineEmits<EditorEvents>()

registerIcons()

const titleId = useId()
const root = useTemplateRef<HTMLElement>('root')
const timeline = useTemplateRef<InstanceType<typeof RangeTimeline>>('timeline')
const player = useResolvedPlayer(props)

const state = ref<EditorState>('closed')
const range = ref<Range>({ start: 0, end: 0 })
const limits = ref<RangeLimits>({ min: 0, max: 0, shortest: props.shortestClip, longest: props.longestClip })
const focus = ref({ x: 0.5, y: 0.5 })
const size = ref({ width: 16, height: 9 })
const status = ref({ text: '', isError: false })
const withCard = ref(true)
const withLogo = ref(true)
const captionPosition = ref<CaptionPosition>('bottom')
let session: AbortController | null = null

const emit = useElementHost(vueEmit, state)
const labels = computed<EditorLabels>(() => ({ ...DEFAULT_LABELS, ...props.labels }))
const isEditing = computed(() => state.value === 'editing')
const stamp = computed(() => (withLogo.value ? props.stamp : null))

const clipSource = computed<SpliceSource | null>(() => {
  const current = player.value?.mediaElement?.currentSrc
  return props.source || props.src || (current && !current.startsWith('blob:') ? current : null)
})

const shell = computed(() => {
  const media = player.value?.mediaElement
  return (media?.closest('[data-ml-video-player]')?.parentElement as HTMLElement | null) ?? null
})
const isOverlaying = computed(() => (state.value === 'editing' || state.value === 'exporting') && shell.value !== null)

const time = useFrameClock(
  () => player.value,
  () => isEditing.value,
)
const playhead = computed(() => (isEditing.value ? time.value : null))
const cues = useShownCues(
  () => player.value,
  () => isOverlaying.value,
)
usePreviewing(() => (isOverlaying.value ? shell.value : null))

const setStatus = (text: string, isError = false) => (status.value = { text, isError })

const job = useExport({
  state,
  player: () => player.value,
  labels: () => labels.value,
  request,
  onStatus: setStatus,
  onError: (message, fatal) => emit('error', { message, fatal }),
  onExport: (detail) => emit('export', detail),
})
const { progress, result, warning } = job

const caption = computed(() => {
  const { title = '', publisher = '' } = props.origin ?? {}
  const { start = 0, end = 0, link } = result.value ?? {}
  return formatShareCaption(props.shareCaption, { title, publisher, url: link ?? '', start, end })
})

/**
 * Builds the options for an export from what's set right now: the range, the crop, the captions
 * showing and the toggles.
 */
function request(): SpliceOptions | null {
  const source = clipSource.value
  if (!source) return null

  return {
    source,
    ...range.value,
    crop: { aspect: '9:16', focus: { ...focus.value }, height: props.height },
    captions: cues.value.length ? cues.value : undefined,
    captionPosition: captionPosition.value,
    captionStyle: props.captionStyle,
    endCard: withCard.value && props.endCard !== false ? (props.endCard ?? {}) : undefined,
    stamp: stamp.value ?? undefined,
    watermark: props.watermark,
    origin: props.origin,
  }
}

function show(): void {
  if (state.value !== 'closed') return
  state.value = 'loading'
  session = new AbortController()
  emit('update:open', true)
  void prepare(session.signal)
}

/**
 * Closes the editor and hands the player back. Cancels any export or filmstrip that's running,
 * clears the clip range and brings the HUD back.
 */
function close(): void {
  if (state.value === 'closed') return
  state.value = 'closed'
  job.abort()
  session?.abort(new DOMException('The editor was closed.', 'AbortError'))
  session = null
  player.value?.setClipRange(null)
  player.value?.setControls(null)
  emit('update:open', false)
}

function block(message: string): void {
  state.value = 'blocked'
  setStatus(message, true)
  emit('error', { message, fatal: true })
}

/**
 * Gets the editor ready on the moment the player is at. Checks the source can be spliced, works out
 * the range, then takes over the player as the preview and loads the filmstrip.
 */
async function prepare(signal: AbortSignal): Promise<void> {
  setStatus(labels.value.preparing)
  result.value = null
  focus.value = { x: 0.5, y: 0.5 }
  /**
   * Props set in the same tick as opening only arrive on the next render.
   */
  await nextTick()
  if (signal.aborted) return

  const handle = player.value
  const source = clipSource.value
  if (!handle) return block(ERROR_NO_PLAYER)
  if (!source) return block(ERROR_NO_FILE)

  handle.pause()
  const at = handle.currentTime
  withCard.value = props.endCard !== false
  withLogo.value = Boolean(props.stamp)
  captionPosition.value = props.captionPosition

  const core = await loadCore()
  const check = await core.canSplice(source, { crop: { aspect: '9:16', height: props.height } })
  if (signal.aborted) return
  if (!check.ok) return block(check.message)

  const { duration, width, height } = check.info
  const plan = planRange(at, duration, props)
  size.value = { width, height }
  range.value = plan.range
  limits.value = plan.limits
  state.value = 'editing'
  setStatus('')

  handle.setControls(false)
  handle.setClipRange(range.value, { end: 'loop' })
  handle.seek(at)
  job.play()
  await nextTick()
  await loadFilmstrip(core, source, signal)
}

/**
 * Fills the timeline's filmstrip, drawing each thumbnail as it arrives. If it fails the strip stays
 * blank and we report a non-fatal error.
 */
async function loadFilmstrip(core: Core, source: SpliceSource, signal: AbortSignal): Promise<void> {
  const strip = timeline.value
  if (!strip) return
  const slots = strip.createFilmstrip()
  const { min: start, max: end } = limits.value
  const onThumbnail = (index: number, image: CanvasImageSource) => {
    if (!signal.aborted) slots.draw(index, image)
  }

  await core.createThumbnails({ source, start, end, count: strip.THUMBNAILS, width: 96, signal, onThumbnail }).catch((error) => {
    if (signal.aborted) return
    const message = error instanceof Error ? error.message : String(error)
    emit('error', { message: ERROR_FILMSTRIP(message), fatal: false })
  })
}

function setRange(next: Range, seekTo: number): void {
  range.value = next
  if (!isEditing.value) return
  player.value?.setClipRange(next, { end: 'loop' })
  player.value?.seek(seekTo)
}

function seekPreview(at: number): void {
  const { start, end } = range.value
  player.value?.seek(Math.min(Math.max(start, at), Math.max(start, end - END_GAP)))
}

function editAgain(): void {
  job.editAgain()
  void nextTick(() => root.value?.querySelector<HTMLElement>('.splice-handle')?.focus())
}

watch(
  () => props.open,
  (open) => (open ? show() : close()),
)
onMounted(() => {
  if (props.open) show()
})

defineExpose({ show, close, export: job.exportClip, cancel: job.cancel, state: computed(() => state.value) })
</script>

<template>
  <section v-if="state !== 'closed'" ref="root" class="splice-editor" :data-state="state" :aria-labelledby="titleId">
    <Teleport v-if="isOverlaying" :to="shell!">
      <CropOverlay
        v-model:focus="focus"
        :size="size"
        :disabled="!isEditing"
        :label="labels.crop"
        :hint="labels.cropHint"
        :cues="cues"
        :caption-position="captionPosition"
        :caption-style="captionStyle"
        :time="time"
        :stamp="stamp"
        :watermark="watermark"
      />
    </Teleport>

    <header class="splice-header">
      <h2 :id="titleId" class="splice-title">{{ labels.title }}</h2>
      <button type="button" class="splice-button splice-close" :aria-label="labels.close" @click="close">
        <Sigil name="close" library="mlv" class="splice-icon" />
      </button>
    </header>

    <div v-show="state !== 'done'" class="splice-body">
      <RangeTimeline
        ref="timeline"
        :range="range"
        :limits="limits"
        :time="playhead"
        :aspect="size.width / size.height"
        :disabled="!isEditing"
        :labels="{ start: labels.start, end: labels.end }"
        @change="setRange"
        @seek="seekPreview"
      />
      <div class="splice-toolbar">
        <Transport :player="player" :range="range" :disabled="!isEditing" :labels="labels" />
        <ExportPanel
          v-model:with-card="withCard"
          v-model:with-logo="withLogo"
          v-model:caption-position="captionPosition"
          :state="state"
          :progress="progress"
          :has-card="endCard !== false"
          :has-logo="Boolean(props.stamp)"
          :has-captions="cues.length > 0"
          :labels="labels"
          @export="job.exportClip"
          @cancel="job.cancel"
        />
      </div>
      <p class="splice-status splice-editor-status" role="status" aria-live="polite" :data-kind="status.isError ? 'error' : 'info'">
        {{ status.text }}
      </p>
    </div>

    <ClipResult
      v-if="state === 'done' && result"
      class="splice-body"
      :result="result"
      :title="origin?.title"
      :caption="caption"
      :warning="warning"
      :labels="labels"
      @again="editAgain"
    />
  </section>
</template>
