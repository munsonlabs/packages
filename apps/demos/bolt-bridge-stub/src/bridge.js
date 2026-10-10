/**
 * The web side of the bridge, shaped like `@pugpigbolt/bridge`: a store the native app keeps up
 * to date, incoming handlers that pull from the app when it pings, and outgoing actions that
 * call into it. Wrap it in Vue's `reactive()` (see `vue.js`) and widgets follow the app.
 */

/** The native app, wherever it is: `window.pugpigBridgeService`, as in Bolt. */
const native = () => window.pugpigBridgeService

/** Reads one piece of state from the native app. */
const pull = (name) => {
  const json = native()?.[name]?.()
  return json ? JSON.parse(json) : undefined
}

/** Asks the native app to do something. Like Bolt's `dispatchBridgeAction`, the payload goes as JSON. */
const dispatch = (action, payload) => native()?.[action]?.(JSON.stringify(payload))

/**
 * The store fields the native app's pings update.
 *
 * @typedef {object} BridgeStore
 * @property {Story[]} rawStories
 * @property {Set<string>} saved
 * @property {Set<string>} read
 * @property {string[]} followedTopics
 * @property {string | undefined} playing
 * @property {AuthorisationStatus} authorisationStatus
 * @property {(event: string, ...args: unknown[]) => void} $emit
 */

/** Incoming: the app pinged with a name, so read that piece of state again. */
const incoming = {
  stories(store) {
    store.rawStories = pull('stories')?.stories ?? []
    store.$emit('stories-updated')
  },
  savedStories(store) {
    store.saved = new Set(pull('savedStories')?.savedStories)
  },
  readStories(store) {
    store.read = new Set(pull('readStories')?.readStories)
  },
  followedTopics(store) {
    store.followedTopics = pull('followedTopics')?.topics ?? []
  },
  nowPlaying(store) {
    store.playing = pull('nowPlaying')?.id
  },
  authorisationStatus(store) {
    store.authorisationStatus = pull('authorisationStatus') ?? { state: 'inactive' }
  },
}

export function createBridge() {
  const listeners = new Map()

  return {
    // --- Store: what the app has told us ----------------------------------------
    rawStories: [],
    saved: new Set(),
    read: new Set(),
    followedTopics: [],
    playing: undefined,
    authorisationStatus: { state: 'inactive' },
    timelineType: 'Timeline',

    /** The stories with the reader's state applied, as Bolt's `deriveStories` does: by the time widgets see a story, `locked` is settled. */
    get stories() {
      const subscribed = this.authorisationStatus.state === 'active'
      return this.rawStories.map((story) => {
        story.locked = !!story.entry.paywall_locked && !subscribed
        story.saved = this.saved.has(story.entry.id)
        story.read = this.read.has(story.entry.id)
        story.playing = this.playing === story.entry.id
        return story
      })
    },

    isTimelineStyleVersion(version) {
      return version === '2.0.0'
    },

    /** What the app calls (as `window.pugpigUpdate`) to say something changed. */
    pugpigUpdate(name) {
      incoming[name]?.(this)
    },

    /** Installs `window.pugpigUpdate` and reads everything once, like Bolt's bootstrap sequence. */
    connect() {
      window.pugpigUpdate = (name) => this.pugpigUpdate(name)
      for (const name of Object.keys(incoming)) this.pugpigUpdate(name)
    },

    // --- Outgoing: ask the app to do something ----------------------------------
    openArticle(story, index) {
      dispatch('viewArticle', { story, index })
    },
    setRead(story, index) {
      dispatch('setRead', { story, index })
    },
    setSaved(story, index, saved) {
      dispatch('setSaved', { story, index, saved })
    },
    shareStory(story, index) {
      dispatch('shareStory', { story, index })
    },
    addToCalendar(story, index) {
      dispatch('addToCalendar', { story, index })
    },
    /** Plays the story in the native player, or pauses it if it's playing. */
    openAudio(story, metadata, index) {
      dispatch('openAudio', { story, metadata, index })
    },
    /** Not in Bolt's typed bridge: a real app would reach it through `bridge.call('followTopic', …)`. */
    followTopic(topic, follow) {
      dispatch('followTopic', { topic, follow })
    },
    sendAnalytics(event, story, index) {
      dispatch('sendAnalytics', { event, story, index })
    },
    fireToast(key, action) {
      dispatch('fireToast', { key, action })
    },
    /** Bolt's escape hatch: any native method by name, its arguments sent as a JSON array. */
    call(method, ...args) {
      native()?.[method]?.(JSON.stringify(args))
    },

    // --- Events -----------------------------------------------------------------
    $on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(callback)
      return () => listeners.get(event)?.delete(callback)
    },
    $emit(event, ...args) {
      listeners.get(event)?.forEach((callback) => callback(...args))
    },
  }
}

/**
 * What widgets get as their context: the bridge's state and actions.
 *
 * @typedef {Omit<ReturnType<typeof createBridge>, 'pugpigUpdate' | 'connect' | 'rawStories' | 'saved' | 'read' | 'playing'>} BridgeService
 */
