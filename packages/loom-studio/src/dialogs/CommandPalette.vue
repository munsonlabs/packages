<script setup>
import { computed } from 'vue'
import { listNodes } from '../editing/tree'
import { iconFor } from '../panels/options'
import { useStudio } from '../studio'

/** ⌘K: jump to any element, add a block, switch variant, or open any panel. */
const s = useStudio()

/**
 * Runs `fn` once the palette has closed. Closing would normally hand focus back to the page,
 * which the element editor (and other popovers) would take as focus moving away, so it doesn't.
 */
let afterClosed
function then(fn) {
  afterClosed = fn
  s.open.palette = false
}
function onClosed(event) {
  // Keep focus where it is rather than returning it to the page, which would close the editor.
  event.preventDefault()
  const fn = afterClosed
  afterClosed = undefined
  fn?.()
}

const groups = computed(() => [
  {
    id: 'elements',
    label: 'Elements',
    items: listNodes(s.variants.tree.root).map(({ node, depth }) => ({
      label: `${'· '.repeat(depth)}${s.props.kit.blocks[node.type]?.label ?? node.type}`,
      suffix: `#${node.id}${s.variants.tree.hidden.has(node.id) ? ' · hidden' : ''}`,
      icon: iconFor(s.props.kit, node.type),
      onSelect: () => then(() => s.selection.select(node.id)),
    })),
  },
  ...(s.variants.variant
    ? []
    : [
        {
          id: 'add',
          label: s.selection.selectedId ? `Add to #${s.selection.selectedId}` : 'Add',
          items: s.editing.blockOptions('auto').map((item) => ({ ...item, onSelect: () => then(item.onSelect) })),
        },
      ]),
  {
    id: 'variants',
    label: 'Edit variant',
    items: s.variants.variantOptions.map((v) => ({ ...v, onSelect: () => then(() => (s.variants.variantId = v.value)) })),
  },
  {
    id: 'commands',
    label: 'Commands',
    items: [
      { label: 'Theme', icon: 'i-lucide-palette', onSelect: () => then(() => (s.open.theme = true)) },
      { label: 'Variants and rules', icon: 'i-lucide-git-branch', onSelect: () => then(() => (s.open.variants = true)) },
      { label: s.preview.mode === 'edit' ? 'Try it (interact)' : 'Back to editing', icon: 'i-lucide-hand', onSelect: () => then(s.toggleMode) },
      { label: 'Export', icon: 'i-lucide-download', onSelect: () => then(() => (s.open.export = true)) },
      { label: 'Import', icon: 'i-lucide-upload', onSelect: () => then(() => (s.open.import = true)) },
    ],
  },
])
</script>

<template>
  <UModal v-model:open="s.open.palette" :ui="{ content: 'max-w-xl' }" :content="{ onCloseAutoFocus: onClosed }">
    <template #content>
      <UCommandPalette :groups="groups" placeholder="Jump to an element, add a block, switch variant…" class="h-96" />
    </template>
  </UModal>
</template>
