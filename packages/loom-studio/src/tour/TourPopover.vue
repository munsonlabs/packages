<script setup>
import { useStudio } from '../studio'

/** The tour's card, beside whatever the current step points at. */
const s = useStudio()
</script>

<template>
  <UPopover
    :open="s.tour.open"
    :reference="s.tour.reference"
    :dismissible="false"
    :modal="false"
    :content="{ side: s.tour.step?.side ?? 'bottom', sideOffset: 14, collisionPadding: 16 }"
  >
    <template #content>
      <div v-if="s.tour.step" class="w-80 p-4" role="dialog" aria-live="polite">
        <div class="mb-1 flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-lucide-sparkles" class="size-3.5 text-primary" />
          Tour · {{ s.tour.index + 1 }} of {{ s.tour.total }}
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            class="-my-1 ml-auto"
            aria-label="End the tour"
            @click="s.tour.finish"
          />
        </div>
        <h3 class="text-sm font-semibold text-highlighted">{{ s.tour.step.title }}</h3>
        <p class="mt-1 text-sm text-muted">{{ s.tour.step.body }}</p>
        <ul v-if="s.tour.step.tips?.length" class="mt-2 flex flex-col gap-1 text-xs text-muted">
          <li v-for="tip in s.tour.step.tips" :key="tip" class="flex gap-1.5">
            <UIcon name="i-lucide-corner-down-right" class="mt-0.5 size-3 shrink-0 text-dimmed" />
            {{ tip }}
          </li>
        </ul>
        <div class="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
          <div class="h-full rounded-full bg-primary transition-[width]" :style="{ width: `${((s.tour.index + 1) / s.tour.total) * 100}%` }" />
        </div>
        <div class="mt-3 flex items-center gap-2">
          <UButton v-if="s.tour.hasNext" label="Skip" size="xs" color="neutral" variant="link" @click="s.tour.finish" />
          <div class="ml-auto flex gap-1.5">
            <UButton v-if="s.tour.hasPrev" label="Back" size="xs" color="neutral" variant="soft" @click="s.tour.prev" />
            <UButton v-if="s.tour.hasNext" label="Next" trailing-icon="i-lucide-arrow-right" size="xs" @click="s.tour.next" />
            <UButton v-else label="Start building" size="xs" @click="s.tour.finish" />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
