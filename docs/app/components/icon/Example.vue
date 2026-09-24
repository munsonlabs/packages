<script setup lang="ts">
/** Renders a row of <ml-sigil-icon>s. Each name may carry its own library and variant as `name@library:variant`. */
const props = withDefaults(defineProps<{ names: string; library?: string; variant?: string; toggle?: boolean }>(), {
  library: undefined,
  variant: undefined,
  toggle: false,
})
const { ready, failed } = useIconDemo()
const active = ref(false)

const items = computed(() =>
  props.names
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [nameAndLibrary, variant] = entry.split(':')
      const [name, library] = nameAndLibrary.split('@')
      return { key: entry, name, library: library ?? props.library, variant: variant ?? props.variant }
    }),
)
</script>

<template>
  <IconDemoFrame :ready="ready" :failed="failed">
    <div class="icon-demo__row">
      <ml-sigil-icon
        v-for="item in items"
        :key="item.key"
        :name="item.name"
        :library="item.library"
        :variant="active ? 'active' : item.variant"
      ></ml-sigil-icon>
    </div>
    <template v-if="toggle" #after>
      <UButton block size="sm" color="neutral" variant="outline" class="icon-demo__action" @click="active = !active">
        {{ active ? 'Deactivate' : 'Activate' }}
      </UButton>
    </template>
  </IconDemoFrame>
</template>
