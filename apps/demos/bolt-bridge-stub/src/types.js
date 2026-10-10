/**
 * A stand-in for `@pugpigbolt/bridge`'s types, trimmed to what the demos use. Story fields keep
 * Bolt's names; the few extras (podcasts, live blogs, quotes, labels) are the demo's own.
 */

/**
 * @typedef {object} StoryImage
 * @property {string} [src]
 * @property {string} [caption]
 * @property {string} [credit]
 */

/**
 * One timestamped post in a live blog.
 *
 * @typedef {object} LiveUpdate
 * @property {string} time
 * @property {string} text
 */

/**
 * Other keys are allowed too: `[key: string]: unknown`.
 *
 * @typedef {object} StoryEntry
 * @property {string} id
 * @property {string} [type] Picks the widget: `article`, `event`, `video` (and each video platform), `gallery`, `podcast`, `liveblog`, `quote`.
 * @property {string} [title]
 * @property {string} [summary]
 * @property {string} [author]
 * @property {string} [authorHeadshot]
 * @property {string} [section]
 * @property {string} [kicker]
 * @property {string} [topic]
 * @property {string} [url]
 * @property {string} [externalurl]
 * @property {StoryImage[]} [images]
 * @property {string[]} [children] Ids of related stories in the same feed.
 * @property {string} [published]
 * @property {string} [updated]
 * @property {string} [display_date] Which date field to show, or `none`. Defaults to `published`.
 * @property {number} [display_date_relative_length] How many days a date shows as "2 days ago" before it shows as a date.
 * @property {number} [readtime]
 * @property {boolean} [paywall_locked] Behind the paywall unless the reader is subscribed.
 * // Labels
 * @property {boolean} [breaking]
 * @property {boolean} [exclusive]
 * @property {boolean} [sponsored]
 * @property {boolean} [opinion]
 * // Events
 * @property {string} [startdate]
 * @property {string} [enddate]
 * @property {string} [location]
 * @property {boolean} [diarised]
 * // Video: `videourl` for files and links, `videoid` for YouTube, Vimeo and Dailymotion,
 * // `videokey` for JW Player, and the `brightcove_*` fields for Brightcove
 * @property {string} [videourl]
 * @property {string} [videoid]
 * @property {string} [videokey]
 * @property {string} [brightcove_video_id]
 * @property {string} [brightcove_account_id]
 * @property {string} [brightcove_player]
 * @property {string} [brightcove_embed]
 * @property {Array<{ type: string; url: string }>} [video_sources]
 * @property {string} [duration]
 * // Podcasts
 * @property {string} [show]
 * @property {string} [audiourl]
 * // Live blogs
 * @property {boolean} [live]
 * @property {LiveUpdate[]} [updates]
 * // Quotes
 * @property {string} [quote]
 * @property {string} [quote_author]
 * @property {string} [quote_role]
 */

/**
 * @typedef {object} Story
 * @property {StoryEntry} entry
 * @property {number} [progress] How far the reader got, from 0 to 1.
 * @property {string} [baseURL]
 * // Set by the bridge from what the native app says, as in Bolt's `deriveStories`:
 * @property {boolean} [read]
 * @property {boolean} [saved]
 * @property {boolean} [locked] `paywall_locked` and the reader isn't subscribed.
 * @property {boolean} [playing] This podcast is playing in the native player.
 */

/** @typedef {string | { type: string; param?: string }} AnalyticsEvent */

/**
 * The native app's side: `window.pugpigBridgeService`. Every method takes and returns JSON
 * strings, because that's all a native web view can pass.
 *
 * - Reads (`stories`, `savedStories`, …) return the current state. The web calls them when the
 *   app pings it through `window.pugpigUpdate(name)`.
 * - Actions (`viewArticle`, `setSaved`, …) ask the app to do something. When that changes
 *   state, the app pings back, and the web reads the new state.
 *
 * @typedef {object} NativeService
 * @property {() => string} stories
 * @property {() => string} savedStories
 * @property {() => string} readStories
 * @property {() => string} followedTopics
 * @property {() => string} nowPlaying
 * @property {() => string} authorisationStatus `{ state: 'active' | 'inactive' }`: whether the reader is a subscriber.
 * @property {(payload: string) => void} viewArticle
 * @property {(payload: string) => void} setSaved
 * @property {(payload: string) => void} setRead
 * @property {(payload: string) => void} shareStory
 * @property {(payload: string) => void} addToCalendar
 * @property {(payload: string) => void} openAudio
 * @property {(payload: string) => void} followTopic
 * @property {(payload: string) => void} sendAnalytics
 * @property {(payload: string) => void} fireToast
 * @property {(payload: string) => void} showPaywall Not one of Bolt's typed actions: the web reaches it with `bridge.call('showPaywall', story, index)`.
 */

/**
 * The reader's subscription, as Bolt's `AuthorisationStatus` has it.
 *
 * @typedef {object} AuthorisationStatus
 * @property {'active' | 'inactive'} state
 */

/**
 * What the page puts on `window`:
 *
 * - `window.pugpigBridgeService` (`NativeService`): Set by the native app (here, the stub).
 * - `window.pugpigUpdate` (`(name: string) => void`): Set by the bridge. The native app calls it to say something changed.
 */
