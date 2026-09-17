import type { Ref } from 'vue'
import { resolveSource, createEmbedAdapter } from '@/adapters/index'
import { createNativeAdapter } from '@/adapters/native'
import { applyAdTagParams } from '@/utils/adTags'
import type { PlaybackAdapter, ResolvedSource } from '@/types/playback'
import type { PlayerProps } from '@/types/player'
import type { UseAdSetupReturn } from '@/composables/player/useAdSetup'
import { getAudioPreference, hasUnmutedThisSession } from '@/utils/audioPreference'

export interface MountedAdapter {
  adapter: PlaybackAdapter
  currentSrc: { src: string; type?: string }
  nativeUi?: boolean
  /** Only embed adapters mount a hidden placeholder that needs revealing once playback starts - see embedShared.createEmbedMount. */
  needsReveal: boolean
}

export type MountResult = { status: 'mounted'; mounted: MountedAdapter } | { status: 'unsupported' } | { status: 'aborted' }

/** Gesture-less autoplay must start muted (browser policy) unless a gesture already unmuted something this session. */
export function resolveInitialMuted(explicitMuted: boolean | undefined, isAutoplayish: boolean): boolean {
  if (explicitMuted !== undefined) return explicitMuted
  if (isAutoplayish && !hasUnmutedThisSession()) return true
  return getAudioPreference().muted
}

export function resolveInitialVolume(props: PlayerProps): number {
  return props.volume ?? getAudioPreference().volume
}

export interface InitialPlayback {
  muted: boolean
  volume: number
  playbackRate: number
}

async function mountEmbedAdapter(
  platformKey: string,
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  initial: InitialPlayback,
): Promise<MountResult> {
  if (!videoEl.value) return { status: 'aborted' }
  const embedAdapter = await createEmbedAdapter(platformKey, videoEl.value, {
    src: props.src,
    poster: props.poster,
    autoplay: props.autoplay,
    muted: initial.muted,
    volume: initial.volume,
    nativeUi: props.nativeUi,
  })
  if (!videoEl.value) return { status: 'aborted' }
  if (!embedAdapter) return { status: 'unsupported' }
  return {
    status: 'mounted',
    mounted: { adapter: embedAdapter, currentSrc: { src: props.src }, nativeUi: !!props.nativeUi, needsReveal: true },
  }
}

async function mountNativeAdapter(
  platformKey: string,
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  initial: InitialPlayback,
  adSetup: UseAdSetupReturn,
): Promise<MountResult> {
  const resolved = await resolveSource(platformKey, props.src).catch((): ResolvedSource => ({ src: props.src }))
  if (!videoEl.value) return { status: 'aborted' }

  const nativeAdapter = createNativeAdapter(videoEl.value, {
    src: resolved.src,
    type: resolved.type,
    poster: resolved.poster || props.poster || '',
    autoplay: props.autoplay,
    ...initial,
    preload: props.preload,
  })

  const baseAdTag = applyAdTagParams(props.adTagUrl || resolved.adTagUrl || '', props.adMacroParams)
  void adSetup.attach(videoEl.value, nativeAdapter, baseAdTag, props.headerBidding)

  return { status: 'mounted', mounted: { adapter: nativeAdapter, currentSrc: { src: resolved.src, type: resolved.type }, needsReveal: false } }
}

export function mountAdapter(
  platform: { key: string; embed: boolean },
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  initial: InitialPlayback,
  adSetup: UseAdSetupReturn,
): Promise<MountResult> {
  return platform.embed
    ? mountEmbedAdapter(platform.key, videoEl, props, initial)
    : mountNativeAdapter(platform.key, videoEl, props, initial, adSetup)
}
