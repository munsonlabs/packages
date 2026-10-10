import { computed } from 'vue'
import { createKit } from '@munsonlabs/loom'

/** The data: a few articles, as an app might fetch them. Nothing here knows about loom. */
export const articles = [
  {
    id: 'tides',
    title: 'Why the tides are getting higher',
    summary: 'Sea levels are rising a little faster each decade. Here is what that means for the coast.',
    section: 'Science',
    minutes: 6,
    image: 'https://picsum.photos/seed/tides/640/360',
  },
  {
    id: 'sourdough',
    title: 'A loaf a day: a year of sourdough',
    summary: 'Three hundred and sixty-five loaves later, one baker on what actually matters.',
    section: 'Food',
    minutes: 4,
    image: 'https://picsum.photos/seed/sourdough/640/360',
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
  }
}

/** The composable as a loom source: what widgets may bind to (`article.title`…), and how to set it up. */
export const articleSource = {
  id: 'article',
  label: 'Article',
  fields: {
    title: { type: 'string' },
    summary: { type: 'string' },
    section: { type: 'string' },
    image: { type: 'string' },
    readTime: { type: 'string' },
  },
  setup: (ctx) => useArticle(() => ctx.data),
}

/** The demo's kit: everything the chapters' widgets can read and do. It grows chapter by chapter. */
export const kit = createKit({ sources: [articleSource] })
