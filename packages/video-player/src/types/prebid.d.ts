export {}

/**
 * Minimal shape of the global `pbjs` object — deliberately not the full Prebid.js API surface.
 * The consumer owns loading/configuring their own Prebid build (see adapters/ads/prebid.ts for why),
 * so this only declares what we actually call against it.
 */
declare global {
  interface Window {
    pbjs?: PrebidGlobal
  }

  interface PrebidGlobal {
    que: { push(fn: () => void): void }
    addAdUnits(adUnit: object): void
    requestBids(options: { adUnitCodes: string[]; timeout: number; bidsBackHandler: () => void }): void
    adServers?: {
      gam?: {
        buildVideoUrl(options: { adUnit: object; params?: Record<string, string> }): string | null | undefined
      }
    }
  }
}
