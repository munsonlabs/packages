<template>
  <UButton :to="appConfig.socials.npm" icon="i-simple-icons-npm" variant="ghost" color="neutral" target="_blank" aria-label="npm" />
  <UButton :to="appConfig.github.url" target="_blank" icon="i-simple-icons-github" color="neutral" variant="ghost" aria-label="GitHub" />
</template>

<script setup lang="ts">
const appConfig = useAppConfig() as any
</script>
