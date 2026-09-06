import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { attachAds } from '@/adapters/ads/ads'
import type { AdCallbacks } from '@/adapters/ads/ads'
import { MVP_AD_PLAYING_CLASS, MVP_AD_PAUSED_CLASS } from '@/constants'

const AdEventType = {
  CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
  CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
  ALL_ADS_COMPLETED: 'allAdsCompleted',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  AD_PROGRESS: 'adProgress',
}
const AdErrorType = { AD_ERROR: 'adError' }
const AdsManagerLoadedType = { ADS_MANAGER_LOADED: 'adsManagerLoaded' }

type Listener = (event: ImaAdErrorEvent) => void

class FakeAdsManager implements ImaAdsManager {
  private listeners = new Map<string, Listener[]>()
  volume = 1
  remaining = 30
  destroyed = false
  started = false

  addEventListener(type: string, cb: Listener): void {
    const list = this.listeners.get(type) ?? []
    list.push(cb)
    this.listeners.set(type, list)
  }
  emit(type: string, event?: unknown): void {
    this.listeners.get(type)?.forEach((cb) => cb(event as ImaAdErrorEvent))
  }
  init(): void {}
  resize(): void {}
  start(): void {
    this.started = true
  }
  pause(): void {
    this.emit(AdEventType.PAUSED)
  }
  resume(): void {
    this.emit(AdEventType.RESUMED)
  }
  destroy(): void {
    this.destroyed = true
  }
  getCuePoints(): number[] {
    return []
  }
  getRemainingTime(): number {
    return this.remaining
  }
  setVolume(v: number): void {
    this.volume = v
  }
  getVolume(): number {
    return this.volume
  }
}

class FakeAdsLoader implements ImaAdsLoader {
  private listeners = new Map<string, Listener[]>()
  destroyed = false
  requestAds = vi.fn()
  contentComplete = vi.fn()

  addEventListener(type: string, cb: Listener): void {
    const list = this.listeners.get(type) ?? []
    list.push(cb)
    this.listeners.set(type, list)
  }
  emit(type: string, event?: unknown): void {
    this.listeners.get(type)?.forEach((cb) => cb(event as ImaAdErrorEvent))
  }
  destroy(): void {
    this.destroyed = true
  }
}

let lastAdsLoader: FakeAdsLoader | null = null

function installFakeIma(): void {
  lastAdsLoader = null
  window.google = {
    ima: {
      AdDisplayContainer: class {
        initialize = vi.fn()
      } as unknown as ImaNamespace['AdDisplayContainer'],
      AdsLoader: class {
        constructor() {
          const loader = new FakeAdsLoader()
          lastAdsLoader = loader
          return loader as unknown as this
        }
      } as unknown as ImaNamespace['AdsLoader'],
      AdsRequest: class {
        adTagUrl?: string
      } as unknown as ImaNamespace['AdsRequest'],
      AdsRenderingSettings: class {
        restoreCustomPlaybackStateOnAdBreakComplete = false
      } as unknown as ImaNamespace['AdsRenderingSettings'],
      AdsManagerLoadedEvent: { Type: AdsManagerLoadedType },
      AdErrorEvent: { Type: AdErrorType },
      AdEvent: { Type: AdEventType },
      ViewMode: { NORMAL: 'normal' },
    },
  }
}

function triggerAdsManagerLoaded(): FakeAdsManager {
  const manager = new FakeAdsManager()
  lastAdsLoader?.emit(AdsManagerLoadedType.ADS_MANAGER_LOADED, { getAdsManager: () => manager })
  return manager
}

function makeCallbacks() {
  return {
    onAdStart: vi.fn(),
    onAdEnd: vi.fn(),
    onAdPauseChange: vi.fn(),
    onAdMuteChange: vi.fn(),
    onAdProgress: vi.fn(),
    onError: vi.fn(),
  } satisfies AdCallbacks
}

beforeEach(() => {
  installFakeIma()
  window.ResizeObserver = class {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  } as unknown as typeof ResizeObserver
})

