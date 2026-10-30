import { ASPECTS, CLIP_LENGTH, LONGEST_CLIP, SHARE_CAPTION, SHORTEST_CLIP, TIMELINE_SPAN } from './defaults'

export const EDITOR_PROPS = {
  /**
   * endCard can be false, which makes Vue treat it as a Boolean prop and turn a missing value
   * into false. This keeps it undefined.
   */
  endCard: undefined,
  captionPosition: 'bottom',
  aspect: undefined,
  aspects: () => [...ASPECTS],
  clipLength: CLIP_LENGTH,
  shortestClip: SHORTEST_CLIP,
  longestClip: LONGEST_CLIP,
  timelineSpan: TIMELINE_SPAN,
  shareCaption: SHARE_CAPTION,
} as const
