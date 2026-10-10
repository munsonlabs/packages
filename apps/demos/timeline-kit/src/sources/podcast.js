import { computed } from 'vue'
import { imageUrl, composableSource } from './shared'

/** A podcast episode: its show, length and artwork, and playing it in the app's native player. */
export function usePodcast(props, host) {
  const isPlaying = computed(() => !!props.story.playing)
  return {
    show: computed(() => props.story.entry.show),
    duration: computed(() => props.story.entry.duration),
    artwork: computed(() => imageUrl(props.story.entry.images?.[0]?.src, props.story.baseURL)),
    isPlaying,
    togglePlay() {
      // The native player owns play and pause: it plays this, or pauses it if it's playing.
      host.openAudio(props.story, { title: props.story.entry.title, show: props.story.entry.show }, props.index)
      host.sendAnalytics(isPlaying.value ? 'BoltAudioPause' : 'BoltAudioPlay', props.story, props.index)
    },
  }
}

export const podcastSource = composableSource({
  id: 'podcast',
  label: 'Podcast',
  description: "An episode's show, length and artwork, and playing it.",
  fields: {
    show: { type: 'string', description: 'The show it belongs to' },
    duration: { type: 'string', description: 'Running time' },
    artwork: { type: 'string', description: 'Episode or show artwork' },
    isPlaying: { type: 'boolean', description: "Playing in the host's player" },
    togglePlay: { type: 'action', description: 'Play or pause it' },
  },
  use: usePodcast,
})
