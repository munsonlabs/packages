import { ref, computed } from 'vue'
import type { CaptionTrackInfo, QualityLevelInfo } from '@/types/playback'
import type { PlayerProps } from '@/types/player'
import { resolveInitialMuted, resolveInitialVolume } from '@/player/adapterMount'

export function createPlayerState(props: PlayerProps) {
  const current = ref(0)
  const total = ref(0)
  const buffered = ref(0)
  const vol = ref(resolveInitialVolume(props))
  const isMuted = ref(resolveInitialMuted(props.muted, !!(props.autoplay || props.playInView)))
  const progress = computed(() => (total.value ? (current.value / total.value) * 100 : 0))

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
  }
}

export type PlayerState = ReturnType<typeof createPlayerState>
