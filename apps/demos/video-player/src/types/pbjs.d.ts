export {}

/**
 * Minimal ambient shape of the global `pbjs` object for the demo's own Prebid tooling
 * (usePrebidLog.ts). Not re-used from @munsonlabs/video-player's own prebid.d.ts since that one
 * isn't part of the package's published type exports.
 */
declare global {
  interface Window {
    pbjs?: {
      que: { push(fn: () => void): void }
      adServers?: {
        gam?: {
          buildVideoUrl(options: { adUnit: object; params?: Record<string, string> }): string | null | undefined
        }
      }
    }
  }
}
