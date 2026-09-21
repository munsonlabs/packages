import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { createAdSetup } from '@/player/features/createAdSetup'
import type { AdCallbacks, AdController } from '@/adapters/ads/ads'
import type { PlaybackAdapter } from '@/types/playback'

let capturedCallbacks: AdCallbacks | null = null
const fakeController: AdController = {
  isAdPlaying: vi.fn(() => false),
  isAdPaused: vi.fn(() => false),
  requestAdsOnFirstPlay: vi.fn(),
  setAdTagUrl: vi.fn(),
  pauseAd: vi.fn(),
  resumeAd: vi.fn(),
  toggleAdMute: vi.fn(),
  dispose: vi.fn(),
}

vi.mock('@/adapters/ads/ads', () => ({
  attachAds: vi.fn((_container, _video, _adTagUrl, callbacks) => {
    capturedCallbacks = callbacks
    return fakeController
  }),
}))

vi.mock('@/adapters/ads/prebid', () => ({
  resolveHeaderBiddingAdTagUrl: vi.fn(() => Promise.resolve('https://resolved.example/vast.xml')),
}))

vi.mock('@/registries/documentEventRegistry', () => ({
  onVisibilityOrBlur: vi.fn(() => () => {}),
}))

function makeAdapter(): PlaybackAdapter {
  return {
    on: vi.fn(),
    off: vi.fn(),
    isPipActive: () => false,
  } as unknown as PlaybackAdapter
}

function makeVideoEl(): HTMLVideoElement {
  const parent = document.createElement('div')
  const video = document.createElement('video')
  parent.appendChild(video)
  return video
}

beforeEach(() => {
  capturedCallbacks = null
  vi.clearAllMocks()
})

describe('attach', () => {
  it('is a no-op when there is no ad tag URL and no header bidding', async () => {
    const { attachAds } = await import('@/adapters/ads/ads')
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })

    await attach(makeVideoEl(), makeAdapter(), '')

    expect(attachAds).not.toHaveBeenCalled()
  })

  it('is a no-op when the video element has no parent yet', async () => {
    const { attachAds } = await import('@/adapters/ads/ads')
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })

    await attach(document.createElement('video'), makeAdapter(), 'https://ad.example/vast.xml')

    expect(attachAds).not.toHaveBeenCalled()
  })

  it('attaches ads when given an ad tag URL and a parented video element', async () => {
    const { attachAds } = await import('@/adapters/ads/ads')
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })

    await attach(makeVideoEl(), makeAdapter(), 'https://ad.example/vast.xml')

    expect(attachAds).toHaveBeenCalledOnce()
  })

  it('resolves header bidding and forwards the winning ad tag URL to the controller', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })

    await attach(makeVideoEl(), makeAdapter(), 'https://fallback.example/vast.xml', { adUnit: {} } as never)
    /** Flushes the header-bidding chain (its own dynamic import of prebid.ts + two .then()s), running concurrently with attach()'s own await above. */
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fakeController.setAdTagUrl).toHaveBeenCalledWith('https://resolved.example/vast.xml')
  })

  it('still requests ads on first play even if play fires before ads.ts has finished loading', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    const adapter = makeAdapter()

    /**
     * attach() is async but its body runs synchronously up to its first `await` before this call
     * expression returns - so the 'play' listener is already registered here, before the dynamic
     * import of ads.ts (and therefore adController) has resolved.
     */
    const attachPromise = attach(makeVideoEl(), adapter, 'https://ad.example/vast.xml')
    const onPlay = (adapter.on as ReturnType<typeof vi.fn>).mock.calls.find(([event]) => event === 'play')?.[1] as () => void
    onPlay()
    await attachPromise

    expect(fakeController.requestAdsOnFirstPlay).toHaveBeenCalledOnce()
  })
})

describe('ad callbacks', () => {
  async function setup() {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const fire = vi.fn()
    const { attach } = createAdSetup(refs, { fire, pauseThisPlayer: vi.fn() })
    await attach(makeVideoEl(), makeAdapter(), 'https://ad.example/vast.xml')
    return { refs, fire }
  }

  it('sets isAdPlaying and fires adstart on ad start', async () => {
    const { refs, fire } = await setup()

    capturedCallbacks?.onAdStart()

    expect(refs.isAdPlaying.value).toBe(true)
    expect(fire).toHaveBeenCalledWith('adstart')
  })

  it('clears ad state and fires adend on ad end', async () => {
    const { refs, fire } = await setup()
    capturedCallbacks?.onAdStart()

    capturedCallbacks?.onAdEnd()

    expect(refs.isAdPlaying.value).toBe(false)
    expect(refs.adRemainingTime.value).toBe(0)
    expect(fire).toHaveBeenCalledWith('adend')
  })

  it('tracks pause state via onAdPauseChange', async () => {
    const { refs } = await setup()

    capturedCallbacks?.onAdPauseChange(true)
    expect(refs.isAdPaused.value).toBe(true)

    capturedCallbacks?.onAdPauseChange(false)
    expect(refs.isAdPaused.value).toBe(false)
  })

  it('tracks mute state via onAdMuteChange', async () => {
    const { refs } = await setup()

    capturedCallbacks?.onAdMuteChange(true)

    expect(refs.isAdMuted.value).toBe(true)
  })

  it('tracks remaining time via onAdProgress', async () => {
    const { refs } = await setup()

    capturedCallbacks?.onAdProgress(12.5)

    expect(refs.adRemainingTime.value).toBe(12.5)
  })

  it('clears ad state on error without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { refs } = await setup()
    capturedCallbacks?.onAdStart()

    expect(() => capturedCallbacks?.onError('boom')).not.toThrow()
    expect(refs.isAdPlaying.value).toBe(false)
  })
})

