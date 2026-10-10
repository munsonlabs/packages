<script>
export const chapter = {
  step: 30,
  title: 'Fix: small hardening',
  subject: 'fix(loom,loom-studio): small hardening',
}
</script>

<script setup>
import { defineComponent, h } from 'vue'
import { createKit, defineBlock, validateDefinition, Widget } from '@munsonlabs/loom'
import ChapterPage from '../ChapterPage.vue'
const Shout = defineComponent({ props: { text: { type: String, default: '' } }, setup: (props) => () => h('strong', props.text.toUpperCase()) })

let kit
let error = ''
try {
  kit = createKit({
    blocks: [
      defineBlock({
        type: 'toString',
        label: 'Shout',
        description: 'Says it loudly.',
        container: false,
        props: { text: { type: 'string', label: 'Text', default: '' } },
        component: Shout,
      }),
    ],
  })
} catch (e) {
  error = String(e)
}
const definition = {
  version: 2,
  id: 'shout',
  name: 'Shout',
  root: { id: 'shout', type: 'toString', props: { text: 'hello from a block called toString' } },
}
const issues = kit ? validateDefinition(kit, definition) : []
</script>

<template>
  <ChapterPage
    :files="[
      'packages/loom/src/kit/createKit.js',
      'packages/loom/src/WidgetNode.vue',
      'packages/loom/test/widget.spec.js',
      'packages/loom-studio/src/editing/useTreeEditing.js',
      'packages/loom-studio/src/canvas/useCanvasDrag.js',
      'packages/loom-studio/src/panels/TokensEditor.vue',
    ]"
  >
    <p>
      <code>createKit</code> checked <code>block.type in builtinBlocks</code>, which also matched names every object has, so a kit block called
      <code>toString</code> was refused as a built-in; it now checks own properties. The kit's <code>blocks</code> and <code>sources</code> have no
      prototype, and <code>WidgetNode</code> checks the built-ins the same way, so every lookup by name finds only what's really there.
    </p>
    <p>
      In the studio, nesting in a variant edited the base's structure, unlike adding; it's off there too. A canvas drag the browser takes over (to
      scroll, say) ends without dropping, and a misplaced JSDoc comment moved.
    </p>
    <p class="note">
      Try: the kit below has a block named <code>toString</code>. Before this fix, <code>createKit</code> threw “"toString" is a built-in block”.
    </p>

    <template #example>
      <p v-if="error" class="note">{{ error }}</p>
      <p v-else>
        <code>createKit</code> accepted it: <code>kit.blocks.toString</code> is “{{ kit.blocks.toString.label }}”, and a widget using it validates
        with {{ issues.length }} problems. It renders:
      </p>
      <Widget v-if="kit" class="card" style="color: inherit" :kit="kit" :definition="definition" :data="{}" />
    </template>
  </ChapterPage>
</template>
