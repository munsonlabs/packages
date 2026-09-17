<script setup lang="ts">
import { fmtTime } from '@/utils/time'
import { computed } from 'vue'
import { PlayerKey, injectStrict } from '@/composables/player/playerContext'
import { IconVolumeOn, IconVolumeMute, IconPlay, IconPause } from '@/components/icons'

const player = injectStrict(PlayerKey)

const countdown = computed(() => (player.adRemainingTime > 0 ? fmtTime(player.adRemainingTime) : ''))
</script>

<template>
  <div class="ad-overlay">
    <div class="ad-overlay__bar">
      <div class="ad-overlay__badge">
        <span>Ad</span>
        <span v-if="countdown" class="ad-overlay__countdown">{{ countdown }}</span>
      </div>

      <button class="ad-overlay__btn" :aria-label="player.isAdPaused ? 'Resume ad' : 'Pause ad'" @click="player.togglePlay()">
        <IconPlay v-if="player.isAdPaused" />
        <IconPause v-else />
      </button>

      <button class="ad-overlay__btn" :aria-label="player.isAdMuted ? 'Unmute ad' : 'Mute ad'" @click="player.toggleAdMute()">
        <IconVolumeMute v-if="player.isAdMuted" />
        <IconVolumeOn v-else />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* z-index 21, above the ad creative (20, see VideoPlayer.vue) so these buttons stay reachable. */
.ad-overlay {
  position: absolute;
  inset: 0;
  z-index: 21;
  pointer-events: none;
}

.ad-overlay__bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ad-overlay__badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ad-overlay__countdown {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.02em;
  opacity: 0.8;
}

.ad-overlay__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 4px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
  transition: background 0.15s;
}
.ad-overlay__btn:hover {
  background: rgba(0, 0, 0, 0.8);
}
.ad-overlay__btn svg {
  width: 11px;
  height: 11px;
}
</style>
