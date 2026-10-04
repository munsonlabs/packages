import { ref, computed, shallowRef } from 'vue'
import type { CaptionTrackInfo, QualityLevelInfo } from '@/types/playback'
import type { ClipRange, PlayerProps } from '@/types/player'
import { resolveInitialMuted, resolveInitialVolume } from '@/ui/player/adapterMount'

export function createPlayerState(props: PlayerProps) {
  const current = ref(0)
  const total = ref(0)
  const buffered = ref(0)
  const vol = ref(resolveInitialVolume(props))
  const isMuted = ref(resolveInitialMuted(props.muted, !!(props.autoplay || props.playInView)))
  const progress = computed(() => (total.value ? (current.value / total.value) * 100 : 0))
  const controlsOverride = ref<boolean | null>(null)

  return {
    isPlaying: ref(false),
    hasEnded: ref(false),
    isReady: ref(false),
    isLoaded: ref(false),
    isLive: ref(false),
    hasStarted: ref(false),
    isError: ref(false),
    errorMessage: ref(''),
    currentTime: current,
    duration: total,
    buffered,
    progress,
    bufferedDisplay: computed(() => Math.max(buffered.value, progress.value)),
    currentVolume: vol,
    isMuted,
    isAudible: computed(() => !isMuted.value && vol.value > 0),
    isLooping: ref(!!props.loop),
    /** Not `playbackRate` or `volume`: on a custom element the prop's own DOM property would shadow an exposed field of the same name. Same for `isNativeUi`. */
    currentPlaybackRate: ref(props.playbackRate ?? 1),
    supportsPlaybackRate: ref(false),
    isAdPlaying: ref(false),
    isAdPaused: ref(false),
    isAdMuted: ref(false),
    adRemainingTime: ref(0),
    supportsCaptions: ref(false),
    captionTracks: ref<CaptionTrackInfo[]>([]),
    activeCaptionIndex: ref<number | null>(null),
    supportsQuality: ref(false),
    qualityLevels: ref<QualityLevelInfo[]>([]),
    currentQualityHeight: ref<number | null>(null),
    isAutoQuality: ref(true),
    supportsPip: ref(false),
    isPipActive: ref(false),
    isNativeUi: ref(false),
    controlsOverride,
    /**
     * Whether the HUD is rendered: the `controls` prop, unless `setControls()` has overridden it (a
     * page tool that takes the picture over, such as a clip editor, hides the HUD for a while).
     */
    hasControls: computed(() => controlsOverride.value ?? props.controls !== false),
    /** Set by `setClipRange()` or a deep link (`#ml-t=42,52`); the scrubber highlights it. */
    clipRange: ref<ClipRange | null>(null),
    /**
     * The `<video>` the native path plays (MP4, HLS, DASH), for reading frame-accurate time;
     * `null` before the adapter mounts and for embeds, whose media lives in someone else's iframe.
     */
    mediaElement: shallowRef<HTMLVideoElement | null>(null),
  }
}

export type PlayerState = ReturnType<typeof createPlayerState>
