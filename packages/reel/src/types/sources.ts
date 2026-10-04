/**
 * Anything reel can read a video from. A `Blob` (or `File`) is read in place; a string or `URL` is
 * fetched with range requests, so a cross-origin URL must send CORS headers. A `<video>` element is
 * inspected first (DRM, MediaSource, MediaStream are refused with a reason) and then read through its
 * `currentSrc`, which is how a player hands over what the viewer is watching.
 */
export type ClipSource = Blob | string | URL | HTMLVideoElement

/** What {@link canClip} found out about a source that can be clipped. */
export interface SourceInfo {
  duration: number
  width: number
  height: number
  videoCodec: string | null
  audioCodec: string | null
  /** The resolved source, e.g. the `currentSrc` of a `<video>`. */
  resolved: Blob | string
}