describe('proxied controller methods', () => {
  it('reflects false before any ad has attached', () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { isAdPlaying, isAdPaused } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })

    expect(isAdPlaying()).toBe(false)
    expect(isAdPaused()).toBe(false)
  })

  it('forwards pauseAd/resumeAd/toggleAdMute to the underlying controller once attached', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach, pauseAd, resumeAd, toggleAdMute } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    await attach(makeVideoEl(), makeAdapter(), 'https://ad.example/vast.xml')

    pauseAd()
    resumeAd()
    toggleAdMute()

    expect(fakeController.pauseAd).toHaveBeenCalledOnce()
    expect(fakeController.resumeAd).toHaveBeenCalledOnce()
    expect(fakeController.toggleAdMute).toHaveBeenCalledOnce()
  })

  it('disposes the controller and stops proxying to it', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach, dispose, isAdPlaying } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    await attach(makeVideoEl(), makeAdapter(), 'https://ad.example/vast.xml')

    dispose()

    expect(fakeController.dispose).toHaveBeenCalledOnce()
    expect(isAdPlaying()).toBe(false)
  })

  it('never constructs a controller if disposed while ads.ts is still loading', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach, dispose } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    const { attachAds } = await import('@/adapters/ads/ads')

    const attachPromise = attach(makeVideoEl(), makeAdapter(), 'https://ad.example/vast.xml')
    dispose()
    await attachPromise

    expect(attachAds).not.toHaveBeenCalled()
  })
})

describe('header bidding and the first ad request', () => {
  function makeListenableAdapter(): { adapter: PlaybackAdapter; play: () => void } {
    const handlers: Record<string, Array<() => void>> = {}
    const adapter = {
      on: (event: string, fn: () => void) => {
        ;(handlers[event] ??= []).push(fn)
      },
      off: vi.fn(),
      isPipActive: () => false,
    } as unknown as PlaybackAdapter
    return { adapter, play: () => handlers.play?.forEach((fn) => fn()) }
  }

  it('waits for the auction before requesting, and requests with the winning tag', async () => {
    const { resolveHeaderBiddingAdTagUrl } = await import('@/adapters/ads/prebid')
    let settleAuction: (url: string) => void = () => {}
    vi.mocked(resolveHeaderBiddingAdTagUrl).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        settleAuction = resolve
      }),
    )
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    const { adapter, play } = makeListenableAdapter()

    await attach(makeVideoEl(), adapter, 'https://fallback.example/vast.xml', {
      adUnit: { code: 'unit', mediaTypes: { video: {} }, bids: [] },
    })

    play()
    await Promise.resolve()
    expect(fakeController.requestAdsOnFirstPlay).not.toHaveBeenCalled()

    settleAuction('https://won.example/vast.xml')
    await vi.waitFor(() => expect(fakeController.requestAdsOnFirstPlay).toHaveBeenCalled())

    expect(fakeController.setAdTagUrl).toHaveBeenCalledWith('https://won.example/vast.xml')
    const tagCall = vi.mocked(fakeController.setAdTagUrl).mock.invocationCallOrder[0]
    const requestCall = vi.mocked(fakeController.requestAdsOnFirstPlay).mock.invocationCallOrder[0]
    expect(tagCall).toBeLessThan(requestCall)
  })

  it('requests straight away when there is no auction to wait for', async () => {
    const refs = { isAdPlaying: ref(false), isAdPaused: ref(false), isAdMuted: ref(false), adRemainingTime: ref(0) }
    const { attach } = createAdSetup(refs, { fire: vi.fn(), pauseThisPlayer: vi.fn() })
    const { adapter, play } = makeListenableAdapter()

    await attach(makeVideoEl(), adapter, 'https://ad.example/vast.xml')
    play()

    await vi.waitFor(() => expect(fakeController.requestAdsOnFirstPlay).toHaveBeenCalledOnce())
  })
})
