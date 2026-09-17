export {}

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
