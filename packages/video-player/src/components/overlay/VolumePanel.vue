<script setup lang="ts">
import { PlayerKey, HudKey, injectStrict } from '@/composables/player/playerContext'
import VolumeIcon from '@/components/overlay/VolumeIcon.vue'
import VolumeSlider from '@/components/controls/VolumeSlider.vue'
import Icon from '@/components/Icon.vue'

defineEmits<{ back: [] }>()

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
</script>

<template>
  <div class="controls__vol-header">
    <button class="controls__btn" aria-label="Back" @click="$emit('back')">
      <Icon name="back" />
    </button>
    <span class="controls__vol-label">Volume</span>
    <button class="controls__btn" :aria-label="player.isMuted ? 'Unmute' : 'Mute'" @click="player.toggleMute()">
      <VolumeIcon :is-audible="player.isAudible" />
    </button>
  </div>

  <div class="controls__vol-body">
    <VolumeSlider
      :player="player"
      class="controls__vol-slider"
      @mousedown="hud.pauseHide()"
      @mouseup="hud.scheduleHide()"
      @touchstart.passive="hud.pauseHide()"
      @touchend="hud.scheduleHide()"
      v-slot="{ percent }"
    >
      <span class="controls__vol-pct">{{ percent }}%</span>
    </VolumeSlider>
  </div>
</template>

<style>
/* Targets a grandchild forwarded via $attrs, so this MUST stay unscoped/global. */
.controls__vol-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 5px;
  outline: none;
  cursor: pointer;
  transition: height 0.15s;
  background: linear-gradient(to right, #fff 0%, #fff var(--v), rgba(255, 255, 255, 0.15) var(--v), rgba(255, 255, 255, 0.15) 100%);
}

.controls__vol-slider:hover {
  height: 7px;
}

.controls__vol-slider:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.controls__vol-slider::-webkit-slider-runnable-track {
  height: 5px;
  background: transparent;
}

.controls__vol-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  cursor: pointer;
  margin-top: -5.5px;
  transition: transform 0.15s;
}

.controls__vol-slider:hover::-webkit-slider-thumb {
  transform: scale(1.2);
}

.controls__vol-slider::-moz-range-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.15);
}

.controls__vol-slider::-moz-range-progress {
  height: 5px;
  background: #fff;
}

.controls__vol-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
  cursor: pointer;
}
</style>

<style scoped>
.controls__vol-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.controls__vol-label {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 4px;
}

.controls__vol-body {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0 4px;
}

.controls__vol-pct {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  min-width: 32px;
  text-align: right;
}
</style>
