export interface Short {
  id: string
  src: string
  poster: string
  handle: string
  title: string
  likes: string
  comments: string
}

const SRC = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
const POSTER = 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg'

const SOURCES = [
  { src: SRC, poster: POSTER, handle: '@blender', title: 'Big Buck Bunny — the classic', likes: '87K', comments: '2.1K' },
  { src: SRC, poster: POSTER, handle: '@mux', title: 'HLS, cropped to 9:16', likes: '12K', comments: '480' },
  { src: SRC, poster: POSTER, handle: '@peach', title: 'Open movie, open codec', likes: '5.4K', comments: '96' },
]

/** `id` rather than `src` as the key: the same clip appears three times, and duplicate keys make the recycler's diff reuse the wrong slot. */
export const SHORTS: Short[] = Array.from({ length: 3 }, (_, repeat) => SOURCES.map((s, i) => ({ ...s, id: `${repeat}-${i}` }))).flat()
