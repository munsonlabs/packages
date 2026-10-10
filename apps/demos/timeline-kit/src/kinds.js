import { defineKind } from '@munsonlabs/loom'
import { VIDEO_TYPES } from './sources'
import { widgets } from './widgets'

/** A new widget of a kind starts as a copy of that kind's example. */
const starter = (id) => () => {
  const { version: _, id: __, name: ___, kind: ____, ...rest } = widgets.find((w) => w.id === id)
  return structuredClone(rest)
}

const type =
  (...types) =>
  (story) =>
    types.includes(story.entry.type ?? '')

/**
 * Bolt picks a widget by `entry.type`, and so do these. A story with no type matches nothing,
 * as in Bolt, where it renders no widget. `sources` are what editors suggest first.
 */
export const timelineKinds = [
  defineKind({
    id: 'article',
    label: 'Article',
    description: 'A story that opens in the reader.',
    icon: 'i-lucide-newspaper',
    matches: type('article'),
    sources: ['time', 'reading', 'labels', 'related', 'actions'],
    starter: starter('article-card'),
  }),
  defineKind({
    id: 'event',
    label: 'Event',
    description: 'Something happening at a time and place.',
    icon: 'i-lucide-calendar',
    matches: type('event'),
    sources: ['event', 'actions'],
    starter: starter('event-card'),
  }),
  defineKind({
    id: 'video',
    label: 'Video',
    description: 'A video on any platform Bolt feeds carry.',
    icon: 'i-lucide-clapperboard',
    matches: type(...VIDEO_TYPES),
    sources: ['video', 'time'],
    starter: starter('video-tile'),
  }),
  defineKind({
    id: 'gallery',
    label: 'Gallery',
    description: 'A set of photos with captions.',
    icon: 'i-lucide-images',
    matches: type('gallery'),
    sources: ['gallery', 'time', 'actions'],
    starter: starter('gallery-card'),
  }),
  defineKind({
    id: 'podcast',
    label: 'Podcast',
    description: 'An episode to play in the app’s player.',
    icon: 'i-lucide-headphones',
    matches: type('podcast'),
    sources: ['podcast', 'actions'],
    starter: starter('podcast-row'),
  }),
  defineKind({
    id: 'live',
    label: 'Live blog',
    description: 'Running coverage, newest post first.',
    icon: 'i-lucide-radio',
    matches: type('liveblog'),
    sources: ['live', 'actions'],
    starter: starter('live-blog'),
  }),
  defineKind({
    id: 'quote',
    label: 'Quote',
    description: 'A pull quote and who said it.',
    icon: 'i-lucide-quote',
    matches: type('quote'),
    sources: ['quote', 'topic', 'actions'],
    starter: starter('pull-quote'),
  }),
]
