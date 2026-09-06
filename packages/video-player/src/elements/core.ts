import { defineCustomElement } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import VideoStage from '@/components/VideoStage.vue'
import VideoPlaceholder from '@/components/VideoPlaceholder.vue'
import VideoCard from '@/components/VideoCard.vue'
import HideMarker from '@/components/HideMarker.vue'
import { registerPlatform, registerMatcher, registerEmbedAdapter, registerSourceResolver } from '@/adapters/index'

/** Shadow DOM is not an option - embed SDKs mount by resolving a plain element ID via document.getElementById, which can't see into one. */
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

/**
 * `customElements.define()` synchronously upgrades any matching tag already in the DOM, which can
 * race a `registerPlatform()` call right after importing this module (see README). Load via a
 * `?defer` import-map query param and call `defineElements()` yourself after registering, for the
 * static-markup case. Idempotent - only defines whichever tags aren't already registered.
 */
export function defineElements(): void {
  for (const [tag, ctor] of TAGS) {
    if (!customElements.get(tag)) customElements.define(tag, ctor)
  }
}

const deferred = typeof import.meta.url === 'string' && new URL(import.meta.url).searchParams.has('defer')
if (!deferred) defineElements()

export { VideoPlayerElement, VideoStageElement, VideoPlaceholderElement, VideoCardElement, HideMarkerElement }

/** Each `/element*` bundle is its own independent build - registering here only affects players created from this bundle. */
export { registerPlatform, registerMatcher, registerEmbedAdapter, registerSourceResolver }
export type { PlatformConfig, Matcher, EmbedAdapterFactory, SourceResolver, ResolvedSource, PlaybackAdapter, MediaErrorLike } from '@/types/playback'
export type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'
