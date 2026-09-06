<script setup lang="ts">
import { PlayerKey, PlaylistKey, HudKey, injectStrict } from '@/composables/player/playerContext'
import { usePlaybackRate } from '@/composables/overlay/usePlaybackRate'
import { useCaptions } from '@/composables/overlay/useCaptions'
import { useQuality } from '@/composables/overlay/useQuality'
import { IconBack, IconCaptions, IconLoop, IconQuality, IconSkipNext, IconPip, IconVolumeOn, IconVolumeMute } from '@/components/icons'
import MoreMenuRow from '@/components/overlay/MoreMenuRow.vue'
import type { CustomAction } from '@/types/player'

defineProps<{
  isCustom: boolean
  customAction: CustomAction | null
  compact: boolean
}>()

defineEmits<{ back: [] }>()

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
const playlist = injectStrict(PlaylistKey)
const { cycleRate, fmtRate } = usePlaybackRate(player)
const { cycleCaptionTrack, currentCaptionLabel } = useCaptions(player)
const { cycleQuality, currentQualityLabel } = useQuality(player)
</script>

<template>
  <div class="controls__more-header">
    <button class="controls__btn" aria-label="Back" @click="$emit('back')">
      <IconBack />
    </button>
    <span class="controls__more-label">More</span>
  </div>

  <div class="controls__more-body" @touchstart.passive="hud.keepOpen()">
    <MoreMenuRow v-if="player.supportsPlaybackRate" label="Playback speed" :value="fmtRate(player.currentPlaybackRate)" @click="cycleRate" />

    <MoreMenuRow
      label="Loop"
      aria-label="Toggle loop"
      :icon="IconLoop"
      :active="player.isLooping"
      :value="player.isLooping ? 'On' : 'Off'"
      @click="player.toggleLoop()"
    />

    <MoreMenuRow
      v-if="player.supportsCaptions"
      label="Captions"
      :icon="IconCaptions"
      :active="player.activeCaptionIndex !== null"
      :value="currentCaptionLabel()"
      @click="cycleCaptionTrack"
    />

    <MoreMenuRow
      v-if="player.supportsQuality"
      label="Quality"
      :icon="IconQuality"
      :active="!player.isAutoQuality"
      :value="currentQualityLabel()"
      @click="cycleQuality"
    />

    <MoreMenuRow
      v-if="playlist.hasPlaylist"
      label="Autoplay next"
      aria-label="Toggle autoplay next"
      :icon="IconSkipNext"
      :active="playlist.autoAdvance"
      :value="playlist.autoAdvance ? 'On' : 'Off'"
      @click="playlist.toggleAutoAdvance()"
    />

    <MoreMenuRow
      v-if="compact && player.supportsPip"
      label="Picture-in-picture"
      aria-label="Toggle picture-in-picture"
      :icon="IconPip"
      :active="player.isPipActive"
      @click="player.togglePip()"
    />

    <MoreMenuRow v-if="compact && playlist.hasNext" label="Play next" aria-label="Play next" :icon="IconSkipNext" @click="playlist.playNext()" />

    <MoreMenuRow
      v-if="compact"
      label="Mute"
      aria-label="Toggle mute"
      :icon="player.isAudible ? IconVolumeOn : IconVolumeMute"
      :active="!player.isAudible"
      @click="player.toggleMute()"
    />

    <MoreMenuRow v-if="isCustom && customAction" :label="customAction.label" :icon-html="customAction.icon" @click="customAction.onClick()" />
  </div>
</template>

<style scoped>
.controls__more-header {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.controls__more-label {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  padding: 0 4px;
}

/* min-height: 0 overrides the flex item default, or overflow-y: auto never gets a chance to engage. */
.controls__more-body {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
  min-height: 0;
  overflow-y: auto;
}
</style>
