<script setup lang="ts">
import { Sigil } from '@munsonlabs/sigil/vue'
import { registerIcons } from '@/icons'

/**
 * One of the player's icons by short name (`play`, `pause`, `volume-on`, …), resolved through the shared
 * sigil registry as `mlv-<name>` from the `mlv` library. Because it goes through the registry, a page can
 * replace any of them - `override('mlv-play', svg)` - and every mounted player follows without a rebuild.
 */
defineProps<{ name: string }>()

registerIcons()
</script>

<template>
  <Sigil :name="`mlv-${name}`" library="mlv" class="mlv-icon" />
</template>

<style scoped>
/* The wrapper takes no part in layout, so the player's existing `… svg` sizing rules apply unchanged. */
.mlv-icon {
  display: contents;
}
</style>
