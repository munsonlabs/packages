<template>
  <UButton to="/contributors" icon="i-lucide-users" variant="ghost" color="neutral" aria-label="Contributors" />
  <UButton :to="appConfig.socials.npm" icon="i-simple-icons-npm" variant="ghost" color="neutral" target="_blank" aria-label="npm" />
</template>

<script setup lang="ts">
const appConfig = useAppConfig() as any
</script>
