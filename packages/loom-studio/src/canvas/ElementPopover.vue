<script setup>
import { computed } from 'vue'
import Inspector from '../panels/inspector/Inspector.vue'
import { iconFor } from '../panels/options'
import { useStudio } from '../studio'

/**
 * The editor that opens beside whatever was clicked: a breadcrumb up to its containers, a note
 * when it isn't on screen, the tree actions (add, move, nest, duplicate, delete or hide), and
 * the Inspector's tabs.
 */
const s = useStudio()

const spec = computed(() => (s.selection.selected ? s.props.kit.blocks[s.selection.selected.type] : undefined))
const resetField = (field) => s.selection.selectedId && s.variants.resetField(s.selection.selectedId, field)
</script>

<template>
  <UPopover
    v-model:open="s.selection.popoverOpen"
    :reference="s.selection.selectedEl"
    :modal="false"
    :content="{ side: 'right', align: 'start', sideOffset: 14, collisionPadding: 12 }"
  >
    <template #content>
      <div v-if="s.selection.selected && spec" class="w-[22rem]">
        <div class="flex items-center gap-1 border-b border-default px-2 py-1.5">
          <nav class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-xs" aria-label="Path">
            <template v-for="(crumb, i) in s.selection.crumbs" :key="crumb.id">
              <UIcon v-if="i" name="i-lucide-chevron-right" class="size-3 shrink-0 text-dimmed" />
              <button
                type="button"
                class="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 hover:bg-elevated"
                :class="crumb.id === s.selection.selectedId ? 'font-semibold text-default' : 'text-muted'"
                @click="s.selection.select(crumb.id)"
              >
                <UIcon v-if="crumb.id === s.selection.selectedId" :name="iconFor(s.props.kit, crumb.type)" class="size-3.5 text-primary" />
                {{ crumb.id === s.selection.selectedId ? spec.label : `#${crumb.id}` }}
              </button>
            </template>
          </nav>
          <UPopover :content="{ align: 'end' }" mode="hover" :open-delay="300">
            <UButton icon="i-lucide-info" size="xs" color="neutral" variant="ghost" aria-label="About this block" />
            <template #content>
              <p class="w-60 p-2 text-xs text-muted">
                {{ spec.description }} <code class="text-dimmed">#{{ s.selection.selectedId }}</code>
              </p>
            </template>
          </UPopover>
        </div>

        <div v-if="s.selection.offscreen" class="flex items-center gap-2 border-b border-default bg-warning/10 px-3 py-2 text-xs text-warning">
          <UIcon name="i-lucide-eye-off" class="size-3.5 shrink-0" />
          <span v-if="s.selection.offscreen.kind === 'hidden'" class="flex-1">
            {{ s.selection.offscreen.self ? 'Hidden' : `Inside #${s.selection.offscreen.id}, which is hidden` }} in {{ s.variants.variant?.label }}.
          </span>
          <span v-else class="flex-1">Not shown for this data: its <em>Show when</em>, or an empty value, hides it.</span>
          <UButton
            v-if="s.selection.offscreen.kind === 'hidden'"
            label="Show"
            size="xs"
            color="warning"
            variant="soft"
            @click="s.variants.toggleHidden(s.selection.offscreen.id)"
          />
        </div>

        <div class="flex items-center gap-0.5 border-b border-default px-1.5 py-1">
          <UDropdownMenu
            v-if="!s.variants.variant"
            :items="
              spec.container
                ? [s.editing.blockOptions('auto'), [{ label: 'After this instead', type: 'label' }], s.editing.blockOptions('after')]
                : s.editing.blockOptions('after')
            "
          >
            <UButton :label="spec.container ? 'Add inside' : 'Add after'" icon="i-lucide-plus" size="xs" variant="soft" />
          </UDropdownMenu>
          <div class="ml-auto flex items-center">
            <UTooltip text="Move up" :kbds="['meta', 'arrowup']">
              <UButton
                icon="i-lucide-arrow-up"
                size="xs"
                color="neutral"
                variant="ghost"
                :disabled="s.selection.isRoot || s.selection.position <= 0"
                aria-label="Move up"
                @click="s.editing.moveBy(-1)"
              />
            </UTooltip>
            <UTooltip text="Move down" :kbds="['meta', 'arrowdown']">
              <UButton
                icon="i-lucide-arrow-down"
                size="xs"
                color="neutral"
                variant="ghost"
                :disabled="s.selection.isRoot || s.selection.position >= s.selection.siblings.length - 1"
                aria-label="Move down"
                @click="s.editing.moveBy(1)"
              />
            </UTooltip>
            <template v-if="!s.variants.variant">
              <UTooltip text="Into the container above">
                <UButton
                  icon="i-lucide-indent-increase"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :disabled="!s.editing.canIndent"
                  aria-label="Indent"
                  @click="s.editing.indent()"
                />
              </UTooltip>
              <UTooltip text="Out of its container">
                <UButton
                  icon="i-lucide-indent-decrease"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :disabled="!s.editing.canOutdent"
                  aria-label="Outdent"
                  @click="s.editing.outdent()"
                />
              </UTooltip>
              <UTooltip text="Duplicate" :kbds="['meta', 'd']">
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :disabled="s.selection.isRoot"
                  aria-label="Duplicate"
                  @click="s.editing.duplicate"
                />
              </UTooltip>
              <UTooltip text="Delete" :kbds="['backspace']">
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  :disabled="s.selection.isRoot"
                  aria-label="Delete"
                  @click="s.editing.remove"
                />
              </UTooltip>
            </template>
            <UTooltip v-else :text="s.selection.isHidden ? 'Show in this variant' : 'Hide in this variant'" :kbds="['backspace']">
              <UButton
                :icon="s.selection.isHidden ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                size="xs"
                color="warning"
                variant="ghost"
                :disabled="s.selection.isRoot"
                aria-label="Hide in this variant"
                @click="s.variants.toggleHidden(s.selection.selectedId)"
              />
            </UTooltip>
          </div>
        </div>

        <Inspector
          :key="`${s.variants.variantId}:${s.selection.selected.id}`"
          :kit="s.props.kit"
          :definition="s.variants.rendered"
          :node="s.selection.selected"
          :variant="
            s.variants.variant ? { label: s.variants.variant.label, override: s.variants.variant.overrides?.[s.selection.selected.id] } : undefined
          "
          @edit="s.editing.editNode"
          @reset="resetField"
        />
      </div>
    </template>
  </UPopover>
</template>
