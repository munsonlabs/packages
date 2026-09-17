<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { VideoPlayer, PlayButton, MuteButton, Scrubber, Buffering } from '@munsonlabs/video-player'
import type { PlayerHandle, StateChangeEvent, VideoEntry } from '@munsonlabs/video-player'
import { videos } from '../data/demoVideos'
import { useDemoSettings } from '../composables/useDemoSettings'
import { useEventLog } from '../composables/useEventLog'

defineEmits<{ back: [] }>()

const { webComponents } = useDemoSettings()
const { addLog } = useEventLog()

const ALL_VIDEOS: VideoEntry[] = videos

const currentIndex = ref(0)
const reelEl = ref<HTMLElement | null>(null)
const playerRefs = ref<(PlayerHandle | null)[]>([null, null, null])

const globalMuted = ref(true)
watch(
  () => playerRefs.value[1]?.isMuted,
  (val) => {
    if (val !== undefined) globalMuted.value = val
  },
)

let slideHeight = 0
// Guards the programmatic scrollTop resets below from re-triggering this same recycling logic.
let recycling = false
let scrollTimer: ReturnType<typeof setTimeout> | null = null

const boundaryMessage = ref<string | null>(null)
let boundaryTimer: ReturnType<typeof setTimeout> | null = null
let bounceTimer: ReturnType<typeof setTimeout> | null = null

const slotVideos = computed<(VideoEntry | null)[]>(() => [
  ALL_VIDEOS[currentIndex.value - 1] ?? null,
  ALL_VIDEOS[currentIndex.value] ?? null,
  ALL_VIDEOS[currentIndex.value + 1] ?? null,
])

function setPlayerRef(slot: number, el: unknown): void {
  playerRefs.value[slot] = el as PlayerHandle | null
}

function centerScroll(): void {
  if (!reelEl.value) return
  recycling = true
  reelEl.value.scrollTop = slideHeight
  requestAnimationFrame(() => {
    recycling = false
  })
}

function showBoundaryMessage(message: string): void {
  boundaryMessage.value = message
  if (boundaryTimer) clearTimeout(boundaryTimer)
  boundaryTimer = setTimeout(() => {
    boundaryMessage.value = null
  }, 1600)
}

function bounceBack(): void {
  if (!reelEl.value) return
  recycling = true
  reelEl.value.scrollTo({ top: slideHeight, behavior: 'smooth' })
  if (bounceTimer) clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => {
    recycling = false
  }, 450)
}

function measure(): void {
  if (!reelEl.value) return
  slideHeight = reelEl.value.clientHeight
  reelEl.value.scrollTop = slideHeight
}

async function onSettled(): Promise<void> {
  if (!reelEl.value || recycling || !slideHeight) return
  const slot = Math.round(reelEl.value.scrollTop / slideHeight)
  if (slot === 1) return

  const delta = slot - 1
  const next = currentIndex.value + delta
  if (next < 0 || next >= ALL_VIDEOS.length) {
    showBoundaryMessage(next < 0 ? "You're at the first video" : "You're at the last video")
    bounceBack()
    return
  }

  currentIndex.value = next
  await nextTick() // let the new slotVideos/:key'd players mount before we silently re-center
  centerScroll()
}

