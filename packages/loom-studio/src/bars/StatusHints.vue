<script setup>
import { BASE_VARIANT } from '@munsonlabs/loom/editor'
import { useStudio } from '../studio'

/** Top centre: what clicking does right now, and a banner while a variant is being edited. */
const s = useStudio()
</script>

<template>
  <p class="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-xs text-dimmed">
    <template v-if="s.preview.mode === 'edit'"
      >Click anything to edit it · drag to move it · <UKbd value="meta" /> <UKbd value="k" /> for everything</template
    >
    <template v-else>Trying it: clicks run the widget's actions</template>
  </p>

  <div
    v-if="s.variants.variant"
    class="absolute top-12 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-warning/15 py-1 pr-1 pl-3 text-xs text-warning"
  >
    <span
      >Editing <strong>{{ s.variants.variant.label }}</strong
      >: changes are saved as overrides; delete hides.</span
    >
    <UButton label="Back to base" size="xs" color="warning" variant="soft" class="rounded-full" @click="s.variants.variantId = BASE_VARIANT" />
  </div>
</template>
