<template>
  <UButton :to="appConfig.socials.npm" icon="i-simple-icons-npm" variant="ghost" color="neutral" target="_blank" aria-label="npm" />
</template>

<script setup lang="ts">
const appConfig = useAppConfig() as any
</script>
