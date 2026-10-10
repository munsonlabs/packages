<script setup>
import { computed } from 'vue'
import { useRenderer } from './renderer'

/**
 * One node of a widget's tree, and through itself, its children. It resolves the node's props
 * (fixed values, then bindings), and draws its block with them.
 */
defineOptions({ name: 'LoomWidgetNode' })

const props = defineProps({
  node: { type: Object, required: true },
})

const { kit, readValue } = useRenderer()

const spec = computed(() => kit().blocks[props.node.type])
const component = computed(() => spec.value?.component)
const shown = computed(() => !!component.value)

/** The block's props: its defaults, then the node's fixed values, then its bindings. */
const values = computed(() => {
  const values = {}
  for (const [name, propSpec] of Object.entries(spec.value.props)) values[name] = props.node.props?.[name] ?? propSpec.default
  // A bound value that's missing is `null`, not `undefined`: Vue would fill `undefined` with the prop's default ("Text").
  for (const [name, path] of Object.entries(props.node.bind ?? {})) values[name] = readValue(path) ?? null
  return values
})
</script>

<template>
  <component :is="component" v-if="shown" v-bind="values" :data-node-id="node.id" :style="node.style">
    <!-- A container draws its children inside it. -->
    <template v-if="spec.container" #default>
      <WidgetNode v-for="child in node.children ?? []" :key="child.id" :node="child" />
    </template>
  </component>
</template>
