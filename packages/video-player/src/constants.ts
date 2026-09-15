import type { StateChangeType } from '@/types/player'
import type { AudioPreference } from '@/types/playback'

export const WIN_VIDEO_SELECT = 'video-select'
export const WIN_VIDEO_TOGGLE = 'video-toggle'
export const WIN_VIDEO_STATE = 'video-state'

export const MVP_FULLSCREEN_PENDING = 'fullscreen-pending'
export const MVP_FULLSCREEN_PENDING_DONE = 'fullscreen-pending-done'

export const STORAGE_POSITIONS_KEY = 'player:positions'
export const STORAGE_AUTO_ADVANCE_KEY = 'player:autoAdvance'
export const STORAGE_AUDIO_PREFERENCE_KEY = 'player:audio'
export const DEFAULT_AUDIO_PREFERENCE: AudioPreference = { muted: false, volume: 1 }

export const MVP_TECH_CLASS = 'mlv-tech'
export const MVP_YOUTUBE_CLASS = 'mlv-youtube'
export const MVP_VIMEO_CLASS = 'mlv-vimeo'
export const MVP_DAILYMOTION_CLASS = 'mlv-dailymotion'
export const MVP_AD_PLAYING_CLASS = 'mlv-ad-playing'
export const MVP_AD_PAUSED_CLASS = 'mlv-ad-paused'

export const DEFAULT_ASPECT_RATIO = '16:9'

export const HLS_MIME_TYPE = 'application/x-mpegURL'
export const DASH_MIME_TYPE = 'application/dash+xml'
export const MP4_MIME_TYPE = 'video/mp4'

/** Preferred order when picking among multiple <source> candidates of the same video. */
export const SOURCE_TYPE_PRIORITY = [HLS_MIME_TYPE, MP4_MIME_TYPE]

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const HUD_HIDE_DELAY_MS = 3500

export const HUD_MOUSE_LEAVE_HIDE_DELAY_MS = 600

export const HUD_SUPPRESS_MOUSE_LEAVE_MS = 400

export const BUFFERING_SPINNER_DELAY_MS = 500

/** Below this rendered width, ControlsPopup switches to its compact row (see useElementCompact). */
export const COMPACT_CONTROLS_WIDTH_PX = 250

/** Shared by useAutoPauseOffscreen and usePinOnScrollOut - the ratio below which a player counts as "offscreen enough" to react to (pause it, or pin it instead of pausing). */
export const PAUSE_BELOW_RATIO = 0.1

export const SEEK_CATCH_UP_TOLERANCE_S = 1

export const SEEK_CATCH_UP_TIMEOUT_MS = 3000

export const QUARTILES: Array<[number, StateChangeType]> = [
  [0.25, 'firstQuartile'],
  [0.5, 'midpoint'],
  [0.75, 'thirdQuartile'],
]

export const POSITION_MAX_ENTRIES = 5

export const POSITION_MIN_SAVE_TIME_S = 5

export const YOUTUBE_TIMEUPDATE_POLL_MS = 250

/** How often the public `timeupdate` state-change event fires - throttled well below the underlying adapter's own tick rate, since this goes out over the wire to non-Vue consumers (e.g. a raw custom element) who'd otherwise get flooded. */
export const TIMEUPDATE_FIRE_INTERVAL_MS = 250

export const MUTE_VOLUMECHANGE_SYNC_DELAY_MS = 50

export const KEYBOARD_SEEK_STEP_S = 5

export const KEYBOARD_VOLUME_STEP = 0.1

export const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
export const VIMEO_SDK_URL = 'https://player.vimeo.com/api/player.js'
export const JW_MEDIA_API = 'https://cdn.jwplayer.com/v2/media'
export const BRIGHTCOVE_PLAYBACK_API = 'https://edge.api.brightcove.com/playback/v1/accounts'
export const BRIGHTCOVE_PLAYER_CONFIG = 'https://players.brightcove.net'
