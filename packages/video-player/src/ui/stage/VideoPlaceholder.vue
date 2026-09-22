<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { WIN_VIDEO_SELECT, DEFAULT_ASPECT_RATIO } from '@/constants'
import { dispatchStageEvent } from '@/ui/stage/useStageBus'
import { stageState } from '@/registries/stageRegistry'
import { observeViewportPriority } from '@/ui/player/viewport/viewportObserver'
import type { VideoEntry } from '@/types/player'
import { parseAspectRatio } from '@/utils/aspectRatio'
import { resolveGestureMuted } from '@/preferences/audioPreference'
import PlayPauseIcon from '@/ui/overlay/PlayPauseIcon.vue'
import '@/ui/styles/playPauseButton.css'

const props = withDefaults(defineProps<VideoEntry>(), {
  poster: '',
  label: '',
  aspectRatio: DEFAULT_ASPECT_RATIO,
  adTagUrl: '',
  nativeUi: false,
  autoplay: false,
  payload: () => ({}),
  autoStage: false,
  action: null,
  muted: undefined,
})

const emit = defineEmits<{ 'enter-view': [] }>()

const shellAspectRatio = computed(() => parseAspectRatio(props.aspectRatio))
const isPortrait = computed(() => shellAspectRatio.value.isPortrait)
const shellAspect = computed(() => shellAspectRatio.value.cssRatio)

const shellEl = ref<HTMLElement | null>(null)
let unobserve: (() => void) | null = null

const isActive = computed(() => stageState.currentSrc === props.src)
const isPlaying = computed(() => isActive.value && stageState.isPlaying)

const label = computed(() => (isActive.value && isPlaying.value ? 'Pause' : 'Play'))

function dispatchSelect(fromGesture: boolean, autoplay?: boolean, muted?: boolean): void {
  dispatchStageEvent(WIN_VIDEO_SELECT, {
    ...props,
    fromGesture,
    ...(autoplay !== undefined && { autoplay }),
    ...(muted !== undefined && { muted }),
  })
}

function handleClick(): void {
  dispatchSelect(true, true, resolveGestureMuted(props.muted))
}

onMounted(() => {
  if (props.autoStage) dispatchSelect(false)

  if (props.playInView && shellEl.value) {
    unobserve = observeViewportPriority(shellEl.value, () => emit('enter-view'))
  }
})

onBeforeUnmount(() => unobserve?.())
</script>

<template>
  <div class="placeholder">
    <div
      ref="shellEl"
      class="placeholder__shell"
      :class="{
        'placeholder__shell--portrait': isPortrait,
        'placeholder__shell--active': isActive,
      }"
      :style="{ aspectRatio: shellAspect }"
      @click="handleClick"
    >
      <img v-if="poster" class="placeholder__poster" :src="poster" :alt="label" />
      <div class="placeholder__scrim" />

      <div class="placeholder__btn-wrap">
        <button type="button" class="ppbtn ppbtn--lg" :aria-label="label" @click.stop="handleClick">
          <PlayPauseIcon :is-playing="isActive && isPlaying" />
        </button>
      </div>

      <div v-if="label" class="placeholder__footer">
        <p class="placeholder__title">{{ label }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%;
  max-width: var(--mlv-max-width, 800px);
  margin: 0 auto;
}

.placeholder__shell {
  position: relative;
  border-radius: var(--mlv-radius, 12px);
  overflow: hidden;
  background: #111;
  cursor: pointer;
}

.placeholder__shell--portrait {
  max-height: 75dvh;
  width: auto;
  margin: 0 auto;
}

.placeholder__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder__scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  transition: background 0.15s;
}

.placeholder__shell:hover .placeholder__scrim {
  background: rgba(0, 0, 0, 0.15);
}

.placeholder__btn-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.placeholder__btn-wrap > * {
  pointer-events: auto;
}

.placeholder__footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 0.75rem 0.6rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
  pointer-events: none;
}

.placeholder__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
</style>
