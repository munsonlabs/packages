<script setup lang="ts">
const EXPERIMENTS: Array<{ name: string; status: string; icon: string; description: string; to: string }> = [
  {
    name: 'Splice',
    status: 'on main · not yet on npm',
    icon: 'i-lucide-scissors',
    to: '/splice/getting-started/introduction',
    description:
      'In-browser clip making with WebCodecs: trim, crop to 9:16, burn in captions, stamp your logo and add an end card that sends viewers back to the article. Plus a “clip this” editor.',
  },
]
</script>

<template>
  <LandingSection
    eyebrow="In the lab"
    title="What’s being built next"
    description="Early packages, still settling. The APIs will move before a first release."
  >
    <div class="grid gap-4 md:grid-cols-2">
      <UPageCard v-for="item in EXPERIMENTS" :key="item.name" :icon="item.icon" :description="item.description" :to="item.to">
        <template #title>
          <span class="flex flex-wrap items-center gap-2">
            {{ item.name }}
            <UBadge color="primary" variant="subtle" size="sm" icon="i-lucide-flask-conical">Experimental</UBadge>
          </span>
        </template>
        <template #footer>
          <span class="font-mono text-xs text-muted">{{ item.status }}</span>
        </template>
      </UPageCard>
    </div>
  </LandingSection>
</template>
