import type { VideoEntry } from '@munsonlabs/video-player'
import clipUrl from './flower.mp4?url'

/**
 * The catalogue of test videos. All are the same local ~5s CC0 clip (MDN's `flower.mp4`), served
 * by Vite - never a CDN. Where two entries need to be told apart (playlists, the event log) the
 * URL fragment differs: browsers strip it before the request, but `src` comparisons see it.
 */
export const CLIP_DURATION = 5.055

export const videos = {
  /** No poster, no tracks, no flags - the baseline for playback behaviour. */
  plain: { title: 'Plain clip', src: clipUrl } satisfies VideoEntry,

  /** Two WebVTT tracks (served from public/captions), English marked default. */
  captioned: {
    title: 'Captioned clip',
    src: `${clipUrl}#captioned`,
    tracks: [
      { src: '/captions/bbb-en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
      { src: '/captions/bbb-fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
    ],
  } satisfies VideoEntry,

  /** A two-item playlist for VideoStage: distinct `src`s so `usePlaylist` can tell them apart. */
  playlist: [
    { title: 'Playlist item 1', src: `${clipUrl}#pl-1` },
    { title: 'Playlist item 2', src: `${clipUrl}#pl-2` },
  ] satisfies VideoEntry[],
}
