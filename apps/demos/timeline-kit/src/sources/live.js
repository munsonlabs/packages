import { computed } from 'vue'
import { timeAgo } from './time'
import { composableSource } from './shared'

/** A live blog: whether it's still running, and its latest posts, newest first. */
export function useLive(props) {
  const updates = computed(() =>
    [...(props.story.entry.updates ?? [])]
      .sort((a, b) => Date.parse(b.time) - Date.parse(a.time))
      .map((update) => ({
        ...update,
        clock: new Date(update.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      })),
  )
  return {
    isLive: computed(() => !!props.story.entry.live),
    updates,
    count: computed(() => updates.value.length),
    lastUpdated: computed(() => (updates.value[0] ? `Updated ${timeAgo(updates.value[0].time, 1).toLowerCase()}` : undefined)),
  }
}

export const liveSource = composableSource({
  id: 'live',
  label: 'Live blog',
  description: "A live blog's latest posts, and whether it's still running.",
  fields: {
    isLive: { type: 'boolean', description: 'Still being updated' },
    updates: { type: 'list', description: 'Posts, newest first', item: { '': 'object', clock: 'string', text: 'string', time: 'string' } },
    count: { type: 'number', description: 'How many posts' },
    lastUpdated: { type: 'string', description: '"Updated 4 minutes ago"' },
  },
  use: useLive,
})
