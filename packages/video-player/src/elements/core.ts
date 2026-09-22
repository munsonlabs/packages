import { defineCustomElement } from 'vue'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'
import VideoStage from '@/ui/stage/VideoStage.vue'
import VideoPlaceholder from '@/ui/stage/VideoPlaceholder.vue'
import VideoCard from '@/ui/stage/VideoCard.vue'
import HideMarker from '@/ui/stage/HideMarker.vue'
import { registerPlatform, resolvePlatform } from '@/adapters/index'

// Shadow DOM is not an option - embed SDKs mount by resolving a plain element ID via document.getElementById
const VideoPlayerElement = defineCustomElement(VideoPlayer, { shadowRoot: false })
const VideoStageElement = defineCustomElement(VideoStage, { shadowRoot: false })
const VideoPlaceholderElement = defineCustomElement(VideoPlaceholder, { shadowRoot: false })
const VideoCardElement = defineCustomElement(VideoCard, { shadowRoot: false })
const HideMarkerElement = defineCustomElement(HideMarker, { shadowRoot: false })

const TAGS: Array<[string, CustomElementConstructor]> = [
  ['ml-video-player', VideoPlayerElement],
  ['ml-video-stage', VideoStageElement],
  ['ml-video-placeholder', VideoPlaceholderElement],
  ['ml-video-card', VideoCardElement],
  ['ml-hide-marker', HideMarkerElement],
]

export function defineElements(): void {
  for (const [tag, ctor] of TAGS) {
    if (!customElements.get(tag)) customElements.define(tag, ctor)
  }
}

const deferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!deferred) defineElements()

export { VideoPlayerElement, VideoStageElement, VideoPlaceholderElement, VideoCardElement, HideMarkerElement }

export { registerPlatform, resolvePlatform }
export type {
  PlatformConfig,
  Matcher,
  EmbedAdapterFactory,
  SourceResolver,
  ResolvedSource,
  PlaybackAdapter,
  AdapterCaptions,
  AdapterQuality,
  AdapterPip,
  PlaybackEvent,
  MediaErrorLike,
  EmbedAdapterOptions,
} from '@/types/playback'
