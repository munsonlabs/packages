<script setup lang="ts">
/** The Vue <Sigil> against the same registry: an override, a lucide SVG, and a JSON-map icon whose variant is bound to state. */
import type { Component } from 'vue'

const { ready, failed } = useIconDemo()
const Sigil = shallowRef<Component>()
const active = ref(false)

onMounted(async () => {
  const vue = await import('@munsonlabs/sigil/vue')
  Sigil.value = vue.Sigil
})
</script>

<template>
  <IconDemoFrame :ready="ready && !!Sigil" :failed="failed">
    <div class="icon-demo__row">
      <component :is="Sigil" name="heart" class="icon-demo__vue" />
      <component :is="Sigil" name="rocket" library="lucide" class="icon-demo__vue" />
      <component :is="Sigil" name="bookmark" library="json" :variant="active ? 'active' : undefined" class="icon-demo__vue" />
    </div>
    <template #after>
      <UButton block size="sm" color="neutral" variant="outline" class="icon-demo__action" @click="active = !active">
        {{ active ? 'Deactivate' : 'Activate' }}
      </UButton>
    </template>
  </IconDemoFrame>
</template>
