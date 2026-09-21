import type { PlayerState } from '@/composables/player/playerState'
import type { AdController } from '@/adapters/ads/ads'
import { pauseOthers } from '@/composables/registries/playerRegistry'
import { onVisibilityOrBlur } from '@/composables/registries/documentEventRegistry'
import type { PlaybackAdapter } from '@/types/playback'
import type { HeaderBiddingConfig, StateChangeEvent, StateChangeType } from '@/types/player'
import { isIOS } from '@/utils/platform'

export type UseAdSetupRefs = Pick<PlayerState, 'isAdPlaying' | 'isAdPaused' | 'isAdMuted' | 'adRemainingTime'>

export interface UseAdSetupDeps {
  fire: (type: StateChangeType, extras?: Partial<StateChangeEvent>) => void
  pauseThisPlayer: () => void
}

export interface UseAdSetupReturn {
  attach: (videoEl: HTMLVideoElement, adapter: PlaybackAdapter, adTagUrl: string, headerBidding?: HeaderBiddingConfig) => Promise<void>
  isAdPlaying: () => boolean
  isAdPaused: () => boolean
  pauseAd: () => void
  resumeAd: () => void
  toggleAdMute: () => void
  dispose: () => void
}

export function useAdSetup(refs: UseAdSetupRefs, deps: UseAdSetupDeps): UseAdSetupReturn {
  const { isAdPlaying, isAdPaused, isAdMuted, adRemainingTime } = refs
  const { fire, pauseThisPlayer } = deps

  let adController: AdController | null = null
  let removeVisibilityListener: (() => void) | null = null
  let disposed = false

  async function attach(videoEl: HTMLVideoElement, adapter: PlaybackAdapter, adTagUrl: string, headerBidding?: HeaderBiddingConfig): Promise<void> {
    if (!(adTagUrl || headerBidding) || !videoEl.parentElement) return

    let resolvedAdTagUrl: string | null = null
    /**
     * The first ad request waits on the auction, which fails open on its own timeout. Firing it on
     * play regardless meant a viewer who pressed play quickly got the fallback tag and the winning
     * bid was discarded with no warning - the whole point of header bidding, silently skipped.
     */
    const adTagSettled: Promise<void> = headerBidding
      ? import('@/adapters/ads/prebid')
          .then(({ resolveHeaderBiddingAdTagUrl }) => resolveHeaderBiddingAdTagUrl(headerBidding, adTagUrl).catch(() => adTagUrl))
          .then((url) => {
            if (adController) adController.setAdTagUrl(url)
            else resolvedAdTagUrl = url
          })
          .catch(() => {})
      : Promise.resolve()

    /** Registered before the import so a play during the download isn't missed; replayed once adController exists. */
    let playedBeforeReady = false
    adapter.on('play', () => {
      void adTagSettled.then(() => {
        if (disposed) return
        if (adController) adController.requestAdsOnFirstPlay()
        else playedBeforeReady = true
      })
    })

    function exitPipForAd(): void {
      if (!isIOS() && adapter.pip?.isActive()) void document.exitPictureInPicture()
    }

    function pauseAdIfHidden(): void {
      if (!isIOS() && (document.hidden || !document.hasFocus()) && adController?.isAdPlaying()) {
        adController.pauseAd()
      }
    }

    const unregisterDocListener = onVisibilityOrBlur(pauseAdIfHidden)
    const onPipChange = (): void => {
      if (!adapter.pip?.isActive()) pauseAdIfHidden()
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
