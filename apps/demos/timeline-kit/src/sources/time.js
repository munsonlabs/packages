import { computed } from 'vue'
import { composableSource } from './shared'

/** The date the entry asks to show: the field `display_date` names, else `published`. `none` shows nothing. */
export function displayDate(entry) {
  const field = entry.display_date ?? 'published'
  if (field === 'none') return undefined
  return entry[field] ?? entry.published
}

/** "2 hours ago" within `relativeDays`, a short date after that. */
export function timeAgo(date, relativeDays = 7, now = Date.now()) {
  const then = new Date(date)
  const minutes = (now - then.getTime()) / 60_000
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`
  if (relativeDays > 0 && minutes / 1440 <= relativeDays) {
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return plural(Math.floor(minutes), 'minute')
    if (minutes < 1440) return plural(Math.floor(minutes / 60), 'hour')
    return plural(Math.floor(minutes / 1440), 'day')
  }
  const sameYear = then.getFullYear() === new Date(now).getFullYear()
  return then.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { month: 'short', year: 'numeric' })
}

/** When the story was published, as a relative time and in full. */
export function useTime(props) {
  const date = computed(() => displayDate(props.story.entry))
  return {
    ago: computed(() => date.value && timeAgo(date.value, props.story.entry.display_date_relative_length)),
    date: computed(() => date.value && new Date(date.value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })),
    isRecent: computed(() => !!date.value && Date.now() - new Date(date.value).getTime() < 3_600_000),
  }
}

export const timeSource = composableSource({
  id: 'time',
  label: 'Time',
  description: '"2 hours ago" for recent stories, a date for older ones.',
  fields: {
    ago: { type: 'string', description: 'Relative time, or a short date' },
    date: { type: 'string', description: 'Full date and time' },
    isRecent: { type: 'boolean', description: 'Published in the last hour' },
  },
  use: useTime,
})
