import { computed } from 'vue'
import { composableSource } from './shared'

/** Flags about the timeline the widget sits in, rather than its story. */
export function useTimeline(host) {
  const isSavedTimeline = computed(() => host.timelineType === 'SavedTimeline')
  return {
    isSavedTimeline,
    showFlashes: computed(() => !isSavedTimeline.value && (host.isTimelineStyleVersion?.('2.0.0') ?? true)),
  }
}

export const timelineConfigSource = composableSource({
  id: 'timeline',
  label: 'Timeline',
  description: 'The timeline the widget is rendered in.',
  fields: {
    isSavedTimeline: { type: 'boolean', description: "Rendered in the reader's saved stories" },
    showFlashes: { type: 'boolean', description: 'Breaking and flash labels are switched on' },
  },
  use: (_, bridge) => useTimeline(bridge),
})
