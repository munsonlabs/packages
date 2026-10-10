<script setup>
import { useStudio } from '../studio'

/** The issues button: a tick when the widget is valid, otherwise its problems, each one click from the element. */
const s = useStudio()
</script>

<template>
  <UPopover v-model:open="s.open.issues" :content="{ align: 'end', sideOffset: 8 }">
    <UButton
      :icon="s.errors ? 'i-lucide-triangle-alert' : 'i-lucide-check'"
      :label="s.issues.length ? String(s.issues.length) : undefined"
      size="sm"
      :color="s.errors ? 'error' : 'success'"
      variant="ghost"
      class="rounded-full"
      :aria-label="s.issues.length ? `${s.issues.length} issues` : 'Valid'"
    />
    <template #content>
      <div class="flex w-96 flex-col gap-1 p-2">
        <p v-if="!s.issues.length" class="p-2 text-xs text-muted">Valid: this widget renders as written, in every variant.</p>
        <button
          v-for="(issue, i) in s.issues"
          :key="i"
          type="button"
          class="flex items-start gap-1.5 rounded px-2 py-1 text-left text-xs text-error hover:bg-error/10"
          @click="s.selectIssue(issue)"
        >
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-3 shrink-0" />
          <span>
            <UBadge v-if="issue.variant" :label="s.variants.variantLabel(issue.variant)" color="warning" variant="subtle" size="sm" class="mr-1" />
            <code v-if="issue.nodeId">#{{ issue.nodeId }}</code> {{ issue.message }}
          </span>
        </button>
      </div>
    </template>
  </UPopover>
</template>
