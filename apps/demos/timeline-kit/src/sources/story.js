import { computed } from 'vue'
import { imageUrl, composableSource } from './shared'

/** The story's own fields, flattened for binding. */
export function useStory(props) {
  const entry = computed(() => props.story.entry)
  return {
    title: computed(() => entry.value.title),
    summary: computed(() => entry.value.summary),
    section: computed(() => entry.value.section),
    kicker: computed(() => entry.value.kicker),
    author: computed(() => entry.value.author),
    headshot: computed(() => entry.value.authorHeadshot),
    image: computed(() => imageUrl(entry.value.images?.[0]?.src, props.story.baseURL)),
    href: computed(() => entry.value.externalurl || entry.value.url),
    isSaved: computed(() => !!props.story.saved),
    isRead: computed(() => !!props.story.read),
    isLocked: computed(() => !!props.story.locked),
  }
}

export const storySource = composableSource({
  id: 'story',
  label: 'Story',
  description: 'The headline, summary, image and byline, and whether the reader saved or read it.',
  primary: true,
  fields: {
    title: { type: 'string', description: 'Headline' },
    summary: { type: 'string', description: 'Standfirst or summary' },
    section: { type: 'string', description: 'Section name' },
    kicker: { type: 'string', description: 'Kicker above the headline' },
    author: { type: 'string', description: 'Byline' },
    headshot: { type: 'string', description: "The author's headshot" },
    image: { type: 'string', description: 'Lead image' },
    href: { type: 'string', description: 'Where the story lives on the web' },
    isSaved: { type: 'boolean', description: 'The reader saved it' },
    isRead: { type: 'boolean', description: 'The reader opened it' },
    isLocked: { type: 'boolean', description: 'Behind the paywall for this reader' },
  },
  use: useStory,
})
