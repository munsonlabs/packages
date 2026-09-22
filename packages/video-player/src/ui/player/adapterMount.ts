import type { Ref } from 'vue'
import { resolveSource, createEmbedAdapter } from '@/adapters/index'
import { createNativeAdapter } from '@/adapters/native'
import type { PlaybackAdapter, ResolvedSource } from '@/types/playback'
import type { PlayerProps } from '@/types/player'
import type { AdSetup } from '@/ui/player/features/createAdSetup'
import { getAudioPreference, hasUnmutedThisSession } from '@/preferences/audioPreference'

/** Fills `{macro}` tokens in whichever ad tag ends up in use, including one an auto-discovered source supplied. */
export function applyAdTagParams(adTagUrl: string, params: Record<string, string> | undefined): string {
  if (!params || !Object.keys(params).length) return adTagUrl

  let result = adTagUrl
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    result = result.split(`{${key}}`).join(encodeURIComponent(value))
  }
  return result
}

export interface MountedAdapter {
  adapter: PlaybackAdapter
  nativeUi?: boolean
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
    mounted: { adapter: embedAdapter, nativeUi: !!props.nativeUi },
  }
}

async function mountNativeAdapter(
  platformKey: string,
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  initial: InitialPlayback,
  adSetup: AdSetup,
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
    captionLine: props.captionLine,
  })

  const baseAdTag = applyAdTagParams(props.adTagUrl || resolved.adTagUrl || '', props.adMacroParams)
  void adSetup.attach(videoEl.value, nativeAdapter, baseAdTag, props.headerBidding)

  return { status: 'mounted', mounted: { adapter: nativeAdapter } }
}

export function mountAdapter(
  platform: { key: string; embed: boolean },
  videoEl: Ref<HTMLVideoElement | null>,
  props: PlayerProps,
  initial: InitialPlayback,
  adSetup: AdSetup,
): Promise<MountResult> {
  return platform.embed
    ? mountEmbedAdapter(platform.key, videoEl, props, initial)
    : mountNativeAdapter(platform.key, videoEl, props, initial, adSetup)
}
