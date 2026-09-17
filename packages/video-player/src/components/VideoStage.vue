<script setup lang="ts">
import { ref, computed, reactive, toRef, provide, onMounted, onBeforeUnmount, watch } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import PinnedControls from '@/components/pinned/PinnedControls.vue'
import { IconPlay } from '@/components/icons'
import { registerStage, unregisterStage, isStageTucked, stageState } from '@/composables/registries/stageRegistry'
import { PlaylistKey } from '@/composables/player/playerContext'
import { usePinnedReservedSpace } from '@/composables/player/viewport/usePinnedReservedSpace'
import { scrollIntoCenter } from '@/utils/scrollIntoCenter'
import { dispatchStageEvent, useStageEvent } from '@/composables/stage/useStageBus'
import { useForwardedPlayer } from '@/composables/useForwardedPlayer'
import { usePlaylist } from '@/composables/stage/usePlaylist'
import { WIN_VIDEO_SELECT, WIN_VIDEO_TOGGLE, DEFAULT_ASPECT_RATIO } from '@/constants'
import { parseAspectRatio } from '@/utils/aspectRatio'
import { getAutoAdvance, saveAutoAdvance } from '@/utils/autoAdvancePreference'
import { resolveGestureMuted } from '@/utils/audioPreference'
import { runFlipTransition } from '@/utils/flipTransition'
import type { PlayerProps, StateChangeEvent, VideoEntry, VideoSelectDetail, VideoToggleDetail, PinCorner } from '@/types/player'
import '@/styles/pinnedCorner.css'

const props = withDefaults(
  defineProps<{
    pin?: PinCorner | 'full-width'
    playlist?: VideoEntry[]
  }>(),
  { pin: 'bottom-right' },
)

const emit = defineEmits<{ 'state-change': [event: StateChangeEvent] }>()
const autoAdvance = ref(getAutoAdvance())
watch(autoAdvance, saveAutoAdvance)

const hasPlaylist = computed(() => !!props.playlist?.length)

const current = ref<VideoSelectDetail | null>(null)
const playerMounted = ref(false)
const isPlaying = ref(false)

function fireStageChange(type: 'stageopen' | 'stageclose'): void {
  emit('state-change', { type, currentTime: 0, duration: 0, src: current.value?.src ?? '' })
}

watch(playerMounted, (mounted) => fireStageChange(mounted ? 'stageopen' : 'stageclose'))

const { playerRef, forwarded } = useForwardedPlayer(() => playerMounted.value)

const wrapperEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)
const minified = ref(false)

const { hasNext, hasPrevious, nextEntry, previousEntry } = usePlaylist(toRef(props, 'playlist'), current)

const isPinned = computed(() => minified.value && !!current.value && playerMounted.value)
const isTucked = computed(() => isPinned.value && isStageTucked.value)
const idleAspect = computed(() => parseAspectRatio(current.value?.aspectRatio || DEFAULT_ASPECT_RATIO).cssRatio)

const { wrapperStyle, clear: clearReservedSize } = usePinnedReservedSpace(wrapperEl, stageEl, isPinned)

let intersectionObserver: IntersectionObserver | null = null

/** Own observer at 0.98, not the shared [0.1, 0.5] registry: the inner player's auto-pause (0.1) would fire before a later threshold could pin it. */
function setupObservers(): void {
  intersectionObserver?.disconnect()
  if (!wrapperEl.value) return
  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      const nextMinified = !entry.isIntersecting
      if (!current.value || !playerMounted.value) {
        minified.value = nextMinified
        return
      }
      void runFlipTransition(stageEl.value, () => {
        minified.value = nextMinified
      })
    },
    { threshold: 0.98 },
  )
  intersectionObserver.observe(wrapperEl.value)
}

watch(wrapperEl, setupObservers)

function resumeCurrent(): void {
  if (!current.value) return
  current.value = { ...current.value, autoplay: true, muted: resolveGestureMuted(current.value.muted) }
  playerMounted.value = true
}

function onIdleClick(): void {
  resumeCurrent()
}

function scrollToStage(): void {
  scrollIntoCenter(wrapperEl.value)
}

function dismiss(): void {
  current.value = null
  playerMounted.value = false
  isPlaying.value = false

  clearReservedSize()
  dispatchState()
}

function dispatchState(): void {
  stageState.currentSrc = current.value?.src ?? null
  stageState.isPlaying = isPlaying.value
}

const playerProps = computed<PlayerProps>(() => {
  const { fromGesture: _g, lazy: _l, autoStage: _a, ...rest } = current.value ?? { src: '' }
  return rest
})

function onVideoSelect(detail: VideoSelectDetail): void {
  /** A repeated autoStage announcement for the already-selected entry is not a gesture; only a real click toggles. */
  if (current.value?.src === detail.src && playerMounted.value) {
    if (detail.fromGesture) playerRef.value?.togglePlay()
    return
  }
  current.value = detail
  playerMounted.value = false
  isPlaying.value = false
  dispatchState()
  playerMounted.value = true
}

