import { isIOS, exitFullscreen as exitDocFullscreen } from '@/utils/platform'
import { enterFullscreenWithIosFallback } from '@/adapters/embeds/embedShared'

export interface FullscreenSupport {
  enterFullscreen(): void
  exitFullscreen(): void
  dispose(): void
}

type IosVideoEl = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitExitFullscreen?: () => void }

/** iOS's video-only fullscreen never touches document.fullscreenElement - forward its own webkit events instead so useFullscreen.ts stays accurate. */
export function createFullscreenSupport(videoEl: HTMLVideoElement, onEnter: () => void, onExit: () => void): FullscreenSupport {
  const forwarders = [
    ['webkitbeginfullscreen', onEnter],
    ['webkitendfullscreen', onExit],
  ] as const
  for (const [name, fn] of forwarders) videoEl.addEventListener(name, fn)

  /**
   * Desktop Safari exposes webkitEnterFullscreen on HTMLVideoElement too, so branching on its mere
   * existence sent every Safari user to video-only fullscreen and dropped the shell that carries the
   * whole control overlay. Only iOS genuinely lacks element fullscreen, so gate on that and take the
   * same shell path as the embeds everywhere else.
   */
  function enterFullscreen(): void {
    enterFullscreenWithIosFallback(videoEl, () => {
      const iosVideoEl = videoEl as IosVideoEl
      if (typeof iosVideoEl.webkitEnterFullscreen !== 'function') return false
      iosVideoEl.webkitEnterFullscreen()
    })
  }

  /** document.exitFullscreen() is a no-op for iOS's webkitEnterFullscreen path - needs the matching webkit call. */
  function exitFullscreen(): void {
    const iosVideoEl = videoEl as IosVideoEl
    if (isIOS() && typeof iosVideoEl.webkitExitFullscreen === 'function') {
      iosVideoEl.webkitExitFullscreen()
      return
    }
    exitDocFullscreen()
  }

  return {
    enterFullscreen,
    exitFullscreen,
    dispose: () => {
      for (const [name, fn] of forwarders) videoEl.removeEventListener(name, fn)
    },
  }
}
