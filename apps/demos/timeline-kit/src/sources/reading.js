import { computed } from 'vue'
import { composableSource } from './shared'

/** How long the story takes to read, and how far the reader got. */
export function useReading(props) {
  const minutes = computed(() => props.story.entry.readtime)
  const progress = computed(() => Math.round(Math.min(1, Math.max(0, props.story.progress ?? 0)) * 100))
  return {
    minutes,
    label: computed(() => (minutes.value ? `${minutes.value} min read` : undefined)),
    progress,
    isStarted: computed(() => progress.value > 0 && progress.value < 100),
    isFinished: computed(() => progress.value >= 100),
  }
}

export const readingSource = composableSource({
  id: 'reading',
  label: 'Reading',
  description: 'Read time, and how far through the reader is.',
  fields: {
    minutes: { type: 'number', description: 'Minutes to read' },
    label: { type: 'string', description: '"6 min read"' },
    progress: { type: 'number', description: 'Percent read, 0 to 100' },
    isStarted: { type: 'boolean', description: 'Started but not finished' },
    isFinished: { type: 'boolean', description: 'Read to the end' },
  },
  use: useReading,
})
