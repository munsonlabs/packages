import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import { resolvePlatform } from '@/adapters/index'
import { revealEmbed } from '@/adapters/embeds/embedShared'
import { registerPauseHandler } from '@/composables/registries/playerRegistry'
import { createPlayerState, type PlayerState } from '@/composables/player/playerState'
import { useFullscreen } from '@/composables/player/features/useFullscreen'
import { useBuffering } from '@/composables/player/features/useBuffering'
import { useQuartileEvents } from '@/composables/player/features/useQuartileEvents'
import { usePositionMemory } from '@/composables/player/features/usePositionMemory'
import { useAutoPauseOffscreen } from '@/composables/player/viewport/useAutoPauseOffscreen'
import { useAutoPlayInView } from '@/composables/player/viewport/useAutoPlayInView'
import { usePlayerControls, type UsePlayerControlsReturn } from '@/composables/player/usePlayerControls'
import { usePlayerEvents } from '@/composables/player/usePlayerEvents'
import { useAdSetup } from '@/composables/player/features/useAdSetup'
import { mountAdapter, type MountedAdapter } from '@/composables/player/useAdapterMount'
import type { PlaybackAdapter } from '@/types/playback'
import type { PlayerProps, StateChangeEvent, StateChangeType } from '@/types/player'

export type UsePlayerReturn = PlayerState &
  UsePlayerControlsReturn & {
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
  let currentSrcObj: { src: string; type?: string } | null = null
  let needsReveal = false

  const state = createPlayerState(props)
  const { isReady, isLoaded, isLive, current, total, isMuted, vol, currentPlaybackRate, hasEnded, hasStarted, isError, errorMessage, isNativeUi } =
    state
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
  const quartiles = useQuartileEvents(current, total, fire)
  const adSetup = useAdSetup(state, { fire, pauseThisPlayer: () => controls.pause() })
  const controls = usePlayerControls(state, getPlayer, adSetup, fire)
  const { attachPlayerEvents } = usePlayerEvents(state, { fire, pauseThisPlayer: controls.pause, positionMemory, quartiles, buffering, fullscreen })

  function retry(): void {
    if (!adapter || !currentSrcObj) return
    isError.value = false
    errorMessage.value = ''
    isLoaded.value = false
    total.value = 0
    adapter.setSrc(currentSrcObj.src, currentSrcObj.type)
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
    if (mounted.nativeUi !== undefined) isNativeUi.value = mounted.nativeUi
    unregister = registerPauseHandler(controls.pause)
    attachPlayerEvents(mounted.adapter)
  }

  watch(hasStarted, (started) => {
    if (!started || !needsReveal || !videoEl.value || !adapter) return
    revealEmbed(videoEl.value, adapter.el as HTMLDivElement)
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
