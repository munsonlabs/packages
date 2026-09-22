<script setup lang="ts">
import { inject } from 'vue'
import { PlayerKey, PlaylistKey, HudKey, ActionKey, injectStrict } from '@/ui/player/playerContext'
import { usePlayerAction } from '@/ui/overlay/usePlayerAction'
import { cyclePlaybackRate, playbackRateLabel, cycleCaptionTrack, captionTrackLabel, cycleQuality, qualityLabel } from '@/utils/playerActions'
import Icon from '@/ui/shared/Icon.vue'
import MoreMenuRow from '@/ui/overlay/MoreMenuRow.vue'

defineProps<{ compact: boolean }>()

defineEmits<{ back: [] }>()

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
const playlist = injectStrict(PlaylistKey)
const { isCustom, customAction } = usePlayerAction(inject(ActionKey, undefined), player, playlist)
</script>

<template>
  <div class="controls__more-header">
    <button class="controls__btn" aria-label="Back" @click="$emit('back')">
      <Icon name="back" />
    </button>
    <span class="controls__more-label">More</span>
  </div>

  <div class="controls__more-body" @touchstart.passive="hud.keepOpen()">
    <MoreMenuRow
      v-if="player.supportsPlaybackRate"
      label="Playback speed"
      :value="playbackRateLabel(player.currentPlaybackRate)"
      @click="cycleRate"
    />

    <MoreMenuRow
      label="Loop"
      aria-label="Toggle loop"
      icon="loop"
      :active="player.isLooping"
      :value="player.isLooping ? 'On' : 'Off'"
      @click="player.toggleLoop()"
    />

    <MoreMenuRow
      v-if="player.supportsCaptions"
      label="Captions"
      icon="captions"
      :active="player.activeCaptionIndex !== null"
      :value="captionTrackLabel(player)"
      @click="cycleCaptionTrack"
    />

    <MoreMenuRow
      v-if="player.supportsQuality"
      label="Quality"
      icon="quality"
      :active="!player.isAutoQuality"
      :value="qualityLabel(player)"
      @click="cycleQuality"
    />

    <MoreMenuRow
      v-if="playlist.hasPlaylist"
      label="Autoplay next"
      aria-label="Toggle autoplay next"
      icon="skip-next"
      :active="playlist.autoAdvance"
      :value="playlist.autoAdvance ? 'On' : 'Off'"
      @click="playlist.toggleAutoAdvance()"
    />

    <MoreMenuRow
      v-if="compact && player.supportsPip"
      label="Picture-in-picture"
      aria-label="Toggle picture-in-picture"
      icon="pip"
      :active="player.isPipActive"
      @click="player.togglePip()"
    />

    <MoreMenuRow v-if="compact && playlist.hasNext" label="Play next" aria-label="Play next" icon="skip-next" @click="playlist.playNext()" />

    <MoreMenuRow
      v-if="compact"
      label="Mute"
      aria-label="Toggle mute"
      :icon="player.isAudible ? 'volume-on' : 'volume-mute'"
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

.controls__more-body {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
  min-height: 0;
  overflow-y: auto;
}
</style>
