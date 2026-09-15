interface Document {
  readonly webkitFullscreenElement: Element | null
  webkitExitFullscreen(): Promise<void>
}

interface HTMLElement {
  webkitRequestFullscreen(options?: FullscreenOptions): Promise<void>
}
