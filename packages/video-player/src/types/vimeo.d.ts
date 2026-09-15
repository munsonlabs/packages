export {}

declare global {
  interface Window {
    Vimeo?: { Player: VimeoPlayerConstructor }
  }

  interface VimeoPlayerOptions {
    id: number
    byline: boolean
    portrait: boolean
    title: boolean
    transparent: boolean
    controls: boolean
    autopause: boolean
    autoplay?: boolean
    muted?: boolean
  }

  interface VimeoPlayerConstructor {
    new (element: string | HTMLElement, options: VimeoPlayerOptions): VimeoPlayerInstance
  }

  interface VimeoPlayerInstance {
    ready(): Promise<void>
    play(): Promise<void>
    pause(): Promise<void>
    destroy(): Promise<void>
    requestFullscreen(): Promise<void>
    setCurrentTime(seconds: number): Promise<void>
    setVolume(volume: number): Promise<void>
    setMuted(muted: boolean): Promise<void>
    setPlaybackRate(rate: number): Promise<void>
    on(event: string, callback: (data: unknown) => void): void
  }
}
