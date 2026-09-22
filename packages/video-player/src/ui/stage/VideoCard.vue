<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { hasStage } from '@/registries/stageRegistry'
import { dispatchStageEvent } from '@/ui/stage/useStageBus'
import { useForwardedPlayer } from '@/ui/player/useForwardedPlayer'
import { WIN_VIDEO_SELECT } from '@/constants'
import { resolveGestureMuted } from '@/preferences/audioPreference'
import VideoPlaceholder from '@/ui/stage/VideoPlaceholder.vue'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'
import type { StateChangeEvent, VideoEntry } from '@/types/player'

const props = withDefaults(defineProps<VideoEntry>(), {
  lazy: true,
  action: null,
  muted: undefined,
  controls: undefined,
})

const emit = defineEmits<{ 'state-change': [event: StateChangeEvent] }>()

const activated = ref(false)

const userActivated = ref(false)

function onPlaceholderClick(): void {
  userActivated.value = true
  activated.value = true
}

async function ensureMounted(): Promise<void> {
  if (activated.value) return
  activated.value = true
  await nextTick()
}

const { playerRef, forwarded } = useForwardedPlayer(async (key) => {
  if (hasStage.value) {
    if (key === 'togglePlay')
      dispatchStageEvent(WIN_VIDEO_SELECT, { ...props, fromGesture: true, autoplay: true, muted: resolveGestureMuted(props.muted) })
    return false
  }
  await ensureMounted()
  return true
})

defineExpose(forwarded)
</script>

<template>
  <VideoPlaceholder v-if="hasStage" v-bind="props" />
  <template v-else>
    <VideoPlaceholder
      v-if="props.lazy && !activated && !props.autoplay"
      v-bind="props"
      @click.capture="onPlaceholderClick"
      @enter-view="activated = true"
    />
    <VideoPlayer
      v-else
      ref="playerRef"
      v-bind="props"
      :autoplay="activated || props.autoplay"
      :muted="resolveGestureMuted(props.muted, userActivated)"
      @state-change="emit('state-change', $event)"
    >
      <slot />
    </VideoPlayer>
  </template>
</template>
