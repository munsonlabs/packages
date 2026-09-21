<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, injectStrict } from '@/composables/player/playerContext'
import { useElementCompact } from '@/composables/useElementCompact'
import { runFlipTransition } from '@/utils/flipTransition'
import { isIOS } from '@/utils/platform'
import PlayButton from '@/components/controls/PlayButton.vue'
import Buffering from '@/components/controls/Buffering.vue'
import FullscreenButton from '@/components/controls/FullscreenButton.vue'
import PipButton from '@/components/controls/PipButton.vue'
import Scrubber from '@/components/controls/Scrubber.vue'
import TimeDisplay from '@/components/controls/TimeDisplay.vue'
import VolumePanel from '@/components/overlay/VolumePanel.vue'
import VolumeIcon from '@/components/overlay/VolumeIcon.vue'
import MoreMenu from '@/components/overlay/MoreMenu.vue'
import Spinner from '@/components/Spinner.vue'
import Icon from '@/components/Icon.vue'
import '@/elements/ppbtn.css'

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
const playlist = injectStrict(PlaylistKey)

const action = inject(ActionKey)

const showVolume = ref(false)
const showMore = ref(false)
const popupEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const compact = useElementCompact(popupEl)

const hasNonDefaultSettings = computed(() => player.isLooping || player.currentPlaybackRate !== 1 || playlist.autoAdvance)

function closeIfOutside(target: EventTarget | null): boolean {
  if (!popupEl.value || popupEl.value.contains(target as Node)) return false
  hud.closeControls()
  return true
}

function onDocumentClick(e: MouseEvent): void {
  closeIfOutside(e.target)
}

/** iOS Safari needs touchend too - preventDefault suppresses the later synthetic click on whatever's now underneath. */
function onDocumentTouchEnd(e: TouchEvent): void {
  if (closeIfOutside(e.target)) e.preventDefault()
}

/** Capture phase, not bubble - VideoPlayer's tap-capture layer calls stopPropagation() on touchend, which would otherwise swallow this. */
onMounted(() => {
  player.fire('controlsopen', { element: popupEl.value })
  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('touchend', onDocumentTouchEnd, true)
})

onBeforeUnmount(() => {
  showVolume.value = false
  showMore.value = false
  player.fire('controlsclose', { element: popupEl.value })
  document.removeEventListener('click', onDocumentClick, true)
  document.removeEventListener('touchend', onDocumentTouchEnd, true)
})

const PANEL_FADE_MS = 130

/** `popupEl` stays visible for the FLIP resize; only `contentEl` fades out for the swap, or the resize itself would be hidden too. */
function swapPanel(fn: () => void): void {
  hud.suppressMouseLeave()
  const box = popupEl.value
  const content = contentEl.value
  if (!box || !content) {
    fn()
    return
  }
  content.style.opacity = '0'
  void runFlipTransition(box, fn).then(() => {
    content.style.transition = `opacity ${PANEL_FADE_MS}ms ease`
    content.style.opacity = ''
    setTimeout(() => {
      content.style.transition = ''
    }, PANEL_FADE_MS)
  })
}

/** iOS locks HTMLMediaElement.volume - a slider there would be inert, so toggle mute instead. */
function onVolumeClick(): void {
  if (isIOS()) {
    player.toggleMute()
    return
  }
  swapPanel(() => {
    showVolume.value = true
  })
}

function onMoreClick(): void {
  swapPanel(() => {
    showMore.value = true
  })
}
</script>

