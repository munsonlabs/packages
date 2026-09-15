<script setup lang="ts">
import { VideoStage, VideoCard } from '@munsonlabs/video-player'
import type { VideoEntry, StateChangeEvent } from '@munsonlabs/video-player'
import { useDemoSettings } from '../composables/useDemoSettings'
import { useEventLog } from '../composables/useEventLog'

withDefaults(
  defineProps<{
    heading: string
    dotVariant?: 'default' | 'ad' | 'prebid' | 'captions' | 'quality'
    videos: VideoEntry[]
    showStage?: boolean
    description?: string
  }>(),
  { dotVariant: 'default', showStage: false, description: '' },
)

const { webComponents, lazy, nativeUi, disableTapCapture, actionSave, currentAction, saveActionFor, pin } = useDemoSettings()
const { addLog } = useEventLog()

function onStateChange(e: StateChangeEvent | CustomEvent): void {
  addLog(e instanceof CustomEvent ? e.detail[0] : e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading">
      <span class="panel__heading-dot" :class="dotVariant !== 'default' ? `panel__heading-dot--${dotVariant}` : ''" />{{ heading }}
    </h2>
    <p v-if="description" class="panel__description">{{ description }}</p>
    <component :is="webComponents ? 'ml-video-stage' : VideoStage" v-if="showStage" :pin="pin" :playlist="videos" @state-change="onStateChange" />
    <div class="playlist__grid" :class="{ 'playlist__grid--compact': showStage }">
      <div v-for="(video, i) in videos" :key="`${video.src}-${i}`" class="video-card">
        <component
          :is="webComponents ? 'ml-video-card' : VideoCard"
          v-bind="video"
          :lazy="lazy"
          :native-ui="nativeUi"
          :controls="true"
          :disable-tap-capture="disableTapCapture"
          :action="actionSave ? saveActionFor(video.src) : currentAction"
          @state-change="onStateChange"
        />
      </div>
    </div>
  </section>
</template>
