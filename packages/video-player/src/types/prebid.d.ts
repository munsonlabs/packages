export {}

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
