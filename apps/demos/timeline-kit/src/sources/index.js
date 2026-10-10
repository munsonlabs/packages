import { actionsSource } from './actions'
import { eventSource } from './event'
import { gallerySource } from './gallery'
import { labelsSource } from './labels'
import { liveSource } from './live'
import { podcastSource } from './podcast'
import { quoteSource } from './quote'
import { readingSource } from './reading'
import { relatedSource } from './related'
import { storySource } from './story'
import { timeSource } from './time'
import { timelineConfigSource } from './timeline'
import { topicSource } from './topic'
import { videoSource } from './video'

/** Every source, in the order editors list them. */
export const timelineSources = [
  storySource,
  timeSource,
  readingSource,
  labelsSource,
  topicSource,
  relatedSource,
  actionsSource,
  eventSource,
  videoSource,
  gallerySource,
  podcastSource,
  liveSource,
  quoteSource,
  timelineConfigSource,
]

export { useStoryActions } from './actions'
export { useEvent, eventDetails } from './event'
export { useGallery } from './gallery'
export { useLabels } from './labels'
export { useLive } from './live'
export { usePodcast } from './podcast'
export { useQuote } from './quote'
export { useReading } from './reading'
export { useRelated } from './related'
export { useStory } from './story'
export { useTime, timeAgo, displayDate } from './time'
export { useTimeline } from './timeline'
export { useTopic } from './topic'
export { useVideo, videoUrl, VIDEO_TYPES } from './video'
