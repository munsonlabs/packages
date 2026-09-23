import type { VideoEntry } from '@munsonlabs/video-player'

export const CLIP_URL = './media/flower.mp4'
export const CLIP_DURATION = 5.055
export const POSTER_URL = './media/poster.jpg'
export const MISSING_URL = './media/missing.mp4'
export const HLS_URL = './media/hls/flower.m3u8'

const clip = (fragment: string) => `${CLIP_URL}#${fragment}`

export const catalogue = {
  plain: { label: 'Plain clip', src: CLIP_URL },
  poster: { label: 'With poster', src: clip('poster'), poster: POSTER_URL },
  portrait: { label: 'Portrait 9:16', src: clip('portrait'), aspectRatio: '9:16' },
  autoplay: { label: 'Autoplay (muted)', src: clip('autoplay'), autoplay: true, muted: true, lazy: false },
  preloadNone: { label: 'preload="none"', src: clip('preload-none'), preload: 'none', lazy: false },
  loop: { label: 'Looping', src: clip('loop'), loop: true },
  headless: { label: 'controls=false', src: clip('headless'), controls: false, autoplay: true, muted: true, lazy: false },
  captioned: {
    label: 'Captioned (English default)',
    src: clip('captioned'),
    tracks: [
      { src: './media/captions/bbb-en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
      { src: './media/captions/bbb-fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
    ],
  },
  playInView: { label: 'playInView', src: clip('play-in-view'), playInView: true },
  pinned: { label: 'Pinned when scrolled away', src: clip('pinned'), pin: 'bottom-left', muted: true },
  hls: { label: 'HLS (fMP4, same clip)', src: HLS_URL },
  broken: { label: 'Broken source (error + Retry)', src: MISSING_URL },
} satisfies Record<string, VideoEntry>

export const playlist: VideoEntry[] = [
  { label: 'Playlist item 1', src: clip('pl-1') },
  { label: 'Playlist item 2', src: clip('pl-2') },
]

export const variations: VideoEntry[] = Object.values(catalogue)
