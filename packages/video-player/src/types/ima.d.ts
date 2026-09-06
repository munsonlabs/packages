export {}

declare global {
  interface Window {
    google?: { ima: ImaNamespace }
  }

  interface ImaNamespace {
    AdDisplayContainer: new (containerEl: HTMLElement, videoEl: HTMLVideoElement) => ImaAdDisplayContainer
    AdsLoader: new (container: ImaAdDisplayContainer) => ImaAdsLoader
    AdsRequest: new () => ImaAdsRequest
    AdsRenderingSettings: new () => ImaAdsRenderingSettings
    AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } }
    AdErrorEvent: { Type: { AD_ERROR: string } }
    AdEvent: {
      Type: {
        CONTENT_PAUSE_REQUESTED: string
        CONTENT_RESUME_REQUESTED: string
        ALL_ADS_COMPLETED: string
        PAUSED: string
        RESUMED: string
        AD_PROGRESS: string
      }
    }
    ViewMode: { NORMAL: string }
  }

  interface ImaAdDisplayContainer {
    initialize(): void
  }

  interface ImaAdsLoader {
    addEventListener(type: string, callback: (event: ImaAdsManagerLoadedEvent | ImaAdErrorEvent) => void): void
    requestAds(request: ImaAdsRequest): void
    contentComplete(): void
    destroy(): void
  }

  interface ImaAdsRequest {
    adTagUrl?: string
  }

  interface ImaAdsRenderingSettings {
    restoreCustomPlaybackStateOnAdBreakComplete: boolean
  }

  interface ImaContentPlayback {
    currentTime: number
  }

  interface ImaAdsManagerLoadedEvent {
    getAdsManager(contentPlayback: ImaContentPlayback, renderingSettings?: ImaAdsRenderingSettings): ImaAdsManager
  }

  interface ImaAdErrorEvent {
    getError(): { getMessage(): string }
  }

  interface ImaAdsManager {
    addEventListener(type: string, callback: (event: ImaAdErrorEvent) => void): void
    init(width: number, height: number, viewMode: string): void
    resize(width: number, height: number, viewMode: string): void
    start(): void
    pause(): void
    resume(): void
    destroy(): void
    getCuePoints(): number[]
    getRemainingTime(): number
    setVolume(volume: number): void
    getVolume(): number
  }
}
