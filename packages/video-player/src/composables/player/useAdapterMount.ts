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

/** Both terminal, not errors to retry - `unsupported` means no registered embed factory, `aborted` means the component unmounted before resolving. */
export type MountResult = { status: 'mounted'; mounted: MountedAdapter } | { status: 'unsupported' } | { status: 'aborted' }

/**
 * Autoplay-ish playback with no user gesture must start muted - a hard browser policy, not a
 * preference - unless a real gesture has already unmuted something this session
 * (hasUnmutedThisSession). Re-run at actual playback time, not just at mount, since that state
 * can change while a playInView player sits mounted-but-paused.
 */
export function resolveInitialMuted(explicitMuted: boolean | undefined, isAutoplayish: boolean): boolean {
  if (explicitMuted !== undefined) return explicitMuted
  if (isAutoplayish && !hasUnmutedThisSession()) return true
  return getAudioPreference().muted
}

/** No browser-policy constraint applies to volume, so this is unconditional - always the stored preference unless the consumer set `volume` explicitly. */
export function resolveInitialVolume(props: PlayerProps): number {
  return props.volume ?? getAudioPreference().volume
}

function resolveInitialAudio(props: PlayerProps): { muted: boolean; volume: number } {
  return {
    muted: resolveInitialMuted(props.muted, !!(props.autoplay || props.playInView)),
    volume: resolveInitialVolume(props),
  }
}

async function mountEmbedAdapter(platformKey: string, videoEl: Ref<HTMLVideoElement | null>, props: PlayerProps): Promise<MountResult> {
  if (!videoEl.value) return { status: 'aborted' }
  const embedAdapter = await createEmbedAdapter(platformKey, videoEl.value, {
    src: props.src,
    poster: props.poster,
    autoplay: props.autoplay,
    ...resolveInitialAudio(props),
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
  playbackRate: Ref<number>,
  adSetup: UseAdSetupReturn,
): Promise<MountResult> {
  const resolved = await resolveSource(platformKey, props.src).catch((): ResolvedSource => ({ src: props.src }))
  if (!videoEl.value) return { status: 'aborted' }

  const nativeAdapter = createNativeAdapter(videoEl.value, {
    src: resolved.src,
    type: resolved.type,
    poster: resolved.poster || props.poster || '',
    autoplay: props.autoplay,
    ...resolveInitialAudio(props),
    playbackRate: playbackRate.value,
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
  playbackRate: Ref<number>,
  adSetup: UseAdSetupReturn,
): Promise<MountResult> {
  return platform.embed ? mountEmbedAdapter(platform.key, videoEl, props) : mountNativeAdapter(platform.key, videoEl, props, playbackRate, adSetup)
}
