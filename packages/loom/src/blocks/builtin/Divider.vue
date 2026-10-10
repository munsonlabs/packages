<script>
export const spec = {
  type: 'Divider',
  label: 'Divider',
  icon: 'i-lucide-minus',
  description: 'A horizontal rule.',
  container: false,
  props: {},
}
</script>

<script setup>
defineOptions({ name: 'LoomDivider' })
</script>

<template>
  <hr class="w-divider" />
</template>

<style>
.w-divider {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--w-border);
}
</style>
