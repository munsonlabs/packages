import { effectScope, ref } from 'vue'
import { createKit, defineKind } from '@munsonlabs/loom'

/** A small kit: notes and photos. */
export const kit = createKit({
  sources: [{ id: 'note', label: 'Note', fields: { title: { type: 'string' } }, setup: () => ({ title: 'Hi' }) }],
  kinds: [
    defineKind({
      id: 'note',
      label: 'Note',
      matches: (d) => d.type === 'note',
      starter: () => ({ root: { id: 'r', type: 'Stack' } }),
    }),
    defineKind({
      id: 'photo',
      label: 'Photo',
      matches: (d) => d.type === 'photo',
      starter: () => ({ root: { id: 'r', type: 'Stack' } }),
    }),
  ],
})

export const card = () => ({
  version: 2,
  id: 'card',
  name: 'Card',
  kind: 'note',
  root: {
    id: 'root',
    type: 'Stack',
    children: [
      { id: 'title', type: 'Text', bind: { text: 'note.title' } },
      { id: 'body', type: 'Text', props: { text: 'Body' } },
      { id: 'more', type: 'Stack', children: [{ id: 'link', type: 'Link' }] },
    ],
  },
})

/** A definition ref, as `<LoomStudio v-model>` holds it. */
export const model = () => ref(card())

/** Runs a composable inside an effect scope, as a component's setup would. */
export function inScope(fn) {
  return effectScope().run(fn)
}
