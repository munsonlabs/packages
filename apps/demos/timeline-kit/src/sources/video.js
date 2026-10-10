import { computed } from 'vue'
import { imageUrl, composableSource } from './shared'

/** Every entry type `videoUrl` understands. Bolt has one per platform. */
export const VIDEO_TYPES = ['video', 'youtube', 'vimeo', 'dailymotion', 'jwplayer', 'brightcove', 'videojs']

/** A URL `@munsonlabs/video-player` can play, from whichever fields the story's platform uses. */
export function videoUrl(entry) {
  const id = entry.videoid
  switch (entry.type) {
    case 'youtube':
      return entry.videourl || (id ? `https://www.youtube.com/watch?v=${id}` : undefined)
    case 'vimeo':
      return entry.videourl || (id ? `https://vimeo.com/${id}` : undefined)
    case 'dailymotion':
      return entry.videourl || (id ? `https://www.dailymotion.com/video/${id}` : undefined)
    case 'jwplayer':
      return entry.videourl || (entry.videokey ? `jwplayer://${entry.videokey}` : undefined)
    case 'brightcove': {
      const { brightcove_account_id: account, brightcove_player: player, brightcove_video_id: video } = entry
      if (!account || !player || !video) return entry.videourl || undefined
      return `https://players.brightcove.net/${account}/${player}_${entry.brightcove_embed || 'default'}/index.html?videoId=${video}`
    }
    default:
      return entry.videourl || entry.video_sources?.[0]?.url || undefined
  }
}

/** What a video story plays. */
export function useVideo(props) {
  const src = computed(() => videoUrl(props.story.entry))
  return {
    src,
    poster: computed(() => imageUrl(props.story.entry.images?.[0]?.src, props.story.baseURL)),
    hasVideo: computed(() => !!src.value),
    duration: computed(() => props.story.entry.duration),
  }
}

export const videoSource = composableSource({
  id: 'video',
  label: 'Video',
  description: 'What a video story plays, on whichever platform it uses.',
  fields: {
    src: { type: 'string', description: 'A file, HLS, DASH, or a YouTube, Vimeo, Dailymotion, JW Player or Brightcove link' },
    poster: { type: 'string', description: 'Poster image' },
    hasVideo: { type: 'boolean', description: 'Has something to play' },
    duration: { type: 'string', description: 'Running time' },
  },
  use: useVideo,
})
