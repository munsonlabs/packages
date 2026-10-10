import { effectScope, ref } from 'vue'
import { createKit, defineTheme, lightTheme } from '@munsonlabs/loom'

/** A small kit: one source, a light theme with a dark partner. */
export const kit = createKit({
  sources: [{ id: 'note', label: 'Note', fields: { title: { type: 'string' } }, setup: () => ({ title: 'Hi' }) }],
  themes: [
    defineTheme({ ...lightTheme, id: 'brand', label: 'Brand', dark: 'brand-dark' }),
    defineTheme({ id: 'brand-dark', label: 'Brand dark', values: {} }),
  ],
})

export const card = () => ({
  version: 2,
  id: 'card',
  name: 'Card',
  match: [{ path: 'type', op: 'equals', value: 'note' }],
  root: {
    id: 'root',
    type: 'Stack',
    children: [
      { id: 'title', type: 'Text', bind: { text: 'note.title' } },
      { id: 'body', type: 'Text', props: { text: 'Body' } },
      { id: 'more', type: 'Stack', children: [{ id: 'link', type: 'Link' }] },
    ],
  },
  variants: [{ id: 'small', label: 'Small', when: { size: ['sm'] } }],
})

/** A definition ref, as `<LoomStudio v-model>` holds it. */
export const model = () => ref(card())

/** Runs a composable inside an effect scope, as a component's setup would. */
export function inScope(fn) {
  return effectScope().run(fn)
}
