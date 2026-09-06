import type { Ref } from 'vue'
import type { AdController } from '@/adapters/ads/ads'
import { pauseOthers } from '@/composables/registries/playerRegistry'
import { onVisibilityOrBlur } from '@/composables/registries/documentEventRegistry'
import type { PlaybackAdapter } from '@/types/playback'
import type { HeaderBiddingConfig, StateChangeEvent, StateChangeType } from '@/types/player'
import { isIOS } from '@/utils/platform'

export interface UseAdSetupRefs {
  isAdPlaying: Ref<boolean>
  isAdPaused: Ref<boolean>
  isAdMuted: Ref<boolean>
  adRemainingTime: Ref<number>
}

export interface UseAdSetupDeps {
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
  pauseThisPlayer: () => void
}

export interface UseAdSetupReturn {
  /** No-op if adTagUrl and headerBidding are both empty, or videoEl has no parent yet. */
  attach: (videoEl: HTMLVideoElement, adapter: PlaybackAdapter, adTagUrl: string, headerBidding?: HeaderBiddingConfig) => Promise<void>
  isAdPlaying: () => boolean
  isAdPaused: () => boolean
  pauseAd: () => void
  resumeAd: () => void
  toggleAdMute: () => void
  dispose: () => void
}

/**
 * Owns wiring an IMA ad break to a native adapter: the header-bidding auction (fire-and-forget),
 * the AdController, and its callbacks. The ad/header-bidding code itself (ads.ts, prebid.ts) is
 * dynamically imported inside attach() rather than statically here, so a player with no
 * adTagUrl/headerBidding never downloads it.
 */
export function useAdSetup(refs: UseAdSetupRefs, deps: UseAdSetupDeps): UseAdSetupReturn {
  const { isAdPlaying, isAdPaused, isAdMuted, adRemainingTime } = refs
  const { fire, pauseThisPlayer } = deps

  let adController: AdController | null = null
  let removeVisibilityListener: (() => void) | null = null
  let disposed = false

  async function attach(videoEl: HTMLVideoElement, adapter: PlaybackAdapter, adTagUrl: string, headerBidding?: HeaderBiddingConfig): Promise<void> {
    if (!(adTagUrl || headerBidding) || !videoEl.parentElement) return

    /**
     * Registered before the dynamic import below, not after: a play that happens while ads.ts is
     * still downloading must not be missed, since it may be the only 'play' this session gets.
     * Replayed once adController actually exists, same reasoning for a header-bidding win that
     * resolves first.
     */
    let playedBeforeReady = false
    adapter.on('play', () => {
      if (adController) adController.requestAdsOnFirstPlay()
      else playedBeforeReady = true
    })

    let resolvedAdTagUrl: string | null = null
    if (headerBidding) {
      void import('@/adapters/ads/prebid')
        .then(({ resolveHeaderBiddingAdTagUrl }) => resolveHeaderBiddingAdTagUrl(headerBidding, adTagUrl).catch(() => adTagUrl))
        .then((url) => {
          if (adController) adController.setAdTagUrl(url)
          else resolvedAdTagUrl = url
        })
    }

    function exitPipForAd(): void {
      if (!isIOS() && adapter.isPipActive()) void document.exitPictureInPicture()
    }

    function pauseAdIfHidden(): void {
      if (!isIOS() && (document.hidden || !document.hasFocus()) && adController?.isAdPlaying()) {
        adController.pauseAd()
      }
    }
    const unregisterDocListener = onVisibilityOrBlur(pauseAdIfHidden)
    const onPipChange = (): void => {
      if (!adapter.isPipActive()) pauseAdIfHidden()
    }
    adapter.on('pipchange', onPipChange)
    removeVisibilityListener = () => {
      unregisterDocListener()
      adapter.off('pipchange', onPipChange)
    }

    const { attachAds } = await import('@/adapters/ads/ads')
    if (disposed || !videoEl.parentElement) return

    adController = attachAds(videoEl.parentElement, videoEl, adTagUrl, {
      onAdStart: () => {
        isAdPlaying.value = true
        isAdPaused.value = false
        fire('adstart')
        exitPipForAd()
        pauseAdIfHidden()
      },
      onAdEnd: () => {
        isAdPlaying.value = false
        isAdPaused.value = false
        adRemainingTime.value = 0
        fire('adend')
      },
      /** Resuming an ad doesn't go through the content video's own 'play' event, so pauseOthers needs its own call here too. */
      onAdPauseChange: (paused) => {
        isAdPaused.value = paused
        if (!paused) pauseOthers(pauseThisPlayer)
      },
      onAdMuteChange: (muted) => {
        isAdMuted.value = muted
      },
      onAdProgress: (remainingSeconds) => {
        adRemainingTime.value = remainingSeconds
      },
      onError: (message) => {
        isAdPlaying.value = false
        isAdPaused.value = false
        adRemainingTime.value = 0
        console.error('Ad playback error:', message)
      },
    })
    if (resolvedAdTagUrl) adController.setAdTagUrl(resolvedAdTagUrl)
    if (playedBeforeReady) adController.requestAdsOnFirstPlay()
  }

  return {
    attach,
    isAdPlaying: () => adController?.isAdPlaying() ?? false,
    isAdPaused: () => adController?.isAdPaused() ?? false,
    pauseAd: () => adController?.pauseAd(),
    resumeAd: () => adController?.resumeAd(),
    toggleAdMute: () => adController?.toggleAdMute(),
    dispose: () => {
      disposed = true
      adController?.dispose()
      adController = null
      removeVisibilityListener?.()
      removeVisibilityListener = null
    },
  }
}
