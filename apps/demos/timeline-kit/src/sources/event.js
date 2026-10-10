import { computed } from 'vue'
import { composableSource } from './shared'

const validDate = (value) => !!value && !isNaN(Date.parse(value))

/** Bolt's event logic: when and where, and whether it can go in a calendar. */
export function eventDetails(entry) {
  const start = validDate(entry.startdate) ? new Date(entry.startdate) : undefined
  return {
    date: start?.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    day: start ? String(start.getDate()) : undefined,
    month: start?.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    canAddToCalendar: validDate(entry.startdate) && validDate(entry.enddate),
  }
}

/** An event's date, place and calendar actions (Bolt's `useBoltEvent`). */
export function useEvent(props, host) {
  const details = computed(() => eventDetails(props.story.entry))
  return {
    date: computed(() => details.value.date),
    day: computed(() => details.value.day),
    month: computed(() => details.value.month),
    location: computed(() => props.story.entry.location),
    canAddToCalendar: computed(() => details.value.canAddToCalendar),
    calendarLabel: computed(() => (props.story.entry.diarised ? 'In your calendar' : 'Add to calendar')),
    isInCalendar: computed(() => !!props.story.entry.diarised),
    href: computed(() => props.story.entry.externalurl),
    addToCalendar() {
      host.addToCalendar(props.story, props.index)
      host.sendAnalytics('BoltAddToCalendar', props.story, props.index)
    },
    findOutMore() {
      host.sendAnalytics({ type: 'BoltTap', param: props.story.entry.title }, props.story, props.index)
    },
  }
}

export const eventSource = composableSource({
  id: 'event',
  label: 'Event',
  description: 'When and where it is, and adding it to a calendar.',
  fields: {
    date: { type: 'string', description: 'Start date and time' },
    day: { type: 'string', description: 'Day of the month it starts, for a date tile' },
    month: { type: 'string', description: 'Short month it starts in: OCT' },
    location: { type: 'string', description: 'Where it happens' },
    canAddToCalendar: { type: 'boolean', description: 'Has a valid start and end' },
    calendarLabel: { type: 'string', description: '"Add to calendar", or "In your calendar" once added' },
    isInCalendar: { type: 'boolean', description: 'The reader added it' },
    href: { type: 'string', description: 'The organiser’s page' },
    addToCalendar: { type: 'action', description: "Add it to the reader's calendar" },
    findOutMore: { type: 'action', description: 'Record a tap on the find-out-more link' },
  },
  use: useEvent,
})
