<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId, useTemplateRef } from 'vue'
import { useResolvedPlayer } from '@munsonlabs/video-player'
import { ClipResult, CropOverlay, EditorHeader, EditorToolbar, ExportPanel, RangeTimeline, Transport } from './components'
import {
  provideLabels,
  useClipRange,
  useClipSettings,
  useEditorSession,
  useElementHost,
  useExport,
  useFrameClock,
  usePlayerShell,
  useShownCues,
  useStatus,
  type EditorEvents,
} from './composables'
import { DEFAULT_LABELS, EDITOR_PROPS, buildRequest, registerIcons } from './utils'
import { ERROR_FILMSTRIP } from '@/constants'
import type { SpliceOptions } from '@/types/splice'
import type { EditorLabels, EditorState, SpliceEditorProps } from '@/types/editor'
import type { EditorPreview, Filmstrip } from '@/types/internal'
import './styles/editor.css'

/**
 * The clip editor. It sits inline on the page's video player and uses it as the preview: opening
 * pauses it, loops the range with setClipRange and draws the crop window over the picture. The
 * range, toggles, export and finished clip live in this panel. It burns in whichever captions the
 * viewer has on and only loads splice's core when it first opens. Errors show in the panel and go
 * out as an error event, it never throws.
 */
const props = withDefaults(defineProps<SpliceEditorProps>(), EDITOR_PROPS)
const vueEmit = defineEmits<EditorEvents>()

registerIcons()

const titleId = useId()
const root = useTemplateRef<HTMLElement>('root')
const player = useResolvedPlayer(props)
const state = ref<EditorState>('closed')
const size = ref({ width: 16, height: 9 })
const filmstrip = shallowRef<Filmstrip | null>(null)

const emit = useElementHost(vueEmit, state)
const labels = computed<EditorLabels>(() => ({ ...DEFAULT_LABELS, ...props.labels }))
const isEditing = computed(() => state.value === 'editing')

provideLabels(labels)

const { status, setStatus, report } = useStatus(emit)
const { source, shell, isOverlaying } = usePlayerShell(player, props, state)
const settings = useClipSettings(props)
const { withCard, withLogo, captionPosition, shape, focus, stamp } = settings
const clipRange = useClipRange(player, isEditing)
const { range, limits, setRange, seekPreview } = clipRange

const time = useFrameClock(
  () => player.value,
  () => isEditing.value,
)
const playhead = computed(() => (isEditing.value ? time.value : null))
const cues = useShownCues(
  () => player.value,
  () => isOverlaying.value,
)

const preview = computed<EditorPreview>(() => ({
  cues: cues.value,
  captionPosition: captionPosition.value,
  captionStyle: props.captionStyle,
  stamp: stamp.value,
  watermark: props.watermark,
}))

const job = useExport({
  state,
  player: () => player.value,
  labels: () => labels.value,
  request,
  setStatus,
  report,
  onExport: (detail) => emit('export', detail),
})
const { progress, result, warning } = job

const { show, close } = useEditorSession({
  props,
  state,
  player,
  source,
  size,
  filmstrip,
  settings,
  clipRange,
  job,
  labels,
  setStatus,
  report,
  emit,
})

function request(): SpliceOptions | null {
  if (!source.value) return null

  return buildRequest({
    source: source.value,
    range: range.value,
    aspect: shape.value,
    focus: focus.value,
    cues: cues.value,
    captionPosition: captionPosition.value,
    withCard: withCard.value,
    stamp: stamp.value,
    props,
  })
}

function reportFilmstrip(message: string): void {
  report(ERROR_FILMSTRIP(message), false)
}

function editAgain(): void {
  job.editAgain()
  void nextTick(() => root.value?.querySelector<HTMLElement>('.splice-handle')?.focus())
}

defineExpose({ show, close, export: job.exportClip, cancel: job.cancel, state: computed(() => state.value) })
</script>

<template>
  <section v-if="state !== 'closed'" ref="root" class="splice-editor" :data-state="state" :aria-labelledby="titleId">
    <Teleport v-if="isOverlaying" :to="shell!">
      <CropOverlay v-model:focus="focus" :size="size" :aspect="shape" :disabled="!isEditing" :preview="preview" :time="time" />
    </Teleport>

    <EditorHeader :title-id="titleId" @close="close" />

    <div v-show="state !== 'done'" class="splice-body">
      <RangeTimeline
        :range="range"
        :limits="limits"
        :time="playhead"
        :aspect="size.width / size.height"
        :disabled="!isEditing"
        :filmstrip="filmstrip"
        @change="setRange"
        @seek="seekPreview"
        @error="reportFilmstrip"
      />
      <EditorToolbar>
        <Transport :player="player" :range="range" :disabled="!isEditing" />
        <ExportPanel
          v-model:with-card="withCard"
          v-model:with-logo="withLogo"
          v-model:caption-position="captionPosition"
          v-model:aspect="shape"
          :aspects="aspects"
          :state="state"
          :progress="progress"
          :has-card="endCard !== false"
          :has-logo="Boolean(props.stamp)"
          :has-captions="cues.length > 0"
          @export="job.exportClip"
          @cancel="job.cancel"
        />
      </EditorToolbar>
      <p class="splice-status splice-editor-status" role="status" aria-live="polite" :data-kind="status.isError ? 'error' : 'info'">
        {{ status.text }}
      </p>
    </div>

    <ClipResult
      v-if="state === 'done' && result"
      class="splice-body"
      :result="result"
      :origin="origin"
      :share-caption="shareCaption"
      :warning="warning"
      @again="editAgain"
    />
  </section>
</template>
