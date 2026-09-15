import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { resolveHeaderBiddingAdTagUrl } from '@/adapters/ads/prebid'
import type { HeaderBiddingConfig } from '@/types/player'

const adUnit: HeaderBiddingConfig['adUnit'] = {
  code: 'video-preroll',
  mediaTypes: { video: { context: 'instream', playerSize: [640, 480] } },
  bids: [{ bidder: 'appnexus', params: { placementId: 123 } }],
}

function fakePbjs(overrides: Partial<Window['pbjs']> = {}): NonNullable<Window['pbjs']> {
  return {
    que: { push: (fn: () => void) => fn() },
    addAdUnits: vi.fn(),
    requestBids: vi.fn(),
    adServers: { gam: { buildVideoUrl: vi.fn(() => 'https://ads.example.com/final') } },
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('resolveHeaderBiddingAdTagUrl', () => {
  it('falls back immediately when window.pbjs is missing', async () => {
    vi.stubGlobal('pbjs', undefined)
    const result = await resolveHeaderBiddingAdTagUrl({ adUnit }, 'https://fallback.example.com')
    expect(result).toBe('https://fallback.example.com')
  })

  it('returns buildVideoUrl()s result once bids are back', async () => {
    vi.stubGlobal('pbjs', fakePbjs({ requestBids: (opts) => opts.bidsBackHandler() }))
    const result = await resolveHeaderBiddingAdTagUrl({ adUnit }, 'https://fallback.example.com')
    expect(result).toBe('https://ads.example.com/final')
  })

  it('falls back if buildVideoUrl returns null/undefined', async () => {
    vi.stubGlobal(
      'pbjs',
      fakePbjs({
        requestBids: (opts) => opts.bidsBackHandler(),
        adServers: { gam: { buildVideoUrl: vi.fn(() => null) } },
      }),
    )
    const result = await resolveHeaderBiddingAdTagUrl({ adUnit }, 'https://fallback.example.com')
    expect(result).toBe('https://fallback.example.com')
  })

  it('falls back if buildVideoUrl throws', async () => {
    vi.stubGlobal(
      'pbjs',
      fakePbjs({
        requestBids: (opts) => opts.bidsBackHandler(),
        adServers: {
          gam: {
            buildVideoUrl: () => {
              throw new Error('boom')
            },
          },
        },
      }),
    )
    const result = await resolveHeaderBiddingAdTagUrl({ adUnit }, 'https://fallback.example.com')
    expect(result).toBe('https://fallback.example.com')
  })

  it('falls back if requestBids throws synchronously', async () => {
    vi.stubGlobal(
      'pbjs',
      fakePbjs({
        requestBids: () => {
          throw new Error('boom')
        },
      }),
    )
    const result = await resolveHeaderBiddingAdTagUrl({ adUnit }, 'https://fallback.example.com')
    expect(result).toBe('https://fallback.example.com')
  })

  it('falls back on timeout when bidsBackHandler never fires', async () => {
    vi.stubGlobal('pbjs', fakePbjs({ requestBids: () => {} }))
    const promise = resolveHeaderBiddingAdTagUrl({ adUnit, timeoutMs: 500 }, 'https://fallback.example.com')
    await vi.advanceTimersByTimeAsync(500)
    expect(await promise).toBe('https://fallback.example.com')
  })

  it('ignores a late bidsBackHandler call after the timeout already resolved', async () => {
    let handler: (() => void) | undefined
    vi.stubGlobal(
      'pbjs',
      fakePbjs({
        requestBids: (opts) => {
          handler = opts.bidsBackHandler
        },
      }),
    )
    const promise = resolveHeaderBiddingAdTagUrl({ adUnit, timeoutMs: 500 }, 'https://fallback.example.com')
    await vi.advanceTimersByTimeAsync(500)
    expect(await promise).toBe('https://fallback.example.com')
    handler?.()
  })

  it('passes adUnit.code and the timeout through to requestBids', async () => {
    const requestBids = vi.fn((opts: { bidsBackHandler: () => void }) => opts.bidsBackHandler())
    vi.stubGlobal('pbjs', fakePbjs({ requestBids }))
    await resolveHeaderBiddingAdTagUrl({ adUnit, timeoutMs: 2000 }, 'https://fallback.example.com')
    expect(requestBids).toHaveBeenCalledWith(expect.objectContaining({ adUnitCodes: ['video-preroll'], timeout: 2000 }))
  })
})