afterEach(() => {
  delete (window as unknown as { google?: unknown }).google
})

async function setup(adTagUrl = 'https://example.com/vast.xml') {
  const containerEl = document.createElement('div')
  const videoEl = document.createElement('video')
  containerEl.appendChild(videoEl)
  document.body.appendChild(containerEl)
  const callbacks = makeCallbacks()
  const controller = attachAds(containerEl, videoEl, adTagUrl, callbacks)
  await Promise.resolve() // flush loadImaSdk().then()
  return { containerEl, videoEl, callbacks, controller }
}

describe('requesting ads', () => {
  it('waits for both the SDK and the first play before requesting', async () => {
    const { controller } = await setup('https://example.com/vast.xml')
    expect(lastAdsLoader?.requestAds).not.toHaveBeenCalled()

    controller.requestAdsOnFirstPlay()

    expect(lastAdsLoader?.requestAds).toHaveBeenCalledOnce()
    const request = lastAdsLoader?.requestAds.mock.calls[0][0]
    expect(request.adTagUrl).toBe('https://example.com/vast.xml')
  })

  it('only ever requests once even if called again', async () => {
    const { controller } = await setup()
    controller.requestAdsOnFirstPlay()
    controller.requestAdsOnFirstPlay()
    expect(lastAdsLoader?.requestAds).toHaveBeenCalledOnce()
  })
})

describe('setAdTagUrl', () => {
  it('holds off requesting ads until a url is set, when attached with none (e.g. headerBidding-only, still resolving)', async () => {
    const { controller } = await setup('')
    controller.requestAdsOnFirstPlay()
    expect(lastAdsLoader?.requestAds).not.toHaveBeenCalled()

    controller.setAdTagUrl('https://example.com/vast.xml')

    expect(lastAdsLoader?.requestAds).toHaveBeenCalledOnce()
    const request = lastAdsLoader?.requestAds.mock.calls[0][0]
    expect(request.adTagUrl).toBe('https://example.com/vast.xml')
  })

  it('is a no-op once the ad has already been requested with the original url', async () => {
    const { controller } = await setup('https://example.com/vast.xml')
    controller.requestAdsOnFirstPlay()
    expect(lastAdsLoader?.requestAds).toHaveBeenCalledOnce()

    controller.setAdTagUrl('https://example.com/other.xml')

    expect(lastAdsLoader?.requestAds).toHaveBeenCalledOnce()
    const request = lastAdsLoader?.requestAds.mock.calls[0][0]
    expect(request.adTagUrl).toBe('https://example.com/vast.xml')
  })
})

describe('ad start/end', () => {
  it('pauses content and fires onAdStart on CONTENT_PAUSE_REQUESTED', async () => {
    const { controller, callbacks, containerEl, videoEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()

    const pauseSpy = vi.spyOn(videoEl, 'pause')
    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)

    expect(pauseSpy).toHaveBeenCalledOnce()
    expect(callbacks.onAdStart).toHaveBeenCalledOnce()
    expect(controller.isAdPlaying()).toBe(true)
    expect(containerEl.classList.contains(MVP_AD_PLAYING_CLASS)).toBe(true)
  })

  it('resumes content and fires onAdEnd on CONTENT_RESUME_REQUESTED', async () => {
    const { controller, callbacks, videoEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)

    const playSpy = vi.spyOn(videoEl, 'play').mockResolvedValue()
    manager.emit(AdEventType.CONTENT_RESUME_REQUESTED)

    expect(callbacks.onAdEnd).toHaveBeenCalledOnce()
    expect(controller.isAdPlaying()).toBe(false)
    expect(playSpy).toHaveBeenCalledOnce()
  })

  it('does not restart an already-ended video on post-roll resume', async () => {
    const { controller, videoEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)

    Object.defineProperty(videoEl, 'ended', { value: true, configurable: true })
    const playSpy = vi.spyOn(videoEl, 'play').mockResolvedValue()
    manager.emit(AdEventType.CONTENT_RESUME_REQUESTED)

    expect(playSpy).not.toHaveBeenCalled()
  })
})

