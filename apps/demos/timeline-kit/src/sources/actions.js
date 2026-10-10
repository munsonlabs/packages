import { composableSource } from './shared'

/** What a reader can do to a story: open, save and share it. Each goes through the bridge to the native app. */
export function useStoryActions(props, host) {
  return {
    /** Opens the widget's story, or the one passed (a related story's row passes its own). */
    open(story = props.story) {
      host.sendAnalytics({ type: 'BoltTap', param: story.entry.title }, story, props.index)
      host.openArticle(story, props.index)
      host.setRead(story, props.index)
    },
    toggleSave() {
      const saved = !props.story.saved
      // Shown at once, as Bolt does; the app confirms it with a `savedStories` ping.
      props.story.saved = saved
      host.setSaved(props.story, props.index, saved)
      host.sendAnalytics(saved ? 'BoltSave' : 'BoltUnsave', props.story, props.index)
      host.fireToast(saved ? 'content_save' : 'content_unsave', saved ? 'gotoSaved' : undefined)
    },
    share() {
      host.shareStory(props.story, props.index)
    },
  }
}

export const actionsSource = composableSource({
  id: 'actions',
  label: 'Actions',
  description: 'Open, save and share the story.',
  fields: {
    open: { type: 'action', description: 'Open the story, or the story passed as the argument' },
    toggleSave: { type: 'action', description: 'Save or unsave the story' },
    share: { type: 'action', description: "Open the host's share sheet" },
  },
  use: useStoryActions,
})
