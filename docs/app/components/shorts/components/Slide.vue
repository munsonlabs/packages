<script setup lang="ts">
import { ref, watch, type Component } from 'vue'
import Rail from './Rail.vue'
import type { Short } from '../data/shorts'
import type { PlayerHandle, StateChangeEvent } from '@munsonlabs/video-player'
import { useHoldToFastForward, HOLD_RATE } from '../composables/useHoldToFastForward'
import { useQualityPreference, preferredQuality } from '../composables/useQualityPreference'

defineProps<{ short: Short; parts: Record<string, Component> }>()
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

// `previous` is undefined only on the first run, when the handle lands - a default track that's already on shouldn't announce itself.
watch(
  () => handle.value?.activeCaptionIndex,
  (index, previous) => {
    if (previous === undefined) return
    const label = handle.value?.captionTracks.find((t) => t.index === index)?.label
    flash(label ? `Captions: ${label}` : 'Captions off')
  },
)

useQualityPreference(handle, (label) => flash(`Quality: ${label}`))

function setHandle(el: unknown): void {
  handle.value = el as PlayerHandle | null
}

function onState(e: StateChangeEvent): void {
  if (e.type === 'tap') handle.value?.togglePlay()
}
</script>

<template>
  <div class="shorts__frame">
    <component
      :is="parts.VideoCard"
      :ref="setHandle"
      :src="short.src"
      :poster="short.poster"
      :label="short.title"
      :caption-line="80"
      :quality="preferredQuality"
      :lazy="false"
      loop
      preload="auto"
      aspect-ratio="9:16"
      :controls="false"
      :playback-rate="rate"
      play-in-view
      @state-change="onState"
    />

    <component :is="parts.Buffering" :player="handle" class="shorts__spinner">
      <span class="shorts__spinner-ring" />
    </component>

    <!-- The empty <span> matters: a v-if that renders nothing counts as an empty slot, and PlayButton falls back to its own icon. -->
    <component v-show="!uiHidden" :is="parts.PlayButton" :player="handle" class="shorts__bigplay" v-slot="{ isPlaying }">
      <component :is="parts.Sigil" v-if="handle?.hasStarted && !isPlaying" name="play" library="shorts" />
      <span v-else />
    </component>

    <div class="shorts__topbuttons">
      <component v-show="!uiHidden" :is="parts.MuteButton" :player="handle" class="shorts__mute" v-slot="{ isMuted }">
        <component :is="parts.Sigil" :name="isMuted ? 'volume-mute' : 'volume-on'" library="shorts" />
      </component>

      <component
        v-show="!uiHidden"
        :is="parts.CaptionsButton"
        :player="handle"
        class="shorts__captions"
        :class="{ 'shorts__captions--active': handle?.activeCaptionIndex !== null }"
      >
        <component :is="parts.Sigil" name="captions" library="shorts" />
      </component>

      <button class="shorts__clear" :aria-label="uiHidden ? 'Show player UI' : 'Hide player UI'" @click="uiHidden = !uiHidden">
        <component :is="parts.Sigil" :name="uiHidden ? 'eye' : 'eye-off'" library="shorts" />
      </button>
    </div>

    <div v-show="!uiHidden" class="shorts__meta">
      <div class="shorts__channel">
        <span class="shorts__avatar">{{ short.handle[1].toUpperCase() }}</span>
        <span class="shorts__handle">{{ short.handle }}</span>
        <span v-if="handle?.isLive" class="shorts__live"><span class="shorts__live-dot" />Live</span>
        <button v-else class="shorts__subscribe">Subscribe</button>
      </div>
      <p class="shorts__title">{{ short.title }}</p>
    </div>

    <!-- Scrubber is inheritAttrs:false, so a class here would land on its inner input; it's styled through :deep() instead. -->
    <component v-show="!uiHidden && !handle?.isLive" :is="parts.Scrubber" :player="handle" />

    <div class="shorts__edgehold" @pointerdown="onPointerDown" @pointerup="onPointerUp" @pointerleave="onPointerUp" @pointercancel="onPointerUp" />
    <span v-if="holding || toast" class="shorts__badge">{{ holding ? `${HOLD_RATE}x` : toast }}</span>
  </div>

  <Rail v-show="!uiHidden" :parts="parts" :handle="handle" :likes="short.likes" :comments="short.comments" />
</template>

<style scoped>
@import '../styles/slide.css';
</style>
