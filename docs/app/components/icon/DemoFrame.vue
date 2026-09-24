<script setup lang="ts">
/** Shared chrome for the icon examples: client-only, loading/failure states, sizing CSS. */
defineProps<{ ready: boolean; failed: boolean }>()
</script>

<template>
  <div class="icon-demo my-5">
    <figure class="m-0 rounded-md border border-muted bg-muted p-4">
      <ClientOnly>
        <slot v-if="ready" />
        <p v-else-if="failed" class="icon-demo__status">Could not load <code>@munsonlabs/sigil</code> from the workspace build.</p>
        <p v-else class="icon-demo__status">Loading…</p>
        <template #fallback>
          <p class="icon-demo__status">Loading…</p>
        </template>
      </ClientOnly>
    </figure>
    <slot name="after" />
  </div>
</template>

<style>
.icon-demo__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}
.icon-demo__row--center {
  align-items: center;
}
.icon-demo__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 4rem;
}
.icon-demo__cell code {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
.icon-demo__action {
  margin-top: 0.75rem;
}
.icon-demo ml-sigil-icon,
.icon-demo .icon-demo__vue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--ui-primary);
}
.icon-demo ml-sigil-icon .icon-svg,
.icon-demo ml-sigil-icon svg,
.icon-demo .icon-demo__vue svg {
  display: block;
  width: 100%;
  height: 100%;
}
.icon-demo .icon-svg.icon-demo__vue {
  display: inline-flex;
}
.icon-demo .demo-glyph,
.icon-demo .demo-material {
  font-size: 2rem;
  line-height: 1;
}
.icon-demo__status {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}
</style>
