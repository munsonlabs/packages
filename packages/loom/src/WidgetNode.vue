<script setup>
import { computed } from 'vue'
import { builtinBlocks } from './blocks/builtin'
import { useRenderer } from './renderer'

/**
 * One node of a widget's tree, and through itself, its children. It checks the node's `if`,
 * resolves its props (fixed values, then bindings), and draws its block with them.
 */
defineOptions({ name: 'LoomWidgetNode' })

const props = defineProps({
  node: { type: Object, required: true },
  /** `item` and `repeat` inside a `Repeat`; empty outside one. */
  locals: { type: Object, required: true },
})

const { kit, readValue, clickHandler } = useRenderer()

const spec = computed(() => kit().blocks[props.node.type])
const component = computed(() => spec.value?.component)
const shown = computed(() => !!component.value && (!props.node.if || !!readValue(props.node.if, props.locals)))

/** The block's props: its defaults, then the node's fixed values, then its bindings. */
const values = computed(() => {
  const values = {}
  for (const [name, propSpec] of Object.entries(spec.value.props)) values[name] = props.node.props?.[name] ?? propSpec.default
  // A bound value that's missing is `null`, not `undefined`: Vue would fill `undefined` with the prop's default ("Text").
  for (const [name, path] of Object.entries(props.node.bind ?? {})) values[name] = readValue(path, props.locals) ?? null
  return values
})

const onClick = computed(() => clickHandler(props.node, props.locals))
// Built-in blocks add their own `w-*` class; a kit's block gets one here.
const classes = computed(() => [!(props.node.type in builtinBlocks) && `w-${props.node.type.toLowerCase()}`, onClick.value && 'is-clickable'])
</script>

<template>
  <component :is="component" v-if="shown" v-bind="values" :data-node-id="node.id" :class="classes" :style="node.style" :onClick="onClick">
    <!-- A Repeat draws its children once per item, with that item in scope. -->
    <template v-if="node.type === 'Repeat'" #default="{ item, repeat }">
      <WidgetNode v-for="child in node.children ?? []" :key="child.id" :node="child" :locals="{ ...locals, item, repeat }" />
    </template>
    <!-- Any other container draws them once. -->
    <template v-else-if="spec.container" #default>
      <WidgetNode v-for="child in node.children ?? []" :key="child.id" :node="child" :locals="locals" />
    </template>
  </component>
</template>