function onScroll(): void {
  if (recycling) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(onSettled, 120)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (reelEl.value) {
    ro.observe(reelEl.value)
    reelEl.value.addEventListener('scroll', onScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  reelEl.value?.removeEventListener('scroll', onScroll)
  if (scrollTimer) clearTimeout(scrollTimer)
  if (boundaryTimer) clearTimeout(boundaryTimer)
  if (bounceTimer) clearTimeout(bounceTimer)
})

function onStateChange(e: StateChangeEvent | CustomEvent): void {
  addLog(e instanceof CustomEvent ? e.detail[0] : e)
}
</script>

<template>
  <div class="reel-page">
    <button class="reel-page__back" aria-label="Back to showcase" @click="$emit('back')">← Showcase</button>
    <p class="reel-page__counter">{{ currentIndex + 1 }} / {{ ALL_VIDEOS.length }} - {{ slotVideos.filter(Boolean).length }} mounted</p>

    <transition name="reel-page__toast">
      <div v-if="boundaryMessage" class="reel-page__toast">{{ boundaryMessage }}</div>
    </transition>

    <div ref="reelEl" class="reel-page__scroller">
      <div v-for="(video, slot) in slotVideos" :key="video?.src ?? `empty-${slot}`" class="reel-page__slide">
        <template v-if="video">
          <component
            :is="webComponents ? 'ml-video-player' : VideoPlayer"
            :ref="(el) => setPlayerRef(slot, el)"
            v-bind="video"
            :controls="false"
            :muted="globalMuted"
            :play-in-view="true"
            @state-change="onStateChange"
          />

          <p class="reel-page__title">{{ video.label }}</p>

          <div class="reel-page__corner">
            <Buffering :player="playerRefs[slot]" class="reel-page__icon-btn reel-page__icon-btn--buffering" />
            <MuteButton :player="playerRefs[slot]" class="reel-page__icon-btn" v-slot="{ isMuted }">
              <svg v-if="isMuted" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            </MuteButton>
            <PlayButton :player="playerRefs[slot]" class="reel-page__icon-btn" v-slot="{ isPlaying }">
              <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </PlayButton>
          </div>

          <div class="reel-page__seekbar-wrap">
            <Scrubber :player="playerRefs[slot]" class="reel-page__seekbar" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reel-page {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #000;
}

.reel-page__back {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 3;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.reel-page__counter {
  position: absolute;
  top: 1.1rem;
  right: 1rem;
  z-index: 3;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.reel-page__toast {
  position: absolute;
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  border: 1px solid var(--border);
  border-radius: 999px;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  white-space: nowrap;
  pointer-events: none;
}

.reel-page__toast-enter-active,
.reel-page__toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.reel-page__toast-enter-from,
.reel-page__toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}

.reel-page__scroller {
  height: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}
.reel-page__scroller::-webkit-scrollbar {
  display: none;
}

.reel-page__slide {
  position: relative;
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background: #000;
}

.reel-page__slide :deep(.player),
.reel-page__slide :deep(ml-video-player) {
  height: 100%;
}

.reel-page__slide :deep(.player__shell) {
  height: 100%;
  border-radius: 0;
  aspect-ratio: auto !important;
}

.reel-page__title {
  position: absolute;
  left: 1rem;
  bottom: 3rem;
  right: 4rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

.reel-page__corner {
  position: absolute;
  right: 1rem;
  bottom: 3.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 2;
}

.reel-page__icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.reel-page__icon-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}
.reel-page__icon-btn svg {
  width: 22px;
  height: 22px;
}

.reel-page__icon-btn--buffering {
  cursor: default;
}

.reel-page__seekbar-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1.6rem;
  display: flex;
  align-items: center;
  z-index: 2;
}
</style>

<style>
/*
 * These target .reel-page__seekbar on Scrubber's <input> — a grandchild forwarded via $attrs, not
 * this component's own root, so it never receives a scoped-CSS scope-id from this file (same note
 * as ControlsPopup's .controls__seek in the package itself). Must stay unscoped/global.
 */
.reel-page__seekbar {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background-image: linear-gradient(to right, #fff var(--p), rgba(255, 255, 255, 0.25) var(--p));
}
.reel-page__seekbar::-webkit-slider-runnable-track {
  height: 3px;
  background: transparent;
}
.reel-page__seekbar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 5px;
  height: 18px;
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  margin-top: -7.5px;
}
.reel-page__seekbar::-moz-range-track {
  height: 3px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999px;
}
.reel-page__seekbar::-moz-range-progress {
  height: 3px;
  background: #fff;
  border-radius: 999px;
}
.reel-page__seekbar::-moz-range-thumb {
  width: 5px;
  height: 18px;
  border: none;
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}
</style>
