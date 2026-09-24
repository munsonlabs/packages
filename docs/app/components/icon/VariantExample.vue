<script setup lang="ts">
/** One <ml-sigil-icon> whose `variant` flips between undefined and 'active'. */
const { ready, failed } = useIconDemo()
const active = ref(false)
</script>

<template>
  <IconDemoFrame :ready="ready" :failed="failed">
    <div class="icon-demo__row icon-demo__row--center">
      <ml-sigil-icon name="favourite" library="toggle" :variant="active ? 'active' : undefined"></ml-sigil-icon>
      <code>&lt;ml-sigil-icon name="favourite" library="toggle"{{ active ? ' variant="active"' : '' }}&gt;</code>
    </div>
    <template #after>
      <UButton block size="sm" color="neutral" variant="outline" class="icon-demo__action" @click="active = !active">
        {{ active ? 'Deactivate' : 'Activate' }}
      </UButton>
    </template>
  </IconDemoFrame>
</template>
