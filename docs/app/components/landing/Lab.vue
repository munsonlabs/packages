<script setup lang="ts">
const EXPERIMENTS: Array<{ name: string; branch: string; icon: string; description: string; to?: string }> = [
  {
    name: 'Reel',
    branch: 'idea/reel',
    icon: 'i-lucide-clapperboard',
    to: '/reel/getting-started/introduction',
    description:
      'In-browser clip making with WebCodecs: trim, crop to 9:16, burn in captions, stamp your logo and add an end card that sends viewers back to the article. Plus a “clip this” picker.',
  },
  {
    name: 'Blueprint',
    branch: 'blueprint-layers',
    icon: 'i-lucide-layers',
    description:
      'Composable UI blueprints: headless logic plus an ordered tree of named parts. A script loaded later can reorder, wrap or replace parts without copying the logic.',
  },
  {
    name: 'Dye',
    branch: 'dye-layers',
    icon: 'i-lucide-palette',
    description:
      'Runtime styling through CSS variables. Declare --article-headline-color and dye writes the rule that lands it on the matching blueprint part.',
  },
]
</script>

<template>
  <LandingSection
    eyebrow="In the lab"
    title="What’s being built next"
    description="Early packages on their own branches. The APIs will move before a first release."
  >
    <div class="grid gap-4 md:grid-cols-3">
      <UPageCard
        v-for="item in EXPERIMENTS"
        :key="item.name"
        :icon="item.icon"
        :description="item.description"
        :to="item.to ?? `https://github.com/munsonlabs/packages/tree/${item.branch}`"
        :target="item.to ? undefined : '_blank'"
      >
        <template #title>
          <span class="flex flex-wrap items-center gap-2">
            {{ item.name }}
            <UBadge color="primary" variant="subtle" size="sm" icon="i-lucide-flask-conical">Experimental</UBadge>
          </span>
        </template>
        <template #footer>
          <span class="font-mono text-xs text-muted">branch · {{ item.branch }}</span>
        </template>
      </UPageCard>
    </div>
  </LandingSection>
</template>
