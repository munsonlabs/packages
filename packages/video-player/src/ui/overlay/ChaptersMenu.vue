<script setup lang="ts">
import { computed } from 'vue'
import { PlayerKey, HudKey, injectStrict } from '@/ui/player/playerContext'
import { findChapter } from '@/utils/chapters'
import { fmtTime } from '@/utils/time'
import Icon from '@/ui/shared/Icon.vue'
import MoreMenuRow from '@/ui/overlay/MoreMenuRow.vue'

defineEmits<{ back: [] }>()

const player = injectStrict(PlayerKey)
const hud = injectStrict(HudKey)
const currentChapter = computed(() => findChapter(player.chapters, player.currentTime))
</script>

<template>
  <div class="controls__more-header">
    <button type="button" class="controls__btn" aria-label="Back" @click="$emit('back')">
      <Icon name="back" />
    </button>
    <span class="controls__more-label">Chapters</span>
  </div>

  <div class="controls__more-body" @touchstart.passive="hud.keepOpen()">
    <MoreMenuRow
      v-for="chapter in player.chapters"
      :key="chapter.start"
      :label="chapter.title"
      :aria-label="`Go to chapter: ${chapter.title}`"
      :active="chapter.start === currentChapter?.start"
      :value="fmtTime(chapter.start)"
      @click="player.seek(chapter.start)"
    />
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
