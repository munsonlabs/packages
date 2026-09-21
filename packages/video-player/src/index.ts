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
import { resolvePlatform, registerPlatform } from '@/adapters/index'

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
  resolvePlatform,
  registerPlatform,
}
export * from '@/types/player'
export type { PlayerContext, HudContext, PlaylistContext } from '@/composables/player/playerContext'
export { useScrubber } from '@/composables/controls/useScrubber'
export { useSpokenCues } from '@/composables/controls/useSpokenCues'
export type { SpokenCuesOptions, UseSpokenCuesReturn } from '@/composables/controls/useSpokenCues'
export { cycleCaptionTrack, captionTrackLabel, cycleQuality, qualityLabel, cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
export { useForwardedPlayer } from '@/composables/useForwardedPlayer'
export type { ForwardedPlayer, UseForwardedPlayerReturn } from '@/composables/useForwardedPlayer'
export type { PlayerMethodKey, PlayerStateKey } from '@/composables/player/playerSurface'
export { exposePlayerOnElement } from '@/composables/exposePlayerOnElement'
export type {
  CaptionTrackInfo,
  QualityLevelInfo,
  PlaybackAdapter,
  AdapterCaptions,
  AdapterQuality,
  AdapterPip,
  PlaybackEvent,
  MediaErrorLike,
  PlatformConfig,
  Matcher,
  EmbedAdapterFactory,
  SourceResolver,
  ResolvedSource,
  EmbedAdapterOptions,
} from '@/types/playback'
export default VideoPlayerPlugin
