import { computed, reactive } from 'vue'
import { createKit, darkTheme, defineBlock, defineSource, defineTheme, lightTheme } from '@munsonlabs/loom'
import Highlight from './Highlight.vue'

/** The data: a few articles, as an app might fetch them. Nothing here knows about loom. */
export const articles = [
  {
    id: 'tides',
    kind: 'article',
    title: 'Why the tides are getting higher',
    summary: 'Sea levels are rising a little faster each decade. Here is what that means for the coast.',
    section: 'Science',
    author: 'Ada Lovell',
    rating: 4.5,
    progress: 35,
    minutes: 6,
    image: 'https://picsum.photos/seed/tides/640/360',
    tags: ['Climate', 'Coasts', 'Maps'],
  },
  {
    id: 'sourdough',
    kind: 'article',
    title: 'A loaf a day: a year of sourdough',
    summary: 'Three hundred and sixty-five loaves later, one baker on what actually matters.',
    section: 'Food',
    author: 'Sam Baker',
    rating: 4,
    progress: 0,
    minutes: 4,
    image: 'https://picsum.photos/seed/sourdough/640/360',
    tags: ['Baking'],
  },
  {
    id: 'chess',
    kind: 'article',
    title: 'The chess club that never closes',
    section: 'Local',
    author: 'Mo Khan',
    rating: 3,
    progress: 100,
    minutes: 3,
  },
]

/** An app's own composable: it takes the article (as a getter) and returns what a card shows. */
export function useArticle(article) {
  return {
    title: computed(() => article().title),
    summary: computed(() => article().summary),
    section: computed(() => article().section),
    image: computed(() => article().image),
    readTime: computed(() => `${article().minutes} min read`),
    tags: computed(() => article().tags ?? []),
    author: computed(() => article().author),
    rating: computed(() => article().rating),
    progress: computed(() => article().progress),
  }
}

/** The composable as a loom source: what widgets may bind to (`article.title`…), and how to set it up. */
export const articleSource = defineSource({
  id: 'article',
  label: 'Article',
  fields: {
    title: { type: 'string' },
    summary: { type: 'string' },
    section: { type: 'string' },
    image: { type: 'string' },
    readTime: { type: 'string' },
    tags: { type: 'list', item: { '': 'string' } },
    author: { type: 'string' },
    rating: { type: 'number' },
    progress: { type: 'number', description: 'How much has been read, out of 100' },
  },
  setup: (ctx) => useArticle(() => ctx.data),
})

/** The app's own state and services, which widgets get as their context: what's saved, and a log of what was asked. */
export const reader = reactive({ saved: [], log: [] })

/** Another of the app's composables: saving and opening an article. */
export function useReading(article, app) {
  return {
    saved: computed(() => app.saved.includes(article().id)),
    toggleSave() {
      const id = article().id
      app.saved = app.saved.includes(id) ? app.saved.filter((s) => s !== id) : [...app.saved, id]
      app.log.unshift(`${app.saved.includes(id) ? 'Saved' : 'Unsaved'} “${article().title}”`)
    },
    open: () => app.log.unshift(`Opened “${article().title}”`),
  }
}

export const readingSource = defineSource({
  id: 'reading',
  label: 'Reading',
  fields: {
    saved: { type: 'boolean' },
    toggleSave: { type: 'action' },
    open: { type: 'action' },
  },
  setup: (ctx) => useReading(() => ctx.data, ctx.context),
})

/** The demo's kit: everything the chapters' widgets can read and do. It grows chapter by chapter. */
/** A block of the kit's own: any Vue component, described like the built-ins so editors and the validator know it. */
export const highlightBlock = defineBlock({
  type: 'Highlight',
  label: 'Highlight',
  icon: 'i-lucide-highlighter',
  description: 'Text with a marker pen behind it.',
  container: false,
  props: { text: { type: 'string', label: 'Text', default: '', accepts: ['string'] } },
  component: Highlight,
})

/** Short notes from the editors: other data in the same feed. */
export const notes = [{ id: 'week-off', kind: 'note', title: 'Back on Monday: the newsletter takes a week off.', author: 'The editors' }]

/** A theme is a set of token values. Blocks read only tokens, so a theme restyles every widget. */
export const sepiaTheme = defineTheme({
  id: 'sepia',
  label: 'Sepia',
  values: {
    bg: '#f6efe0',
    surface: '#ece1c9',
    text: '#3b2f22',
    muted: '#7a6650',
    accent: '#9a3412',
    border: '#d9c7a3',
    'title-font': 'Georgia, serif',
    radius: 'var(--w-radius-lg)',
  },
})

export const inkTheme = defineTheme({
  id: 'ink',
  label: 'Ink',
  values: { accent: '#1d4ed8', 'accent-contrast': '#ffffff', 'title-weight': '800', gap: 'var(--w-space-3)', radius: 'var(--w-radius-none)' },
})

export const kit = createKit({
  sources: [articleSource, readingSource],
  blocks: [highlightBlock],
  // lightTheme names darkTheme as its dark partner, so widgets follow the device's light or dark setting.
  themes: [lightTheme, darkTheme, sepiaTheme, inkTheme],
  describe: (data) => data.title,
})
