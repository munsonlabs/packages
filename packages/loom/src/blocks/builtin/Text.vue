<script>
export const spec = {
  type: 'Text',
  label: 'Text',
  icon: 'i-lucide-type',
  description: 'A run of text in one of the type styles.',
  container: false,
  clickable: true,
  props: {
    text: { type: 'string', label: 'Text', default: 'Text', accepts: ['string', 'number'] },
    variant: { type: 'enum', label: 'Style', options: ['title', 'subtitle', 'body', 'caption', 'kicker'], default: 'body' },
    lines: { type: 'number', label: 'Max lines', default: 0 },
    prefix: { type: 'string', label: 'Prefix', default: '' },
    suffix: { type: 'string', label: 'Suffix', default: '' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps, isBlank, toText } from './shared'

defineOptions({ name: 'LoomText' })
const props = defineProps(blockProps(spec))

const tag = computed(() => (props.variant === 'title' ? 'h3' : props.variant === 'subtitle' ? 'h4' : 'p'))
const lines = computed(() => Number(props.lines))
const content = computed(() => toText(props.prefix) + toText(props.text) + toText(props.suffix))
</script>

<template>
  <component
    :is="tag"
    v-if="!isBlank(props.text)"
    class="w-text"
    :class="[`is-${toText(props.variant)}`, { 'is-clamped': lines > 0 }]"
    :style="lines > 0 ? { WebkitLineClamp: lines } : undefined"
    v-text="content"
  />
</template>

<style>
.w-text {
  margin: 0;
  font-size: var(--w-body-size);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.w-text.is-title {
  font-family: var(--w-title-font);
  font-size: var(--w-title-size);
  font-weight: var(--w-title-weight);
  line-height: 1.2;
}

.w-text.is-subtitle {
  font-size: var(--w-subtitle-size);
  font-weight: var(--w-weight-medium);
  line-height: 1.3;
}

.w-text.is-caption {
  font-size: var(--w-caption-size);
  color: var(--w-muted);
}

.w-text.is-kicker {
  font-size: var(--w-caption-size);
  font-weight: var(--w-weight-bold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--w-accent);
}

.w-text.is-clamped {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
