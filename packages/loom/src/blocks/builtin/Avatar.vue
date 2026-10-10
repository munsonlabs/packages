<script>
export const spec = {
  type: 'Avatar',
  label: 'Avatar',
  icon: 'i-lucide-circle-user-round',
  description: 'A round picture of a person, or their initials when there is none.',
  container: false,
  clickable: true,
  props: {
    src: { type: 'string', label: 'Picture', default: '', accepts: ['string'] },
    name: { type: 'string', label: 'Name', default: '', accepts: ['string'] },
    size: { type: 'enum', label: 'Size', options: ['sm', 'md', 'lg'], default: 'md' },
  },
}
</script>

<script setup>
import { computed } from 'vue'
import { blockProps, isBlank, toText } from './shared'

/** A photo, or the name's initials when there isn't one. */
defineOptions({ name: 'LoomAvatar' })
const props = defineProps(blockProps(spec))

const size = computed(() => (props.size === 'sm' || props.size === 'lg' ? props.size : 'md'))
const label = computed(() => toText(props.name))
const initials = computed(() =>
  label.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join(''),
)
</script>

<template>
  <span v-if="!isBlank(props.src) || label" class="w-avatar" :class="`is-${size}`" role="img" :aria-label="label || undefined">
    <img v-if="!isBlank(props.src)" :src="props.src" alt="" loading="lazy" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<style>
.w-avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  overflow: hidden;
  border-radius: var(--w-radius-full);
  background: var(--w-surface);
  color: var(--w-muted);
  font-weight: var(--w-weight-bold);
}

.w-avatar.is-sm {
  width: 24px;
  height: 24px;
  font-size: var(--w-text-xs);
}

.w-avatar.is-md {
  width: 36px;
  height: 36px;
  font-size: var(--w-text-sm);
}

.w-avatar.is-lg {
  width: 48px;
  height: 48px;
  font-size: var(--w-text-md);
}

.w-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
