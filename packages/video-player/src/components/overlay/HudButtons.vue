<script setup lang="ts">
import { inject } from 'vue'
import { PlayerKey, HudKey, ActionKey, PlaylistKey, injectStrict } from '@/composables/player/playerContext'
import { usePlayerAction } from '@/composables/overlay/usePlayerAction'
import PlayButton from '@/components/controls/PlayButton.vue'
import Buffering from '@/components/controls/Buffering.vue'
import VolumeIcon from '@/components/overlay/VolumeIcon.vue'
import { IconLoop, IconControls, IconSkipNext } from '@/components/icons'
import '@/elements/ppbtn.css'

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
const action = inject(ActionKey)
const playlist = injectStrict(PlaylistKey)

const { currentAction, isCustom, customAction, builtinLabel, builtinActive, onBuiltinClick } = usePlayerAction(action, player, playlist)
</script>

<template>
  <!-- tabindex="-1" + aria-hidden: this row's play/mute/custom/show-controls buttons are all redundant outside plain mouse hover - play/mute already have global hotkeys, everything else is duplicated in ControlsPopup, which PlayerOverlay's "Show player controls" skip link reaches directly for keyboard/AT users. -->
  <div class="hud" aria-hidden="true">
    <template v-if="!hud.isOpen && !player.isFullscreen">
      <button
        v-if="currentAction === 'mute' || currentAction === 'loop' || currentAction === 'autoplay'"
        class="hud__btn"
        :class="{ 'hud__btn--active': builtinActive }"
        :aria-label="builtinLabel"
        tabindex="-1"
        @click.stop="onBuiltinClick"
      >
        <VolumeIcon v-if="currentAction === 'mute'" :is-audible="player.isAudible" />
        <IconLoop v-else-if="currentAction === 'loop'" />
        <IconSkipNext v-else />
      </button>

      <button
        v-else-if="isCustom && customAction"
        class="hud__btn"
        :aria-label="customAction.label"
        tabindex="-1"
        @click.stop="customAction.onClick()"
        v-html="customAction.icon"
      />

      <div v-else class="hud__spacer" />
    </template>

    <div class="hud__play-wrap">
      <PlayButton :player="player" class="ppbtn ppbtn--lg" tabindex="-1" />
      <Buffering :player="player" class="hud__buf-spinner" />
    </div>

    <button v-if="!hud.isOpen && !player.isFullscreen" class="hud__btn" aria-label="Show controls" tabindex="-1" @click.stop="hud.openControls">
      <IconControls />
    </button>
  </div>
</template>

<style scoped>
.hud {
  display: flex;
  align-items: center;
  gap: clamp(12px, 5cqw, 20px);
}

.hud__play-wrap {
  position: relative;
  display: flex;
}

.hud__buf-spinner {
  position: absolute;
  top: 100%;
  left: calc(50% - 7px);
  margin-top: 8px;
}

.hud__spacer {
  width: clamp(36px, 14cqw, 44px);
  height: clamp(36px, 14cqw, 44px);
  flex-shrink: 0;
}

.hud__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(36px, 14cqw, 44px);
  height: clamp(36px, 14cqw, 44px);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: var(--mlv-btn-bg, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(12px);
  will-change: backdrop-filter;
  color: var(--mlv-btn-color, #fff);
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.15s;
}

.hud__btn svg {
  width: clamp(16px, 6cqw, 18px);
  height: clamp(16px, 6cqw, 18px);
}

.hud__btn:hover {
  background: var(--mlv-btn-bg, rgba(255, 255, 255, 0.2));
  filter: brightness(1.12);
  transform: scale(1.08);
}

.hud__btn--active {
  border-color: var(--mlv-accent, #3b82f6);
  background: color-mix(in srgb, var(--mlv-accent, #3b82f6) 30%, var(--mlv-btn-bg, rgba(255, 255, 255, 0.1)));
  color: var(--mlv-btn-color, #fff);
}

.hud__btn--active:hover {
  background: color-mix(in srgb, var(--mlv-accent, #3b82f6) 45%, var(--mlv-btn-bg, rgba(255, 255, 255, 0.2)));
}
</style>
