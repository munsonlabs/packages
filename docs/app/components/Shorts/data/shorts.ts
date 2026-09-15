export interface Short {
  id: string
  src: string
  poster: string
  handle: string
  title: string
  likes: string
  comments: string
}

const BBB_POSTER = 'https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg'
const BBB_THUMB = 'https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg'

/** The stream posters are stand-ins rather than real frames, as in the demo app's data. */
const SOURCES = [
  { src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', poster: BBB_THUMB, handle: '@mux', title: 'HLS test stream, cropped to 9:16', likes: '12K', comments: '480' },
  { src: 'https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4', poster: BBB_POSTER, handle: '@blender', title: 'Big Buck Bunny — the classic', likes: '87K', comments: '2.1K' },
  { src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8', poster: BBB_THUMB, handle: '@apple', title: 'bipbop — adaptive bitrate', likes: '5.4K', comments: '96' },
]

/** `id` rather than `src` as the key: the same clip appears three times, and duplicate keys make the recycler's diff reuse the wrong slot. */
export const SHORTS: Short[] = Array.from({ length: 3 }, (_, repeat) => SOURCES.map((s, i) => ({ ...s, id: `${repeat}-${i}` }))).flat()
