<script setup lang="ts">
import { PlayerKey, HudKey, injectStrict } from '@/player/playerContext'
import VolumeIcon from '@/overlay/VolumeIcon.vue'
import VolumeSlider from '@/controls/VolumeSlider.vue'
import Icon from '@/shared/Icon.vue'

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
