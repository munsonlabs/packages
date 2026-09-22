<script setup lang="ts">
import { ref } from 'vue'
import Rail from './Rail.vue'
import TopButtons from './TopButtons.vue'
import Meta from './Meta.vue'
import { useShortsParts } from '../parts'
import type { Short } from '../data/shorts'
import type { PlayerHandle, StateChangeEvent } from '@munsonlabs/video-player'
import { useHoldToFastForward, HOLD_RATE } from '../composables/useHoldToFastForward'

defineProps<{ short: Short }>()

const { VideoCard, PlayButton, Scrubber, Buffering, Sigil } = useShortsParts()
const uiHidden = defineModel<boolean>('uiHidden', { required: true })

const TOAST_MS = 1500

const handle = ref<PlayerHandle | null>(null)
const { holding, rate, onPointerDown, onPointerUp } = useHoldToFastForward(handle)

const toast = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

function flash(message: string): void {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), TOAST_MS)
}

function setHandle(el: unknown): void {
  handle.value = el as PlayerHandle | null
}

function onState(e: StateChangeEvent): void {
  if (e.type === 'tap') handle.value?.togglePlay()

  if (e.type === 'captionchange') {
    const label = handle.value?.captionTracks?.find((t) => t.index === e.captionIndex)?.label
    flash(label ? `Captions: ${label}` : 'Captions off')
  }

  if (e.type === 'qualitychange' && typeof e.qualityHeight === 'number') {
    const label = handle.value?.qualityLevels?.find((level) => level.height === e.qualityHeight)?.label
    if (label) flash(`Quality: ${label}`)
  }
}
</script>

<template>
  <div class="shorts__frame">
    <VideoCard
      :ref="setHandle"
      :src="short.src"
      :poster="short.poster"
      :label="short.title"
      :caption-line="80"
      :lazy="false"
      loop
      preload="auto"
      aspect-ratio="9:16"
      :controls="false"
      :playback-rate="rate"
      play-in-view
      @state-change="onState"
    />

    <Buffering :player="handle" class="shorts__spinner">
      <span class="shorts__spinner-ring" />
    </Buffering>

    <!-- The empty <span> matters: a v-if that renders nothing counts as an empty slot, and PlayButton falls back to its own icon. -->
    <PlayButton v-show="!uiHidden" :player="handle" class="shorts__bigplay" v-slot="{ isPlaying }">
      <Sigil v-if="handle?.hasStarted && !isPlaying" name="play" library="shorts" />
      <span v-else />
    </PlayButton>

    <TopButtons :handle="handle" v-model:ui-hidden="uiHidden" />

    <Meta v-show="!uiHidden" :short="short" :handle="handle" />

    <!-- Scrubber is inheritAttrs:false, so a class here would land on its inner input; it's styled through :deep() instead. -->
    <Scrubber v-show="!uiHidden && !handle?.isLive" :player="handle" />

    <div class="shorts__edgehold" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointerleave="onPointerUp" @pointercancel="onPointerUp" />
    <span v-if="holding || toast" class="shorts__badge">{{ holding ? `${HOLD_RATE}x` : toast }}</span>
  </div>

  <Rail v-show="!uiHidden" :handle="handle" :likes="short.likes" :comments="short.comments" />
</template>

<style scoped>
@import '../styles/slide.css';
</style>
