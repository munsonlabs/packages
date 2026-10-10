<script>
export const spec = {
  type: 'Icon',
  label: 'Icon',
  icon: 'i-lucide-smile',
  description: 'An icon by name, from the icon libraries registered with sigil.',
  container: false,
  clickable: true,
  props: {
    name: { type: 'string', label: 'Icon', default: 'star', accepts: ['string'] },
    library: { type: 'string', label: 'Library', default: '' },
    size: { type: 'string', label: 'Size', default: 'var(--w-body-size)', tokenScale: 'text' },
    color: { type: 'string', label: 'Colour', default: 'currentColor', tokenScale: 'color' },
    label: { type: 'string', label: 'Accessible label', default: '', accepts: ['string'] },
  },
}
</script>

<script setup>
import { Sigil } from '@munsonlabs/sigil/vue'

/** A sigil icon in a span that keeps the node's attrs, so it's selectable before the icon loads. */
defineOptions({ name: 'LoomIcon' })
const props = defineProps({
  name: { type: String, default: '' },
  library: { type: String, default: '' },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  label: { type: String, default: '' },
})
</script>

<template>
  <span
    v-if="props.name"
    class="w-icon"
    :style="{ fontSize: props.size || undefined, color: props.color || undefined }"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label || undefined"
    :aria-hidden="props.label ? undefined : 'true'"
  >
    <Sigil :name="props.name" :library="props.library || undefined" />
  </span>
</template>

<style>
.w-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  align-self: center;
  line-height: 1;
}

.w-icon svg {
  width: 1em;
  height: 1em;
}
</style>