describe('initial mute sync', () => {
  it('reports the ad as unmuted on start when the SDK starts it unmuted', async () => {
    const { controller, callbacks } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()

    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)

    expect(callbacks.onAdMuteChange).toHaveBeenCalledWith(false)
  })

  it('reports the ad as muted on start when autoplay policy starts it muted, and one toggle unmutes it', async () => {
    const { controller, callbacks } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.volume = 0

    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)
    expect(callbacks.onAdMuteChange).toHaveBeenCalledWith(true)

    controller.toggleAdMute()

    expect(manager.getVolume()).toBe(1)
    expect(callbacks.onAdMuteChange).toHaveBeenLastCalledWith(false)
  })
})

describe('cross-player pause coordination', () => {
  it('pauseAd()/resumeAd() drive isAdPaused() via PAUSED/RESUMED', async () => {
    const { controller, callbacks } = await setup()
    controller.requestAdsOnFirstPlay()
    triggerAdsManagerLoaded()

    controller.pauseAd()
    expect(controller.isAdPaused()).toBe(true)
    expect(callbacks.onAdPauseChange).toHaveBeenCalledWith(true)

    controller.resumeAd()
    expect(controller.isAdPaused()).toBe(false)
    expect(callbacks.onAdPauseChange).toHaveBeenCalledWith(false)
  })

  it('clears the ad-paused state (but not ad-playing) once the ad break ends', async () => {
    const { controller, containerEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)
    controller.pauseAd()
    expect(containerEl.classList.contains(MVP_AD_PAUSED_CLASS)).toBe(true)

    manager.emit(AdEventType.CONTENT_RESUME_REQUESTED)

    expect(containerEl.classList.contains(MVP_AD_PLAYING_CLASS)).toBe(false)
    expect(containerEl.classList.contains(MVP_AD_PAUSED_CLASS)).toBe(false)
  })
})

describe('onAdProgress', () => {
  it('reports the ads manager remaining time on AD_PROGRESS', async () => {
    const { controller, callbacks } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.remaining = 12

    manager.emit(AdEventType.AD_PROGRESS)

    expect(callbacks.onAdProgress).toHaveBeenCalledWith(12)
  })
})

describe('toggleAdMute', () => {
  it('mutes by zeroing volume, independent of the content video', async () => {
    const { controller, callbacks, videoEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.volume = 0.8

    controller.toggleAdMute()

    expect(manager.getVolume()).toBe(0)
    expect(callbacks.onAdMuteChange).toHaveBeenCalledWith(true)
    expect(videoEl.muted).toBe(false) // untouched — the ad's audio is independent of the content element
  })

  it('restores the pre-mute volume on the second toggle', async () => {
    const { controller, callbacks } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.volume = 0.8

    controller.toggleAdMute()
    controller.toggleAdMute()

    expect(manager.getVolume()).toBe(0.8)
    expect(callbacks.onAdMuteChange).toHaveBeenLastCalledWith(false)
  })

  it('does nothing before the ads manager exists', async () => {
    const { controller, callbacks } = await setup()
    controller.toggleAdMute()
    expect(callbacks.onAdMuteChange).not.toHaveBeenCalled()
  })
})

describe('dispose', () => {
  it('tears down the ads manager/loader, the ad container, and the ad classes', async () => {
    const { controller, containerEl } = await setup()
    controller.requestAdsOnFirstPlay()
    const manager = triggerAdsManagerLoaded()
    manager.emit(AdEventType.CONTENT_PAUSE_REQUESTED)

    controller.dispose()

    expect(manager.destroyed).toBe(true)
    expect(lastAdsLoader?.destroyed).toBe(true)
    expect(containerEl.querySelector('.ima-ad-container')).toBeNull()
    expect(containerEl.classList.contains(MVP_AD_PLAYING_CLASS)).toBe(false)
  })
})
