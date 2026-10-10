import { computed, reactive } from 'vue'
import { createKit, defineSource } from '@munsonlabs/loom'

/** The data: a few articles, as an app might fetch them. Nothing here knows about loom. */
export const articles = [
  {
    id: 'tides',
    title: 'Why the tides are getting higher',
    summary: 'Sea levels are rising a little faster each decade. Here is what that means for the coast.',
    section: 'Science',
    minutes: 6,
    image: 'https://picsum.photos/seed/tides/640/360',
    tags: ['Climate', 'Coasts', 'Maps'],
  },
  {
    id: 'sourdough',
    title: 'A loaf a day: a year of sourdough',
    summary: 'Three hundred and sixty-five loaves later, one baker on what actually matters.',
    section: 'Food',
    minutes: 4,
    image: 'https://picsum.photos/seed/sourdough/640/360',
    tags: ['Baking'],
  },
  {
    id: 'chess',
    title: 'The chess club that never closes',
    section: 'Local',
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
export const kit = createKit({ sources: [articleSource, readingSource] })
