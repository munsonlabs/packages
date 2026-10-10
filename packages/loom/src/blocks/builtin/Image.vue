<script>
export const spec = {
  type: 'Image',
  label: 'Image',
  icon: 'i-lucide-image',
  description: 'A lazily loaded image at a fixed aspect ratio.',
  container: false,
  props: {
    src: { type: 'string', label: 'Source', default: '', accepts: ['string'] },
    alt: { type: 'string', label: 'Alt text', default: '', accepts: ['string'] },
    ratio: { type: 'enum', label: 'Ratio', options: ['16/9', '4/3', '1/1', '3/4', 'auto'], default: '16/9' },
    fit: { type: 'enum', label: 'Fit', options: ['cover', 'contain'], default: 'cover' },
  },
}
</script>

<script setup>
import { blockProps, isBlank } from './shared'

defineOptions({ name: 'LoomImage' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <div v-if="!isBlank(props.src)" class="w-image" :style="{ aspectRatio: props.ratio === 'auto' ? undefined : props.ratio }">
    <img :src="props.src" :alt="props.alt ?? ''" loading="lazy" :style="{ objectFit: props.fit }" />
  </div>
</template>

<style>
.w-image {
  position: relative;
  overflow: hidden;
  border-radius: var(--w-image-radius);
  background: var(--w-image-bg);
}

.w-image img {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
