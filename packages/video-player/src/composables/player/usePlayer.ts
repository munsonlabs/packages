import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { resolvePlatform } from '@/adapters/index'
import { revealEmbed } from '@/adapters/embeds/embedShared'
import { fmtTime } from '@/utils/time'
import { registerPauseHandler } from '@/composables/registries/playerRegistry'
import { useFullscreen } from '@/composables/player/useFullscreen'
import { useBuffering } from '@/composables/player/useBuffering'
import { useQuartileEvents } from '@/composables/player/useQuartileEvents'
import { usePositionMemory } from '@/composables/player/usePositionMemory'
import { useAutoPauseOffscreen } from '@/composables/player/useAutoPauseOffscreen'
import { useAutoPlayInView } from '@/composables/player/useAutoPlayInView'
import { usePlayerControls } from '@/composables/player/usePlayerControls'
import { usePlayerEvents } from '@/composables/player/usePlayerEvents'
import { useAdSetup } from '@/composables/player/useAdSetup'
import { mountAdapter, resolveInitialMuted, resolveInitialVolume, type MountedAdapter } from '@/composables/player/useAdapterMount'
import type { PlaybackAdapter, CaptionTrackInfo, QualityLevelInfo } from '@/types/playback'
import type { PlayerProps, StateChangeEvent, StateChangeType } from '@/types/player'

export interface UsePlayerReturn {
  isPlaying: Ref<boolean>
  hasEnded: Ref<boolean>
  isReady: Ref<boolean>
  isLive: Ref<boolean>
  isBuffering: Ref<boolean>
  current: Ref<number>
  total: Ref<number>
  progress: ComputedRef<number>
  bufferedDisplay: ComputedRef<number>
  hasStarted: Ref<boolean>
  isError: Ref<boolean>
  errorMessage: Ref<string>
  fmt: (s: number) => string
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
  retry: () => void
  togglePlay: () => void
  seek: (val: number) => void

  isAdPlaying: Ref<boolean>
  isAdPaused: Ref<boolean>
  isAdMuted: Ref<boolean>
  adRemainingTime: Ref<number>
  toggleAdMute: () => void

  vol: Ref<number>
  isMuted: Ref<boolean>
  isAudible: ComputedRef<boolean>
  toggleMute: () => void
  setVolume: (val: number) => void
  isLooping: Ref<boolean>
  toggleLoop: () => void
  /** Named differently from the `playbackRate` prop, or a custom element's defineExpose()'d version would be silently unreachable behind the prop's own DOM property. Same reasoning for `isNativeUi` below. */
  currentPlaybackRate: Ref<number>
  setPlaybackRate: (rate: number) => void
  supportsPlaybackRate: Ref<boolean>

  isFullscreen: Ref<boolean>
  isFullscreenPending: Ref<boolean>
  toggleFullscreen: () => void
  markFullscreenPending: () => void

  supportsCaptions: Ref<boolean>
  captionTracks: Ref<CaptionTrackInfo[]>
  activeCaptionIndex: Ref<number | null>
  setCaptionTrack: (index: number | null) => void

  supportsQuality: Ref<boolean>
  qualityLevels: Ref<QualityLevelInfo[]>
  currentQualityIndex: Ref<number | null>
  isAutoQuality: Ref<boolean>
  setQuality: (index: number | null) => void

  supportsPip: Ref<boolean>
  isPipActive: Ref<boolean>
  togglePip: () => void

  isNativeUi: Ref<boolean>
}

