import { computed } from 'vue'
import { composableSource } from './shared'

/** The story's topic, and following it. */
export function useTopic(props, host) {
  const name = computed(() => props.story.entry.topic)
  const isFollowed = computed(() => !!name.value && host.followedTopics.includes(name.value))
  return {
    name,
    isFollowed,
    toggleFollow() {
      if (name.value) host.followTopic(name.value, !isFollowed.value)
    },
  }
}

export const topicSource = composableSource({
  id: 'topic',
  label: 'Topic',
  description: 'What the story is about, and whether the reader follows it.',
  fields: {
    name: { type: 'string', description: 'Topic name' },
    isFollowed: { type: 'boolean', description: 'The reader follows this topic' },
    toggleFollow: { type: 'action', description: 'Follow or unfollow the topic' },
  },
  use: useTopic,
})
