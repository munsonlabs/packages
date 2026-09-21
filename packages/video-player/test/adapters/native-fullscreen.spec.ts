import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { createFullscreenSupport } from '@/adapters/native/fullscreenSupport'

const DESKTOP_SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function setUserAgent(ua: string, maxTouchPoints = 0): void {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}

function mountVideoInShell(): { videoEl: HTMLVideoElement; shell: HTMLElement; webkitEnter: ReturnType<typeof vi.fn> } {
  const shell = document.createElement('div')
  shell.className = 'player__shell'
  const videoEl = document.createElement('video')
  const webkitEnter = vi.fn()
  Object.assign(videoEl, { webkitEnterFullscreen: webkitEnter })
  shell.appendChild(videoEl)
  document.body.appendChild(shell)
  return { videoEl, shell, webkitEnter }
}

beforeEach(() => {
  Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('native fullscreen', () => {
  it('uses the shell on desktop Safari even though webkitEnterFullscreen exists', () => {
    setUserAgent(DESKTOP_SAFARI_UA)
    const { videoEl, shell, webkitEnter } = mountVideoInShell()
    createFullscreenSupport(
      videoEl,
      () => {},
      () => {},
    ).enterFullscreen()
    expect(webkitEnter).not.toHaveBeenCalled()
    expect(shell.requestFullscreen).toHaveBeenCalled()
  })

  it('uses the video-only path on iOS, which has no element fullscreen', () => {
    setUserAgent(IPHONE_UA, 5)
    const { videoEl, shell, webkitEnter } = mountVideoInShell()
    createFullscreenSupport(
      videoEl,
      () => {},
      () => {},
    ).enterFullscreen()
    expect(webkitEnter).toHaveBeenCalled()
    expect(shell.requestFullscreen).not.toHaveBeenCalled()
  })
})
