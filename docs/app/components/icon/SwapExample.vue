<script setup lang="ts">
/** Three icons rendered from lucide; a "publisher script" registers overrides for the same names, live. */
const { ready, failed } = useIconDemo()
const swapped = ref(false)
const names = Object.keys(BRAND_OVERRIDES)

async function run() {
  const { override } = await import('@munsonlabs/sigil')
  override(swapped.value ? Object.fromEntries(names.map((name) => [name, null])) : BRAND_OVERRIDES)
  swapped.value = !swapped.value
}
</script>

<template>
  <IconDemoFrame :ready="ready" :failed="failed">
    <div class="icon-demo__row">
      <ml-sigil v-for="name in names" :key="name" :name="name" library="lucide"></ml-sigil>
    </div>
    <template #after>
      <UButton block size="sm" color="neutral" variant="outline" class="icon-demo__action" @click="run">
        {{ swapped ? 'Remove overrides' : 'Run publisher script' }}
      </UButton>
    </template>
  </IconDemoFrame>
</template>