export function usePlayer(
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  emit: (event: 'state-change', payload: StateChangeEvent) => void,
): UsePlayerReturn {
  let adapter: PlaybackAdapter | null = null
  let unregister: (() => void) | null = null
  let currentSrcObj: { src: string; type?: string } | null = null
  let needsReveal = false

  const isPlaying = ref(false)
  const hasEnded = ref(false)
  const isReady = ref(false)
  const isLive = ref(false)
  const current = ref(0)
  const total = ref(0)
  const buffered = ref(0)
  const vol = ref(resolveInitialVolume(props))

  const isAdPlaying = ref(false)
  const isAdPaused = ref(false)
  const isAdMuted = ref(false)
  const adRemainingTime = ref(0)

  const isMuted = ref(resolveInitialMuted(props.muted, !!(props.autoplay || props.playInView)))
  const isLooping = ref(!!props.loop)
  const playbackRate = ref(props.playbackRate ?? 1)
  const supportsPlaybackRate = ref(false)

  const supportsCaptions = ref(false)
  const captionTracks = ref<CaptionTrackInfo[]>([])
  const activeCaptionIndex = ref<number | null>(null)

  const supportsQuality = ref(false)
  const qualityLevels = ref<QualityLevelInfo[]>([])
  const currentQualityIndex = ref<number | null>(null)
  const isAutoQuality = ref(true)

  const supportsPip = ref(false)
  const isPipActive = ref(false)

  const hasStarted = ref(false)
  const isError = ref(false)
  const errorMessage = ref('')
  const nativeUi = ref(false)

  const progress = computed(() => (total.value ? (current.value / total.value) * 100 : 0))
  const bufferedDisplay = computed(() => Math.max(buffered.value, progress.value))
  /** Volume dragged to 0 without hitting mute looks/sounds identical to actually muted - single source for anything picking a speaker icon off of that. */
  const isAudible = computed(() => !isMuted.value && vol.value > 0)

  const getPlayer = (): PlaybackAdapter | null => adapter

  /** See PlayerProps.payload's doc comment for why a string needs parsing here. */
  const payload = computed<Record<string, unknown>>(() => {
    if (typeof props.payload !== 'string') return props.payload ?? {}
    try {
      return JSON.parse(props.payload)
    } catch {
      return {}
    }
  })

  function fire(type: StateChangeType, extras: Partial<StateChangeEvent> = {}): void {
    emit('state-change', {
      type,
      currentTime: current.value,
      duration: total.value,
      src: props.src,
      ...extras,
      payload: payload.value,
    })
  }

  const fullscreen = useFullscreen(getPlayer)
  const buffering = useBuffering(fire)
  const positionMemory = usePositionMemory(props.src, getPlayer, hasEnded)
  const quartiles = useQuartileEvents(current, total, fire)

  function retry(): void {
    if (!adapter || !currentSrcObj) return
    isError.value = false
    errorMessage.value = ''
    adapter.setSrc(currentSrcObj.src, currentSrcObj.type)
  }

  /** Declared ahead of `adSetup`/`controls` on purpose - a genuine circular dependency, safe only because these are hoisted functions closing over those bindings, not their values. */
  function pauseThisPlayer(): void {
    if (adSetup.isAdPlaying()) {
      adSetup.pauseAd()
      return
    }
    adapter?.pause()
  }

  function togglePlay(): void {
    if (adSetup.isAdPlaying()) {
      if (adSetup.isAdPaused()) adSetup.resumeAd()
      else adSetup.pauseAd()
      return
    }
    controls.togglePlay()
  }

  const adSetup = useAdSetup({ isAdPlaying, isAdPaused, isAdMuted, adRemainingTime }, { fire, pauseThisPlayer })
  const controls = usePlayerControls(getPlayer, isReady, total, isLooping, playbackRate, isPlaying)

  const { attachPlayerEvents } = usePlayerEvents(
    {
      isPlaying,
      hasEnded,
      isReady,
      isAdPlaying,
      isLive,
      current,
      total,
      buffered,
      vol,
      isMuted,
      isLooping,
      playbackRate,
      supportsPlaybackRate,
      supportsCaptions,
      captionTracks,
      activeCaptionIndex,
      supportsQuality,
      qualityLevels,
      currentQualityIndex,
      isAutoQuality,
      supportsPip,
      isPipActive,
      hasStarted,
      isError,
      errorMessage,
    },
    { fire, pauseThisPlayer, positionMemory, quartiles, buffering, fullscreen },
  )

  function setCaptionTrack(index: number | null): void {
    adapter?.setCaptionTrack(index)
    activeCaptionIndex.value = index
    if (hasStarted.value) fire('captionchange', { captionIndex: index })
  }

  function setQuality(index: number | null): void {
    adapter?.setQuality(index)
    currentQualityIndex.value = index
    isAutoQuality.value = index === null
    if (hasStarted.value) fire('qualitychange', { qualityIndex: index })
  }

  function togglePip(): void {
    adapter?.togglePip()
  }

  function toggleLoop(): void {
    controls.toggleLoop()
    if (hasStarted.value) fire('loopchange', { isLooping: isLooping.value })
  }

  watch(
    () => props.loop,
    (val) => {
      if (val === undefined || val === isLooping.value) return
      toggleLoop()
    },
  )

  watch(
    () => props.muted,
    (val) => {
      if (!adapter || val === undefined) return
      adapter.setMuted(val)
    },
  )

  watch(
    () => props.playbackRate,
    (val) => {
      if (!adapter || val === undefined) return
      adapter.setPlaybackRate(val)
    },
  )

  useAutoPauseOffscreen(
    videoEl,
    getPlayer,
    fullscreen.isFullscreen,
    fullscreen.isFullscreenPending,
    computed(() => !!props.pin),
  )
  if (props.playInView) useAutoPlayInView(videoEl, getPlayer, fullscreen.isFullscreen, fullscreen.isFullscreenPending, props.muted)

  function finalizeAdapter(mounted: MountedAdapter): void {
    adapter = mounted.adapter
    currentSrcObj = mounted.currentSrc
    needsReveal = mounted.needsReveal
    if (mounted.nativeUi !== undefined) nativeUi.value = mounted.nativeUi
    unregister = registerPauseHandler(pauseThisPlayer)
    attachPlayerEvents(mounted.adapter)
  }

  /** Reveal the embed's placeholder once playback starts; native adapters set needsReveal false. */
  watch(hasStarted, (started) => {
    if (!started || !needsReveal || !videoEl.value || !adapter) return
    revealEmbed(videoEl.value, adapter.el as HTMLDivElement)
  })

  onMounted(async () => {
    const platform = resolvePlatform(props.src)
    const result = await mountAdapter(platform, videoEl, props, playbackRate, adSetup)
    if (result.status === 'unsupported') {
      isError.value = true
      isReady.value = true
      errorMessage.value = 'This platform is not yet supported.'
      return
    }
    if (result.status === 'mounted') finalizeAdapter(result.mounted)
  })

  onBeforeUnmount(() => {
    unregister?.()
    adSetup.dispose()
    adapter?.dispose()
    adapter = null
  })

  return {
    isPlaying,
    hasEnded,
    isReady,
    isLive,
    isBuffering: buffering.isBuffering,
    current,
    total,
    progress,
    bufferedDisplay,
    hasStarted,
    isError,
    errorMessage,
    fmt: fmtTime,
    fire,
    retry,
    togglePlay,
    seek: controls.seek,

    isAdPlaying,
    isAdPaused,
    isAdMuted,
    adRemainingTime,
    toggleAdMute: adSetup.toggleAdMute,

    vol,
    isMuted,
    isAudible,
    toggleMute: controls.toggleMute,
    setVolume: controls.setVolume,
    isLooping,
    toggleLoop,
    currentPlaybackRate: playbackRate,
    setPlaybackRate: controls.setPlaybackRate,
    supportsPlaybackRate,

    isFullscreen: fullscreen.isFullscreen,
    isFullscreenPending: fullscreen.isFullscreenPending,
    toggleFullscreen: fullscreen.toggleFullscreen,
    markFullscreenPending: fullscreen.markFullscreenPending,

    supportsCaptions,
    captionTracks,
    activeCaptionIndex,
    setCaptionTrack,

    supportsQuality,
    qualityLevels,
    currentQualityIndex,
    isAutoQuality,
    setQuality,

    supportsPip,
    isPipActive,
    togglePip,

    isNativeUi: nativeUi,
  }
}
