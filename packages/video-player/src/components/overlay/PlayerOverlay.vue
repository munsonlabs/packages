<script setup lang="ts">
import { PlayerKey, HudKey, injectStrict } from '@/composables/player/playerContext'
import { useOverlayVisibility } from '@/composables/overlay/useOverlayVisibility'
import HudButtons from '@/components/overlay/HudButtons.vue'
import ControlsPopup from '@/components/overlay/ControlsPopup.vue'
import Spinner from '@/components/Spinner.vue'

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)

const { hudVisible, popupVisible } = useOverlayVisibility(player, hud)
</script>

<template>
  <transition name="fade">
    <div v-if="!player.isReady && !player.isError" class="overlay__spinner">
      <Spinner :size="40" :border-width="3" />
    </div>
  </transition>

  <!-- No transition: a leave that waits on an animation frame can strand a clickable Retry over a recovered player when frames are paused (background tab). -->
  <div v-if="player.isError" class="overlay__error">
    <p>{{ player.errorMessage || 'This video could not be played.' }}</p>
    <button class="overlay__retry" @click.stop="player.retry">Retry</button>
  </div>

  <button type="button" class="overlay__reveal" aria-label="Show player controls" @click="hud.openControls()">Show player controls</button>

  <div class="overlay__hud" :class="{ 'overlay__hud--visible': hudVisible }" :inert="!hudVisible">
    <HudButtons />
  </div>

  <transition name="popup">
    <div v-if="popupVisible" class="overlay__popup" :class="{ 'overlay__popup--fs': player.isFullscreen }">
      <ControlsPopup />
    </div>
  </transition>
</template>

<style scoped>
.overlay__spinner {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.overlay__error {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  pointer-events: none;
}

.overlay__error p {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  max-width: 260px;
  line-height: 1.5;
}

.overlay__retry {
  pointer-events: auto;
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.overlay__retry:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Visually hidden except while focused (the standard "skip link" technique) - always mounted, never `v-if`'d on `hudVisible`, since toggling it off the instant it's activated would unmount the very button that currently has focus. */
.overlay__reveal {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}

.overlay__reveal:focus {
  width: auto;
  height: auto;
  padding: 0.4rem 0.75rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.overlay__hud {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.overlay__hud--visible {
  opacity: 1;
  pointer-events: all;
}

/* ControlsPopup (opened via the reveal/close skip links, or by hovering) already has its own Play/Mute/etc - this row would just double up behind it once that's showing. `<transition>` doesn't add a wrapper element, so `.overlay__popup` is still a real sibling for `:has()` to see. */
.overlay__hud:has(~ .overlay__popup) {
  opacity: 0 !important;
  pointer-events: none !important;
}

/* pointer-events:none lets clicks around the popup card fall through - ControlsPopup closes itself via its own document listener. */
.overlay__popup {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: var(--mlv-popup-align, center);
  justify-content: center;
  padding: 16px;
  pointer-events: none;
}

.overlay__popup :deep(.controls) {
  pointer-events: auto;
}

.overlay__popup--fs {
  align-items: flex-end;
}

.popup-enter-active,
.popup-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
