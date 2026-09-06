<script setup lang="ts">
import { ref, computed, toRef, onMounted, onBeforeUnmount, watch } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import PinnedControls from '@/components/pinned/PinnedControls.vue'
import { IconPlay } from '@/components/icons'
import { registerStage, unregisterStage, isStageTucked } from '@/composables/registries/stageRegistry'
import { usePinnedReservedSpace } from '@/composables/player/usePinnedReservedSpace'
import { scrollIntoCenter } from '@/utils/scrollIntoCenter'
import { dispatchStageEvent, useStageEvent } from '@/composables/stage/useStageBus'
import { useForwardedPlayer } from '@/composables/useForwardedPlayer'
import { usePlaylist } from '@/composables/stage/usePlaylist'
import { WIN_VIDEO_SELECT, WIN_VIDEO_TOGGLE, WIN_VIDEO_STATE, DEFAULT_ASPECT_RATIO } from '@/constants'
import { parseAspectRatio } from '@/utils/aspectRatio'
import { getAutoAdvance, saveAutoAdvance } from '@/utils/autoAdvancePreference'
import { resolveGestureMuted } from '@/utils/audioPreference'
import { runFlipTransition } from '@/utils/flipTransition'
import type { StateChangeEvent, VideoEntry, VideoSelectDetail, VideoToggleDetail } from '@/types/player'
import '@/styles/pinnedCorner.css'

const props = withDefaults(
  defineProps<{
    pin?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'full-width'
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

/** Piggybacks on the same state-change stream as controlsopen/controlsclose, rather than a separate event. */
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

/**
 * Deliberately its own dedicated IntersectionObserver, not the shared observeViewport registry -
 * that registry's thresholds ([0.1, 0.5]) fire far later than 0.98 does, which would leave enough
 * scroll distance for the inner player's own useAutoPauseOffscreen (threshold 0.1) to pause it
 * before this ever gets the chance to pin it safely on-screen first.
 */
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

/** Resuming the current (already-selected) entry from idle - always a real click (onIdleClick) or a documented play/pause action (onVideoToggle), so resolveGestureMuted defaults to treating it as a gesture. */
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
  dispatchStageEvent(WIN_VIDEO_STATE, { currentSrc: current.value?.src ?? null, isPlaying: isPlaying.value })
}

function onVideoSelect(detail: VideoSelectDetail): void {
  /**
   * Only toggles for a real gesture (see VideoSelectDetail.fromGesture's own doc comment) - a
   * second, harmless autoStage announcement for the same already-selected video (e.g. from a
   * second VideoCard rendering the same entry elsewhere on the page) is never gesture-driven, so
   * it's a no-op here instead of being mistaken for the user re-clicking an already-playing video
   * and silently starting playback nobody asked for.
   */
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

/**
 * Auto-advance/skip switches to a brand-new <video> element (:key="current.src" below forces
 * a full remount, not a src swap) - carries the *current*, outgoing player's own live mute/volume
 * over to it, rather than the globally shared audioPreference (see utils/audioPreference.ts). This
 * is the feed convention (TikTok/Reels-style), not the single-video convention: within one
 * continuous playlist, audio state should stick to what's already playing - if the current video
 * is muted, "next" shouldn't spontaneously turn sound on just because nothing's ever been
 * explicitly saved globally, and vice versa. `resolveGestureMuted` is only the fallback for the
 * (rare) case nothing is currently mounted to carry from - there `fromGesture` still distinguishes
 * a real "skip" click (exempt from the autoplay-with-sound policy) from an automatic
 * ended-triggered auto-advance (not exempt).
 */
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

useStageEvent(WIN_VIDEO_SELECT, onVideoSelect)
useStageEvent(WIN_VIDEO_TOGGLE, onVideoToggle)

onMounted(registerStage)

onBeforeUnmount(() => {
  unregisterStage()
  intersectionObserver?.disconnect()
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

      <VideoPlayer
        v-if="current && playerMounted"
        ref="playerRef"
        :key="current.src"
        v-bind="current"
        :has-playlist="hasPlaylist"
        :has-next="hasNext"
        :has-previous="hasPrevious"
        :auto-advance="autoAdvance"
        @state-change="onStateChange"
        @play-next="playNext"
        @play-previous="playPrevious"
        @toggle-auto-advance="autoAdvance = !autoAdvance"
      />

      <div v-else class="stage__idle" :style="{ aspectRatio: idleAspect }" @click="onIdleClick">
        <img v-if="current?.poster" :src="current.poster" class="stage__idle-poster" />
        <div class="stage__idle-scrim" />
        <div class="stage__idle-body">
          <template v-if="current">
            <div class="stage__idle-btn">
              <IconPlay />
            </div>
            <p class="stage__idle-title">{{ current.title }}</p>
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
  max-width: 800px;
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
