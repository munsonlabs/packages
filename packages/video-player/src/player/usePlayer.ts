import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { resolvePlatform } from '@/adapters/index'
import { registerPauseHandler } from '@/registries/playerRegistry'
import { createPlayerState, type PlayerState } from '@/player/playerState'
import { useFullscreen } from '@/player/features/useFullscreen'
import { useBuffering } from '@/player/features/useBuffering'
import { createQuartileEvents } from '@/player/features/createQuartileEvents'
import { usePositionMemory } from '@/player/features/usePositionMemory'
import { useAutoPauseOffscreen } from '@/player/viewport/useAutoPauseOffscreen'
import { useAutoPlayInView } from '@/player/viewport/useAutoPlayInView'
import { createPlayerControls, type PlayerControls } from '@/player/createPlayerControls'
import { createPlayerEvents } from '@/player/createPlayerEvents'
import { createAdSetup } from '@/player/features/createAdSetup'
import { mountAdapter, type MountedAdapter } from '@/player/adapterMount'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerProps, StateChangeEvent, StateChangeType } from '@/types/player'

export type UsePlayerReturn = PlayerState &
  PlayerControls & {
    fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
    retry: () => void
    isBuffering: Ref<boolean>
    toggleAdMute: () => void
    isFullscreen: Ref<boolean>
    isFullscreenPending: Ref<boolean>
    toggleFullscreen: () => void
  }

export function usePlayer(
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  emit: (event: 'state-change', payload: StateChangeEvent) => void,
): UsePlayerReturn {
  let adapter: PlaybackAdapter | null = null
  let unregister: (() => void) | null = null

  const state = createPlayerState(props)
  const {
    isReady,
    isLoaded,
    isLive,
    currentTime: current,
    duration: total,
    isMuted,
    currentVolume: vol,
    currentPlaybackRate,
    hasEnded,
    hasStarted,
    isError,
    errorMessage,
    isNativeUi,
  } = state
  const getPlayer = (): PlaybackAdapter | null => adapter

  const payload = computed<Record<string, unknown>>(() => {
    if (typeof props.payload !== 'string') return props.payload ?? {}
    try {
      return JSON.parse(props.payload)
    } catch {
      return {}
    }
  })

  function fire(type: StateChangeType, extras: Partial<StateChangeEvent> = {}): void {
    emit('state-change', { type, currentTime: current.value, duration: total.value, src: props.src, ...extras, payload: payload.value })
  }

  const fullscreen = useFullscreen(getPlayer)
  const buffering = useBuffering(fire)
  const positionMemory = usePositionMemory(props.src, getPlayer, hasEnded)
  const quartiles = createQuartileEvents(current, total, fire)
  const adSetup = createAdSetup(state, { fire, pauseThisPlayer: () => controls.pause() })
  const controls = createPlayerControls(state, getPlayer, adSetup, fire)
  const { attachPlayerEvents } = createPlayerEvents(state, {
    fire,
    pauseThisPlayer: controls.pause,
    positionMemory,
    quartiles,
    buffering,
    fullscreen,
  })

  function retry(): void {
    if (!adapter) return
    isError.value = false
    errorMessage.value = ''
    isLoaded.value = false
    total.value = 0
    adapter.retry()
  }

  watch([total, isLive], ([duration, live]) => {
    if (isLoaded.value || (!duration && !live)) return
    isLoaded.value = true
    fire('loaded')
  })

  watch(
    () => props.loop,
    (val) => {
      if (val !== undefined && val !== state.isLooping.value) controls.toggleLoop()
    },
  )
  watch(
    () => props.muted,
    (val) => {
      if (adapter && val !== undefined) adapter.setMuted(val)
    },
  )
  watch(
    () => props.playbackRate,
    (val) => {
      if (adapter && val !== undefined) adapter.setPlaybackRate(val)
    },
  )
  watch(
    () => [props.quality, state.qualityLevels.value.length] as const,
    ([height, levelCount]) => {
      if (height === undefined || !levelCount) return
      if (height === null) {
        if (!state.isAutoQuality.value) controls.setQuality(null)
        return
      }
      controls.setQuality(height)
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
    if (mounted.nativeUi !== undefined) isNativeUi.value = mounted.nativeUi
    unregister = registerPauseHandler(controls.pause)
    attachPlayerEvents(mounted.adapter)
  }

  // Embeds hide the placeholder <video> behind their iframe until playback really starts; native playback has no reveal to do.
  watch(hasStarted, (started) => {
    if (!started || !videoEl.value) return
    adapter?.reveal?.(videoEl.value)
  })

  onMounted(async () => {
    const platform = resolvePlatform(props.src)
    const initial = { muted: isMuted.value, volume: vol.value, playbackRate: currentPlaybackRate.value }
    const result = await mountAdapter(platform, videoEl, props, initial, adSetup)
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
    ...state,
    ...controls,
    fire,
    retry,
    isBuffering: buffering.isBuffering,
    toggleAdMute: adSetup.toggleAdMute,
    isFullscreen: fullscreen.isFullscreen,
    isFullscreenPending: fullscreen.isFullscreenPending,
    toggleFullscreen: fullscreen.toggleFullscreen,
  }
}
