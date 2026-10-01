<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <section class="landing-section">
    <UContainer class="landing-section__inner">
      <header>
        <span class="landing-section__eyebrow">{{ eyebrow }}</span>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </header>
      <slot />
    </UContainer>
  </section>
</template>

<style scoped>
.landing-section__inner {
  display: grid;
  gap: 28px;
  padding-block: 64px;
}

.landing-section__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ui-primary);
}

h2 {
  margin: 4px 0 0;
  font-size: clamp(1.625rem, 3.4vw, 2.125rem);
  line-height: 1.15;
  letter-spacing: -0.025em;
  font-weight: 700;
  color: var(--ui-text-highlighted);
  text-wrap: balance;
}

header p {
  margin: 6px 0 0;
  max-width: 60ch;
  color: var(--ui-text-muted);
}
</style>
