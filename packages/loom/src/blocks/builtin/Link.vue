<script>
export const spec = {
  type: 'Link',
  label: 'Link',
  icon: 'i-lucide-link',
  description: 'An anchor to a URL.',
  container: false,
  clickable: true,
  props: {
    text: { type: 'string', label: 'Text', default: 'Read more', accepts: ['string', 'number'] },
    href: { type: 'string', label: 'URL', default: '', accepts: ['string'] },
  },
}
</script>

<script setup>
import { blockProps, isBlank, toText } from './shared'

defineOptions({ name: 'LoomLink' })
const props = defineProps(blockProps(spec))
</script>

<template>
  <a v-if="!isBlank(props.text)" class="w-link" :href="props.href || undefined" v-text="toText(props.text)" />
</template>

<style>
.w-link {
  color: var(--w-link);
  font-weight: var(--w-weight-medium);
  text-decoration: none;
}

.w-link:hover {
  text-decoration: underline;
}
</style>
