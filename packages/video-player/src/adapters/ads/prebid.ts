import type { HeaderBiddingConfig } from '@/types/player'

const DEFAULT_TIMEOUT_MS = 1000

/** Runs a Prebid.js auction against the consumer's own `window.pbjs` and returns the winning ad tag URL, falling back to `fallbackAdTagUrl` on any failure so a bidding hiccup never blocks ad playback. */
export function resolveHeaderBiddingAdTagUrl(config: HeaderBiddingConfig, fallbackAdTagUrl: string): Promise<string> {
  const pbjs = window.pbjs
  if (!pbjs) return Promise.resolve(fallbackAdTagUrl)

  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return new Promise((resolve) => {
    let settled = false
    function finish(url: string | null | undefined): void {
      if (settled) return
      settled = true
      resolve(url || fallbackAdTagUrl)
    }

    const timer = setTimeout(() => finish(fallbackAdTagUrl), timeoutMs)

    pbjs.que.push(() => {
      try {
        pbjs.addAdUnits(config.adUnit)
        pbjs.requestBids({
          adUnitCodes: [config.adUnit.code],
          timeout: timeoutMs,
          bidsBackHandler: () => {
            clearTimeout(timer)
            try {
              finish(pbjs.adServers?.gam?.buildVideoUrl({ adUnit: config.adUnit, params: config.params }))
            } catch {
              finish(fallbackAdTagUrl)
            }
          },
        })
      } catch {
        clearTimeout(timer)
        finish(fallbackAdTagUrl)
      }
    })
  })
}
