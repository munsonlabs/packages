/**
 * @typedef {object} StubNativeOptions
 * @property {Story[]} stories The feed the "app" has downloaded.
 * @property {(method: string, payload: unknown) => void} [onCall] Hears every call the web makes, with its decoded payload: for logs and toasts.
 * @property {(name: string) => void} [onPing] Hears every ping the app sends the web.
 */

/**
 * A pretend native app, in place of the iOS or Android shell, for demos and tests. It keeps its
 * own state, answers the bridge's reads with JSON, and after an action that changes something,
 * pings the web through `window.pugpigUpdate` a moment later, as a real app would.
 *
 * Install it where the real one would be: `window.pugpigBridgeService = createStubNative(…)`.
 */
/**
 * The stub app, plus what its own screens would do: subscribing happens in the app, not the web.
 *
 * @typedef {NativeService & object} StubNative
 * @property {(subscribed: boolean) => void} setSubscribed The reader subscribes (or lapses): the app tells the web, which re-locks or unlocks stories.
 */

export function createStubNative({ stories, onCall, onPing }) {
  // The app's own state. The web only ever sees copies, as JSON.
  const feed = JSON.parse(JSON.stringify(stories))
  const saved = new Set()
  const read = new Set()
  const topics = new Set()
  let playing
  let subscribed = false

  /** Tells the web something changed, after the call that changed it returns. */
  const ping = (name) =>
    queueMicrotask(() => {
      onPing?.(name)
      window.pugpigUpdate?.(name)
    })

  /** An action: decode the payload, report it, apply it. */
  const action = (method, apply) => (json) => {
    const payload = JSON.parse(json)
    onCall?.(method, payload)
    apply?.(payload)
  }

  return {
    stories: () => JSON.stringify({ stories: feed }),
    savedStories: () => JSON.stringify({ savedStories: [...saved] }),
    readStories: () => JSON.stringify({ readStories: [...read] }),
    followedTopics: () => JSON.stringify({ topics: [...topics] }),
    nowPlaying: () => JSON.stringify({ id: playing }),
    authorisationStatus: () => JSON.stringify({ state: subscribed ? 'active' : 'inactive' }),

    viewArticle: action('viewArticle'),
    shareStory: action('shareStory'),
    sendAnalytics: action('sendAnalytics'),
    fireToast: action('fireToast'),
    // The app shows its own paywall screen; subscribing from it calls `setSubscribed`.
    showPaywall: action('showPaywall'),

    setSubscribed(value) {
      subscribed = value
      onCall?.('setSubscribed', { subscribed })
      ping('authorisationStatus')
    },

    setRead: action('setRead', ({ story }) => {
      read.add(story.entry.id)
      ping('readStories')
    }),
    setSaved: action('setSaved', ({ story, saved: save }) => {
      if (save) saved.add(story.entry.id)
      else saved.delete(story.entry.id)
      ping('savedStories')
    }),
    addToCalendar: action('addToCalendar', ({ story }) => {
      // The app marks the event as in the reader's calendar and sends the feed again.
      const event = feed.find((s) => s.entry.id === story.entry.id)
      if (event) event.entry.diarised = true
      ping('stories')
    }),
    openAudio: action('openAudio', ({ story }) => {
      // One player: playing an episode stops any other; playing the current one pauses it.
      playing = playing === story.entry.id ? undefined : story.entry.id
      ping('nowPlaying')
    }),
    followTopic: action('followTopic', ({ topic, follow }) => {
      if (follow) topics.add(topic)
      else topics.delete(topic)
      ping('followedTopics')
    }),
  }
}
