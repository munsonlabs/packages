export {}

declare global {
  interface Window {
    dailymotion?: DailymotionSdk
  }

  interface DailymotionSdk {
    events: Record<string, string>
    createPlayer(elementId: string, options: DailymotionPlayerOptions): Promise<DailymotionPlayer>
  }

  interface DailymotionPlayerOptions {
    player?: string
    video?: string
    params?: { autoplay?: boolean; mute?: boolean }
  }

  interface DailymotionPlayer {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, callback: (state: any) => void): void
    play(): void
    pause(): void
    seek(seconds: number): void
    setVolume(vol: number): void
    setMute(muted: boolean): void
    setFullscreen(fullscreen: boolean): void
    destroy?(): void
  }
}
