<script>
export const spec = {
  type: 'Video',
  label: 'Video',
  icon: 'i-lucide-clapperboard',
  description: 'A video player for MP4, HLS, DASH, YouTube, Vimeo and more. Shows its poster until played.',
  container: false,
  props: {
    src: { type: 'string', label: 'Source', default: '', accepts: ['string'] },
    poster: { type: 'string', label: 'Poster', default: '', accepts: ['string'] },
    label: { type: 'string', label: 'Label', default: '', accepts: ['string'] },
    ratio: { type: 'enum', label: 'Ratio', options: ['16:9', '4:3', '1:1', '9:16'], default: '16:9' },
    playInView: { type: 'boolean', label: 'Play in view (muted)', default: false },
    muted: { type: 'boolean', label: 'Muted', default: false },
    loop: { type: 'boolean', label: 'Loop', default: false },
  },
}
</script>

<script setup>
import { VideoCard } from '@munsonlabs/video-player'

/** A lazy `VideoCard` from `@munsonlabs/video-player`: a poster until it's played or scrolled into view. */
defineOptions({ name: 'LoomVideo' })
const props = defineProps({
  src: { type: String, default: '' },
  poster: { type: String, default: '' },
  label: { type: String, default: '' },
  ratio: { type: String, default: '16:9' },
  playInView: { type: Boolean, default: false },
  muted: { type: Boolean, default: false },
  loop: { type: Boolean, default: false },
})
</script>

<template>
  <div v-if="props.src" class="w-video">
    <VideoCard
      :key="props.src"
      :src="props.src"
      :poster="props.poster || undefined"
      :label="props.label || undefined"
      :aspect-ratio="props.ratio"
      :play-in-view="props.playInView"
      :muted="props.playInView || props.muted || undefined"
      :loop="props.loop"
    />
  </div>
</template>

<style>
.w-video {
  overflow: hidden;
  border-radius: var(--w-image-radius);
  background: #000;
}
</style>
