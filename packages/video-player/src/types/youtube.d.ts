export {}

declare global {
  interface Window {
    YT?: YTNamespace
  }

  interface YTNamespace {
    Player: new (elementId: string, options: YTPlayerOptions) => YTPlayer
    PlayerState: {
      ENDED: number
      PLAYING: number
      PAUSED: number
      BUFFERING: number
      CUED: number
    }
    ready(callback: () => void): void
  }

  interface YTPlayerOptions {
    videoId?: string
    playerVars?: Record<string, unknown>
    host?: string
    events?: {
      onReady?: (event: { target: YTPlayer }) => void
      onStateChange?: (event: { data: number }) => void
      onPlaybackRateChange?: () => void
      onVolumeChange?: () => void
      onError?: (event: { data: number }) => void
    }
  }

  interface YTPlayer {
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    loadVideoById(options: { videoId: string }): void
    cueVideoById(options: { videoId: string }): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    getCurrentTime(): number
    getDuration(): number
    getVideoLoadedFraction(): number
    getPlaybackRate(): number
    setPlaybackRate(rate: number): void
    getAvailablePlaybackRates(): number[]
    getVolume(): number
    setVolume(pct: number): void
    isMuted(): boolean
    mute(): void
    unMute(): void
    getPlayerState(): number
    getPlayerResponse(): { adPlacements?: unknown[] } | null
    getVideoData(): { video_id: string }
    destroy(): void
  }
}
