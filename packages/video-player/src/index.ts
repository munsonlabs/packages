import type { App, Plugin } from 'vue'
import VideoPlayer from '@/ui/player/VideoPlayer.vue'
import VideoStage from '@/ui/stage/VideoStage.vue'
import VideoPlaceholder from '@/ui/stage/VideoPlaceholder.vue'
import VideoCard from '@/ui/stage/VideoCard.vue'
import HideMarker from '@/ui/stage/HideMarker.vue'
import Scrubber from '@/ui/controls/Scrubber.vue'
import PlayButton from '@/ui/controls/PlayButton.vue'
import MuteButton from '@/ui/controls/MuteButton.vue'
import FullscreenButton from '@/ui/controls/FullscreenButton.vue'
import Buffering from '@/ui/controls/Buffering.vue'
import LoopButton from '@/ui/controls/LoopButton.vue'
import PipButton from '@/ui/controls/PipButton.vue'
import CaptionsButton from '@/ui/controls/CaptionsButton.vue'
import QualityButton from '@/ui/controls/QualityButton.vue'
import PlaybackRateButton from '@/ui/controls/PlaybackRateButton.vue'
import VolumeSlider from '@/ui/controls/VolumeSlider.vue'
import TimeDisplay from '@/ui/controls/TimeDisplay.vue'
import Transcript from '@/ui/controls/Transcript.vue'
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
export type { PlayerContext, HudContext, PlaylistContext } from '@/ui/player/playerContext'
export { useScrubber } from '@/ui/controls/useScrubber'
export { useSpokenCues } from '@/ui/controls/useSpokenCues'
export type { SpokenCuesOptions, UseSpokenCuesReturn } from '@/ui/controls/useSpokenCues'
export { cycleCaptionTrack, captionTrackLabel, cycleQuality, qualityLabel, cyclePlaybackRate, playbackRateLabel } from '@/utils/playerActions'
export { useForwardedPlayer } from '@/ui/player/useForwardedPlayer'
export type { ForwardedPlayer, UseForwardedPlayerReturn } from '@/ui/player/useForwardedPlayer'
export type { PlayerMethodKey, PlayerStateKey } from '@/ui/player/playerSurface'
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
