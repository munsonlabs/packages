import { computed } from 'vue'
import { STORY_ITEM, composableSource } from './shared'

/** Stories attached to this one, resolved from the feed by id. */
export function useRelated(props, host) {
  const stories = computed(() => {
    const ids = props.story.entry.children ?? []
    return ids.map((id) => host.stories.find((s) => s.entry.id === id)).filter((s) => !!s)
  })
  return { stories, hasRelated: computed(() => stories.value.length > 0) }
}

export const relatedSource = composableSource({
  id: 'related',
  label: 'Related stories',
  description: 'Stories attached to this one.',
  fields: {
    hasRelated: { type: 'boolean', description: 'Has at least one related story' },
    stories: { type: 'list', description: 'The related stories', item: STORY_ITEM },
  },
  use: useRelated,
})
