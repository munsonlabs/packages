import { computed } from 'vue'
import { composableSource } from './shared'

/** A pull quote and who said it. */
export function useQuote(props) {
  const entry = computed(() => props.story.entry)
  return {
    text: computed(() => entry.value.quote),
    author: computed(() => entry.value.quote_author),
    role: computed(() => entry.value.quote_role),
    attribution: computed(() => [entry.value.quote_author, entry.value.quote_role].filter(Boolean).join(', ') || undefined),
  }
}

export const quoteSource = composableSource({
  id: 'quote',
  label: 'Quote',
  description: 'A pull quote and who said it.',
  fields: {
    text: { type: 'string', description: 'The quote, without quote marks' },
    author: { type: 'string', description: 'Who said it' },
    role: { type: 'string', description: 'Who they are' },
    attribution: { type: 'string', description: '"Name, role"' },
  },
  use: useQuote,
})
