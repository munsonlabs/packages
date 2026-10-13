import { defineSource } from '@munsonlabs/loom'

/**
 * Every source in this kit has the same shape: a Bolt-style composable that takes
 * `(props, bridge)`, plugged into loom by a `composableSource({ …, use })` next to it.
 */
export const timelineSource = defineSource

/** @typedef {SourceContext<Story, TimelineHost>} TimelineContext */

/**
 * A source from a composable, in one call: `composableSource({ id, label, fields, use: useReading })`.
 * It hands the composable `(storyProps, bridge)`. Keep `fields` in step with what it returns:
 * a field it doesn't return is a binding that's quietly empty.
 */
export function composableSource({ use, ...source }) {
  return timelineSource({ ...source, fields: source.fields, setup: ({ data, index, context }) => use(storyProps({ data, index }), context) })
}

/**
 * What Bolt's composables take as props.
 *
 * @typedef {object} StoryProps
 * @property {Story} story
 * @property {number} index
 */

/** The widget's story and position (loom's refs) as composable props, read live so composables stay reactive. */
export const storyProps = ({ data, index }) => ({
  get story() {
    return data.value
  },
  get index() {
    return index.value
  },
})

/** An image URL, resolved against the story's base URL when it's relative. */
export function imageUrl(src, baseURL) {
  if (!src) return undefined
  try {
    return new URL(src, baseURL || undefined).href
  } catch {
    return src
  }
}

/** What a story offers inside a `Repeat`, as `item.*`. */
export const STORY_ITEM = {
  '': 'object',
  'entry.title': 'string',
  'entry.summary': 'string',
  'entry.section': 'string',
  'entry.author': 'string',
  read: 'boolean',
  saved: 'boolean',
}
