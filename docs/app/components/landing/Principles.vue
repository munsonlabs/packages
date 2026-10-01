<script setup lang="ts">
const PRINCIPLES = [
  {
    icon: 'i-lucide-package',
    title: 'Install one, get one',
    body: 'No package pulls in another’s runtime unless it says so. The video player depends on sigil for its icons, and that’s the only link.',
  },
  {
    icon: 'i-lucide-git-branch',
    title: 'Versioned on their own',
    body: 'Each package has its own changelog and semver, released through Changesets. A sigil fix never bumps the player.',
  },
  {
    icon: 'i-lucide-box',
    title: 'Framework-free where it can be',
    body: 'Sigil runs anywhere as a custom element or plain JS. Vue bindings sit on separate entry points.',
  },
]
</script>

<template>
  <LandingSection eyebrow="How they’re made" title="One repo, no shared baggage">
    <div class="grid gap-4 md:grid-cols-3">
      <UPageCard v-for="item in PRINCIPLES" :key="item.title" :icon="item.icon" :title="item.title" :description="item.body" />
    </div>
  </LandingSection>
</template>
