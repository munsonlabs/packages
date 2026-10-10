/** Actions a reader may take on a story they can't read yet. */
const FREE_ACTIONS = new Set(['actions.share', 'actions.toggleSave', 'topic.toggleFollow'])

const isStory = (value) => !!value && typeof value === 'object' && 'entry' in value

/**
 * The kit's guard: every action any widget takes on a locked story shows the native paywall
 * instead, so no widget or variant has to remember to. The bridge has already worked out
 * `locked` from the reader's subscription. An action on another story (a related story's row)
 * is guarded by that story's lock.
 */
export const paywallGuard = ({ action, arg, data, index, context: bridge }) => {
  const story = isStory(arg) ? arg : data
  if (!story.locked || FREE_ACTIONS.has(action)) return true
  bridge.call('showPaywall', story, index)
  bridge.sendAnalytics({ type: 'BoltPaywall', param: story.entry.title }, story, index)
  return false
}
