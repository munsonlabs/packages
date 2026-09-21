import type { App, Plugin } from 'vue'
import VideoPlayer from '@/player/VideoPlayer.vue'
import VideoStage from '@/stage/VideoStage.vue'
import VideoPlaceholder from '@/stage/VideoPlaceholder.vue'
import VideoCard from '@/stage/VideoCard.vue'
import HideMarker from '@/stage/HideMarker.vue'
import Scrubber from '@/controls/Scrubber.vue'
import PlayButton from '@/controls/PlayButton.vue'
import MuteButton from '@/controls/MuteButton.vue'
import FullscreenButton from '@/controls/FullscreenButton.vue'
import Buffering from '@/controls/Buffering.vue'
import LoopButton from '@/controls/LoopButton.vue'
import PipButton from '@/controls/PipButton.vue'
import CaptionsButton from '@/controls/CaptionsButton.vue'
import QualityButton from '@/controls/QualityButton.vue'
import PlaybackRateButton from '@/controls/PlaybackRateButton.vue'
import VolumeSlider from '@/controls/VolumeSlider.vue'
import TimeDisplay from '@/controls/TimeDisplay.vue'
import Transcript from '@/controls/Transcript.vue'
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
export type { PlayerContext, HudContext, PlaylistContext } from '@/player/playerContext'
export { useScrubber } from '@/controls/useScrubber'
export { useSpokenCues } from '@/controls/useSpokenCues'
export type { SpokenCuesOptions, UseSpokenCuesReturn } from '@/controls/useSpokenCues'
export { cycleCaptionTrack, captionTrackLabel, cycleQuality, qualityLabel, cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
export { useForwardedPlayer } from '@/player/useForwardedPlayer'
export type { ForwardedPlayer, UseForwardedPlayerReturn } from '@/player/useForwardedPlayer'
export type { PlayerMethodKey, PlayerStateKey } from '@/player/playerSurface'
export { exposePlayerOnElement } from '@/utils/exposePlayerOnElement'
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