function onVideoToggle(detail: VideoToggleDetail): void {
  if (!current.value || detail.src !== current.value.src) return
  if (!playerMounted.value) {
    resumeCurrent()
    return
  }
  playerRef.value?.togglePlay()
}

/** Playlist skips carry the outgoing player's live mute/volume forward (feed convention), not the shared preference; resolveGestureMuted is only the fallback when nothing is mounted. */
function playEntry(entry: VideoEntry | null, fromGesture: boolean): void {
  if (!entry) return
  onVideoSelect({
    ...entry,
    fromGesture,
    autoplay: true,
    muted: entry.muted ?? playerRef.value?.isMuted ?? resolveGestureMuted(undefined, fromGesture),
    volume: entry.volume ?? playerRef.value?.vol,
  })
}

function playNext(fromGesture = true): void {
  playEntry(nextEntry.value, fromGesture)
}

function playPrevious(fromGesture = true): void {
  playEntry(previousEntry.value, fromGesture)
}

function onStateChange(e: StateChangeEvent): void {
  if (e.type === 'play') isPlaying.value = true
  if (e.type === 'pause' || e.type === 'ended') isPlaying.value = false
  if (e.type === 'ended' && autoAdvance.value) playNext(false)
  dispatchState()
  emit('state-change', e)
}

provide(
  PlaylistKey,
  reactive({
    hasPlaylist,
    hasNext,
    hasPrevious,
    autoAdvance,
    playNext: () => playNext(),
    playPrevious: () => playPrevious(),
    toggleAutoAdvance: () => {
      autoAdvance.value = !autoAdvance.value
    },
  }),
)

useStageEvent(WIN_VIDEO_SELECT, onVideoSelect)
useStageEvent(WIN_VIDEO_TOGGLE, onVideoToggle)

onMounted(registerStage)

onBeforeUnmount(() => {
  unregisterStage()
  intersectionObserver?.disconnect()
  stageState.currentSrc = null
  stageState.isPlaying = false
})

defineExpose({ playNext, playPrevious, hasNext, hasPrevious, ...forwarded })
</script>

<template>
  <div ref="wrapperEl" class="stage-wrapper" :style="wrapperStyle">
    <div
      ref="stageEl"
      class="stage"
      :class="{
        'stage--minified': isPinned,
        'stage--tucked': isTucked,
        [`stage--pin-${pin}`]: isPinned,
      }"
    >
      <PinnedControls v-if="isPinned" @scroll-to="scrollToStage" @dismiss="dismiss" />

      <VideoPlayer v-if="current && playerMounted" ref="playerRef" :key="current.src" v-bind="playerProps" @state-change="onStateChange" />

      <div v-else class="stage__idle" :style="{ aspectRatio: idleAspect }" @click="onIdleClick">
        <img v-if="current?.poster" :src="current.poster" class="stage__idle-poster" />
        <div class="stage__idle-scrim" />
        <div class="stage__idle-body">
          <template v-if="current">
            <div class="stage__idle-btn">
              <IconPlay />
            </div>
            <p class="stage__idle-title">{{ current.label }}</p>
          </template>
          <p v-else class="stage__idle-empty">Select a video to play</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage-wrapper {
  width: 100%;
  max-width: var(--mlv-max-width, 800px);
  margin: 0 auto;
}

.stage {
  width: 100%;
}

.stage--minified {
  position: fixed;
  margin: 0;
  z-index: 100;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.stage--pin-bottom-right,
.stage--pin-bottom-left,
.stage--pin-top-right,
.stage--pin-top-left {
  width: 70dvw;
  max-width: 360px;

  @media (max-width: 740px) {
    max-width: 300px;
  }
}

.stage--pin-full-width {
  width: 100%;
  max-width: 100%;
  box-shadow: none;
  top: 0;
  left: 0;
  right: 0;
  border-radius: 0;
}

.stage__idle {
  position: relative;
  width: 100%;
  border-radius: var(--mlv-radius, 12px);
  overflow: hidden;
  background: #111;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage__idle-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stage__idle-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  transition: background 0.15s;
}

.stage__idle:hover .stage__idle-scrim {
  background: rgba(0, 0, 0, 0.3);
}

.stage__idle-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  text-align: center;
}

.stage__idle-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition:
    transform 0.15s,
    background 0.15s;
}

.stage__idle:hover .stage__idle-btn {
  transform: scale(1.1);
  background: rgba(0, 0, 0, 0.8);
}

.stage__idle-btn svg {
  width: 32px;
  height: 32px;
}

.stage__idle-title {
  color: #f1f5f9;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}

.stage__idle-empty {
  color: #64748b;
  font-size: 0.95rem;
}
</style>
