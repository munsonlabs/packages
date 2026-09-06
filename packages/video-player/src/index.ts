import type { App, Plugin } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import VideoStage from '@/components/VideoStage.vue'
import VideoPlaceholder from '@/components/VideoPlaceholder.vue'
import VideoCard from '@/components/VideoCard.vue'
import HideMarker from '@/components/HideMarker.vue'
import Scrubber from '@/components/controls/Scrubber.vue'
import PlayButton from '@/components/controls/PlayButton.vue'
import MuteButton from '@/components/controls/MuteButton.vue'
import FullscreenButton from '@/components/controls/FullscreenButton.vue'
import Buffering from '@/components/controls/Buffering.vue'
import LoopButton from '@/components/controls/LoopButton.vue'
import PipButton from '@/components/controls/PipButton.vue'
import CaptionsButton from '@/components/controls/CaptionsButton.vue'
import QualityButton from '@/components/controls/QualityButton.vue'
import PlaybackRateButton from '@/components/controls/PlaybackRateButton.vue'
import VolumeSlider from '@/components/controls/VolumeSlider.vue'
import TimeDisplay from '@/components/controls/TimeDisplay.vue'
import Transcript from '@/components/controls/Transcript.vue'
import { getPlatform, registerPlatform, registerMatcher, registerEmbedAdapter, registerSourceResolver } from '@/adapters/index'

const VideoPlayerPlugin: Plugin = {
  install(app: App) {
    app.component('VideoPlayer', VideoPlayer)
    app.component('VideoStage', VideoStage)
    app.component('VideoPlaceholder', VideoPlaceholder)
    app.component('VideoCard', VideoCard)
    app.component('HideMarker', HideMarker)
    app.component('Scrubber', Scrubber)
    app.component('PlayButton', PlayButton)
    app.component('MuteButton', MuteButton)
    app.component('FullscreenButton', FullscreenButton)
    app.component('Buffering', Buffering)
    app.component('LoopButton', LoopButton)
    app.component('PipButton', PipButton)
    app.component('CaptionsButton', CaptionsButton)
    app.component('QualityButton', QualityButton)
    app.component('PlaybackRateButton', PlaybackRateButton)
    app.component('VolumeSlider', VolumeSlider)
    app.component('TimeDisplay', TimeDisplay)
    app.component('Transcript', Transcript)
  },
}

export {
  VideoPlayer,
  VideoStage,
  VideoPlaceholder,
  VideoCard,
  HideMarker,
  Scrubber,
  PlayButton,
  MuteButton,
  FullscreenButton,
  Buffering,
  LoopButton,
  PipButton,
  CaptionsButton,
  QualityButton,
  PlaybackRateButton,
  VolumeSlider,
  TimeDisplay,
  Transcript,
  VideoPlayerPlugin,
  getPlatform,
  registerPlatform,
  registerMatcher,
  registerEmbedAdapter,
  registerSourceResolver,
}
export * from '@/types/player'
/** Types only - the injection keys themselves are internal DI plumbing, unusable externally. */
export type { PlayerContext, HudContext, PlaylistContext } from '@/composables/player/playerContext'
export { useScrubber } from '@/composables/controls/useScrubber'
export { useCaptions } from '@/composables/overlay/useCaptions'
export { useQuality } from '@/composables/overlay/useQuality'
export { usePlaybackRate } from '@/composables/overlay/usePlaybackRate'
export { useForwardedPlayer } from '@/composables/useForwardedPlayer'
export type { ForwardedPlayer, MethodKey, UseForwardedPlayerReturn } from '@/composables/useForwardedPlayer'
export { exposePlayerOnElement } from '@/composables/exposePlayerOnElement'
export type {
  CaptionTrackInfo,
  QualityLevelInfo,
  PlaybackAdapter,
  MediaErrorLike,
  PlatformConfig,
  Matcher,
  EmbedAdapterFactory,
  SourceResolver,
  ResolvedSource,
} from '@/types/playback'
export type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'
export default VideoPlayerPlugin
