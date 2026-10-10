import { computed } from 'vue'
import { composableSource } from './shared'

/** Editorial labels on a story, and the one to show when there's room for one. */
export function useLabels(props) {
  const entry = computed(() => props.story.entry)
  const isBreaking = computed(() => !!entry.value.breaking)
  const isExclusive = computed(() => !!entry.value.exclusive)
  const isOpinion = computed(() => !!entry.value.opinion)
  const isSponsored = computed(() => !!entry.value.sponsored)
  return {
    isBreaking,
    isExclusive,
    isOpinion,
    isSponsored,
    label: computed(() =>
      isBreaking.value ? 'Breaking' : isExclusive.value ? 'Exclusive' : isOpinion.value ? 'Opinion' : isSponsored.value ? 'Sponsored' : undefined,
    ),
  }
}

export const labelsSource = composableSource({
  id: 'labels',
  label: 'Labels',
  description: 'Breaking, exclusive, opinion and sponsored labels.',
  fields: {
    label: { type: 'string', description: 'The most important label: Breaking, Exclusive, Opinion or Sponsored' },
    isBreaking: { type: 'boolean', description: 'Breaking news' },
    isExclusive: { type: 'boolean', description: 'An exclusive' },
    isOpinion: { type: 'boolean', description: 'Opinion, not news' },
    isSponsored: { type: 'boolean', description: 'Paid for by an advertiser' },
  },
  use: useLabels,
})
