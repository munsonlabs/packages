/**
 * Anything reel can read a video from. A `Blob` (or `File`) is read in place; a string or `URL` is
 * fetched with range requests, so a cross-origin URL must send CORS headers. A `<video>` element is
 * inspected first (DRM, MediaSource, MediaStream are refused with a reason) and then read through its
 * `currentSrc`, which is how a player hands over what the viewer is watching.
 */
export type ClipSource = Blob | string | URL | HTMLVideoElement

/**
 * Fetches each HLS playlist once and serves later requests from memory, so checking, thumbnailing,
 * listing captions and clipping one source read its playlists once. Made by `createPlaylistCache()` and
 * passed as `cache`. A master is kept until `clear()`, a media playlist only when complete
 * (`#EXT-X-ENDLIST`). The picker makes one per opening.
 */
export interface PlaylistCache {
  readonly fetch: typeof fetch
  clear(): void
}

/**
 * One video track of a source; for an HLS master playlist, one variant, described by its playlist
 * entry.
 */
export interface VideoTrackInfo {
  index: number
  width: number
  height: number
  bitrate: number | null
  codec: string | null
}

/**
 * How to choose the video track to read from a source with several (HLS variants, mostly). Only the
 * chosen track's media is downloaded.
 *
 * - `'auto'`: the smallest track whose display size covers what is being made (a clip's output after
 *   crop and scale, a storyboard's tile), falling back to the largest. The default.
 * - `'smallest'` / `'largest'`: by display size, then bitrate.
 *
 * Tracks this browser cannot decode are skipped whatever the choice.
 */
export type TrackChoice = 'auto' | 'smallest' | 'largest'

/**
 * What {@link canClip} found out about a source that can be clipped.
 */
export interface SourceInfo {
  duration: number
  width: number
  height: number
  videoCodec: string | null
  audioCodec: string | null
  resolved: Blob | string
  videoTracks: VideoTrackInfo[]
}
