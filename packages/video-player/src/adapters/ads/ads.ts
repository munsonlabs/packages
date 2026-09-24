import { loadScript } from '@/adapters/loadScript'
import { isIOS } from '@/utils/platform'

export const AD_PLAYING_CLASS = 'ml-video-ad-playing'

export const AD_PAUSED_CLASS = 'ml-video-ad-paused'

export const IMA_SDK_URL = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'

export interface AdController {
  isAdPlaying: () => boolean
  isAdPaused: () => boolean
  requestAdsOnFirstPlay: () => void
  setAdTagUrl: (url: string) => void
  pauseAd: () => void
  resumeAd: () => void
  toggleAdMute: () => void
  dispose: () => void
}

export interface AdCallbacks {
  onAdStart: () => void
  onAdEnd: () => void
  onAdPauseChange: (paused: boolean) => void
  onAdMuteChange: (muted: boolean) => void
  onAdProgress: (remainingSeconds: number) => void
  onError: (message: string) => void
}

function loadImaSdk(): Promise<void> {
  if (window.google?.ima) return Promise.resolve()
  return loadScript(IMA_SDK_URL, 'ima')
}

export function attachAds(containerEl: HTMLElement, videoEl: HTMLVideoElement, initialAdTagUrl: string, callbacks: AdCallbacks): AdController {
  const adContainerEl = document.createElement('div')
  adContainerEl.className = 'ima-ad-container'
  containerEl.appendChild(adContainerEl)

  let currentAdTagUrl = initialAdTagUrl
  let adDisplayContainer: ImaAdDisplayContainer | null = null
  let adsLoader: ImaAdsLoader | null = null
  let adsManager: ImaAdsManager | null = null
  let hasRequestedAds = false
  let sdkReady = false
  let playHappened = false
  let adPlaying = false
  let adPaused = false
  let disposed = false
  let volumeBeforeMute = 1
  /**
   * On iOS, the IMA SDK plays ad creatives through the same <video> element as content (there is
   * no separate ad video element). After a post-roll finishes the SDK may not restore the original
   * content source, leaving the element pointing at the ad creative. When the user then clicks
   * Replay, videoEl.play() replays the ad instead of the content.
   *
   * We detect a post-roll by noting that content had already ended when the ad started, and on
   * CONTENT_RESUME_REQUESTED we restore the saved original source, seek to the end to clear the
   * browser's "ended" flag, and let the normal ended-state / replay flow take over.
   */
  let postRollPending = false
  let originalSrc = ''

  // IMA sizes the ad creative once and never tracks the container itself, so resize it manually.
  const resizeObserver = new ResizeObserver(([entry]) => {
    const ima = window.google?.ima
    if (!adsManager || !ima) return
    const { width, height } = entry.contentRect
    adsManager.resize(width, height, ima.ViewMode.NORMAL)
  })
  resizeObserver.observe(videoEl)

  function onContentEnded(): void {
    adsLoader?.contentComplete()
  }

  function setAdPlaying(playing: boolean): void {
    adPlaying = playing
    containerEl.classList.toggle(AD_PLAYING_CLASS, playing)
    if (!playing) {
      adPaused = false
      containerEl.classList.remove(AD_PAUSED_CLASS)
    }
  }

  function tryRequestAds(): void {
    if (hasRequestedAds || !sdkReady || !playHappened || !adDisplayContainer || !adsLoader || !currentAdTagUrl) return

    const ima = window.google?.ima
    if (!ima) return
    hasRequestedAds = true

    adDisplayContainer.initialize()
    const request = new ima.AdsRequest()
    request.adTagUrl = currentAdTagUrl
    adsLoader.requestAds(request)
  }

  function setAdTagUrl(url: string): void {
    currentAdTagUrl = url
    tryRequestAds()
  }

  void loadImaSdk()
    .then(() => {
      if (disposed) return
      const ima = window.google?.ima
      if (!ima) return

      adDisplayContainer = new ima.AdDisplayContainer(adContainerEl, videoEl)
      adsLoader = new ima.AdsLoader(adDisplayContainer)
      sdkReady = true

      adsLoader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (event) => {
        if (disposed) return
        const renderingSettings = new ima.AdsRenderingSettings()
        renderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true
        // videoEl as contentPlayback is what lets ad rules schedule mid-rolls at the right timecode.
        adsManager = (event as ImaAdsManagerLoadedEvent).getAdsManager(videoEl, renderingSettings)
        videoEl.addEventListener('ended', onContentEnded)
        originalSrc = videoEl.currentSrc

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
          videoEl.removeEventListener('ended', onContentEnded)
          if (videoEl.ended && isIOS()) postRollPending = true
          videoEl.pause()
          setAdPlaying(true)
          callbacks.onAdStart()
          // Browser autoplay policy can start the ad muted regardless of what we asked for - report its actual volume.
          const startVolume = adsManager?.getVolume() ?? 1
          if (startVolume > 0) volumeBeforeMute = startVolume
          callbacks.onAdMuteChange(startVolume === 0)
        })

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
          videoEl.addEventListener('ended', onContentEnded)
          setAdPlaying(false)
          callbacks.onAdEnd()
          if (postRollPending) {
            postRollPending = false
            // Restore the original content source that IMA may have swapped out on iOS.
            if (originalSrc && videoEl.currentSrc !== originalSrc) videoEl.src = originalSrc
            const end = videoEl.duration
            if (end && isFinite(end)) videoEl.currentTime = end - 0.5
            return
          }
          if (!videoEl.ended) void videoEl.play().catch(() => {})
        })

        adsManager.addEventListener(ima.AdEvent.Type.PAUSED, () => {
          adPaused = true
          containerEl.classList.add(AD_PAUSED_CLASS)
          callbacks.onAdPauseChange(true)
        })

        adsManager.addEventListener(ima.AdEvent.Type.RESUMED, () => {
          adPaused = false
          containerEl.classList.remove(AD_PAUSED_CLASS)
          callbacks.onAdPauseChange(false)
        })

        adsManager.addEventListener(ima.AdEvent.Type.AD_PROGRESS, () => {
          callbacks.onAdProgress(adsManager?.getRemainingTime() ?? 0)
        })

        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (errEvent) => {
          setAdPlaying(false)
          callbacks.onError((errEvent as ImaAdErrorEvent).getError().getMessage())
          void videoEl.play().catch(() => {})
        })

        try {
          adsManager.init(videoEl.clientWidth, videoEl.clientHeight, ima.ViewMode.NORMAL)
          adsManager.start()
        } catch (err) {
          callbacks.onError(err instanceof Error ? err.message : 'Ad playback failed to start.')
        }
      })

      // A request that never produced a manager is retryable.
      adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (event) => {
        if (!adsManager) hasRequestedAds = false
        callbacks.onError((event as ImaAdErrorEvent).getError().getMessage())
      })

      tryRequestAds()
    })
    .catch((err: Error) => callbacks.onError(err.message))

  function requestAdsOnFirstPlay(): void {
    playHappened = true
    tryRequestAds()
  }

  function toggleAdMute(): void {
    if (!adsManager) return
    const current = adsManager.getVolume()
    if (current > 0) {
      volumeBeforeMute = current
      adsManager.setVolume(0)
    } else {
      adsManager.setVolume(volumeBeforeMute || 1)
    }
    callbacks.onAdMuteChange(adsManager.getVolume() === 0)
  }

  return {
    isAdPlaying: () => adPlaying,
    isAdPaused: () => adPaused,
    requestAdsOnFirstPlay,
    setAdTagUrl,
    pauseAd: () => adsManager?.pause(),
    resumeAd: () => adsManager?.resume(),
    toggleAdMute,
    dispose: () => {
      disposed = true
      postRollPending = false
      originalSrc = ''
      resizeObserver.disconnect()
      videoEl.removeEventListener('ended', onContentEnded)
      adsManager?.destroy()
      adsLoader?.destroy()
      adContainerEl.remove()
      containerEl.classList.remove(AD_PLAYING_CLASS, AD_PAUSED_CLASS)
    },
  }
}
