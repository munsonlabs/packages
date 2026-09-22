<script setup lang="ts">
import type { PlayerHandle } from '@munsonlabs/video-player'
import { useShortsParts } from '../parts'

defineProps<{ handle: PlayerHandle | null }>()
const uiHidden = defineModel<boolean>('uiHidden', { required: true })

const { MuteButton, CaptionsButton, Sigil } = useShortsParts()
</script>

<template>
  <div class="shorts__topbuttons">
    <MuteButton v-show="!uiHidden" :player="handle" class="shorts__mute" v-slot="{ isMuted }">
      <Sigil :name="isMuted ? 'volume-mute' : 'volume-on'" library="shorts" />
    </MuteButton>

    <CaptionsButton
      v-show="!uiHidden"
      :player="handle"
      class="shorts__captions"
      :class="{ 'shorts__captions--active': handle?.activeCaptionIndex !== null }"
    >
      <Sigil name="captions" library="shorts" />
    </CaptionsButton>

    <button class="shorts__clear" :aria-label="uiHidden ? 'Show player UI' : 'Hide player UI'" @click="uiHidden = !uiHidden">
      <Sigil :name="uiHidden ? 'eye' : 'eye-off'" library="shorts" />
    </button>
  </div>
</template>

<style scoped>
@import '../styles/topButtons.css';
</style>