<template>
  <div ref="popupEl" class="controls" :class="{ 'controls--fs': player.isFullscreen, 'controls--compact': compact }" @mousemove.stop="hud.keepOpen">
    <div class="controls__inner" ref="contentEl">
      <template v-if="showVolume">
        <VolumePanel @back="swapPanel(() => (showVolume = false))" />
      </template>

      <template v-else-if="showMore">
        <MoreMenu :compact="compact" @back="swapPanel(() => (showMore = false))" />
      </template>

      <template v-else>
        <Scrubber
          v-if="!player.isLive"
          class="controls__seek"
          @mousedown="hud.pauseHide()"
          @mouseup="hud.scheduleHide()"
          @touchstart.passive="hud.pauseHide()"
          @touchend="hud.scheduleHide()"
        />

        <div class="controls__row">
          <div class="controls__play-wrap">
            <Buffering />
            <PlayButton v-if="!player.isBuffering" class="ppbtn ppbtn--sm" />
          </div>

          <TimeDisplay class="controls__time-display" />

          <button v-if="playlist.hasNext" class="controls__btn controls__btn--next" aria-label="Play next" @click="playlist.playNext()">
            <Icon name="skip-next" />
          </button>

          <button
            class="controls__btn controls__btn--volume"
            aria-label="Volume"
            aria-haspopup="true"
            :aria-expanded="showVolume"
            @click="onVolumeClick"
          >
            <VolumeIcon :is-audible="player.isAudible" />
          </button>

          <button
            class="controls__btn controls__btn--more"
            :class="{ 'controls__btn--active': hasNonDefaultSettings }"
            aria-label="More"
            aria-haspopup="true"
            :aria-expanded="showMore"
            @click="onMoreClick"
          >
            <Icon name="more" />
          </button>

          <PipButton class="controls__btn controls__btn--pip" />

          <div class="controls__fs-wrap">
            <Spinner v-if="player.isFullscreenPending" />
            <FullscreenButton v-else class="controls__btn" />
          </div>
        </div>
      </template>
    </div>

    <button type="button" class="controls__close" aria-label="Close player controls" @click="hud.closeControls(true)">Close player controls</button>
  </div>
</template>

<style>
.controls__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s,
    color 0.15s;
}

.controls__inner:has(.controls__more-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* background: red; */
  max-width: 100%;
  overflow: auto;
}

.controls__btn svg {
  width: 16px;
  height: 16px;
}
.controls__btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.controls--compact .controls__seek,
.controls--compact .mlv-scrubber-wrap,
.controls--compact .mlv-time-display__total,
.controls--compact .controls__btn--pip,
.controls--compact .controls__btn--next,
.controls--compact .controls__btn--volume {
  display: none;
}

.controls__seek {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  outline: none;
  cursor: pointer;
  background: transparent;
  padding: 8px 0;
  box-sizing: border-box;
  background-clip: content-box;
  background-image: linear-gradient(
    to right,
    var(--mlv-accent, #3b82f6) 0%,
    var(--mlv-accent, #3b82f6) var(--p),
    rgba(255, 255, 255, 0.3) var(--p),
    rgba(255, 255, 255, 0.3) var(--b),
    rgba(255, 255, 255, 0.1) var(--b),
    rgba(255, 255, 255, 0.1) 100%
  );
}

.controls__seek::-webkit-slider-runnable-track {
  height: 4px;
  background: transparent;
}

.controls__seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mlv-accent, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--mlv-accent, #3b82f6) 30%, transparent);
  cursor: pointer;
  margin-top: -5px;
  transition: transform 0.15s;
}

.controls__seek:hover::-webkit-slider-thumb {
  transform: scale(1.25);
}

.controls__seek::-moz-range-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.controls__seek::-moz-range-progress {
  height: 4px;
  background: var(--mlv-accent, #3b82f6);
}

.controls__seek::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--mlv-accent, #3b82f6);
  border: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--mlv-accent, #3b82f6) 30%, transparent);
  cursor: pointer;
}
</style>

<style scoped>
.controls {
  position: relative;
  width: var(--mlv-controls-width, min(450px, calc(100% - 32px)));
  max-height: 100%;
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 18px;
  background: rgba(10, 10, 14, 1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.controls--fs {
  width: 100%;
}

/* Visually hidden except while focused, same technique as PlayerOverlay's reveal button - absolutely positioned (out of the flex flow) so it doesn't add to `.controls`' `gap` even at its 1px hidden size. */
.controls__close {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
}

.controls__close:focus {
  width: auto;
  height: auto;
  padding: 6px 10px;
  overflow: visible;
  clip: auto;
  white-space: normal;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.controls__row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.controls__time-display {
  flex: 1;
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.02em;
  padding: 0 4px;
}

.controls__time-display.mlv-time-display--live {
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f87171;
}

.controls__play-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}

.controls__btn--active,
.controls__btn--pip.mlv-pip-button--active {
  color: var(--mlv-accent, #3b82f6);
}
.controls__btn--active:hover,
.controls__btn--pip.mlv-pip-button--active:hover {
  color: var(--mlv-accent, #60a5fa);
}

.controls__fs-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
}
</style>
