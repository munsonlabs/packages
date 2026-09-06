import { registerPlatform } from '@munsonlabs/video-player'
import type { PlaybackAdapter, EmbedAdapterOptions } from '@munsonlabs/video-player'

/**
 * Proves out @munsonlabs/video-player's extensibility API from outside the package - everything
 * here uses only what's publicly exported (registerPlatform, the PlaybackAdapter/
 * EmbedAdapterOptions types), the same surface any third party would have. Not feature-complete
 * (no captions, no quality switching, no iOS fullscreen clone) - just enough to demonstrate a real
 * embed SDK being wired in. Cloudflare Stream's player object mirrors HTMLMediaElement closely
 * (currentTime/duration/volume/muted as plain properties, standard event names), so this adapter
 * is mostly a thin pass-through rather than a translation layer like the YouTube/Twitch ones need.
 */

declare global {
  interface Window {
    Stream?: (iframe: HTMLIFrameElement) => CloudflareStreamPlayer
  }
}

interface CloudflareStreamPlayer {
  play(): Promise<void>
  pause(): void
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  paused: boolean
  ended: boolean
  addEventListener(event: string, listener: () => void): void
  removeEventListener(event: string, listener: () => void): void
}

interface ParsedCloudflareUrl {
  customerCode: string | null
  videoUid: string
}

function parseCloudflareUrl(url: string): ParsedCloudflareUrl | null {
  const customerMatch = url.match(/customer-([a-z0-9]+)\.cloudflarestream\.com\/([a-f0-9]+)/)
  if (customerMatch) return { customerCode: customerMatch[1], videoUid: customerMatch[2] }

  const sharedMatch = url.match(/(?:iframe\.videodelivery\.net|watch\.cloudflarestream\.com)\/([a-f0-9]+)/)
  if (sharedMatch) return { customerCode: null, videoUid: sharedMatch[1] }

  return null
}

let apiPromise: Promise<void> | null = null

function ensureApiLoaded(): Promise<void> {
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Cloudflare Stream SDK'))
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

// Cloudflare's own docs list only these as real events (see cloudflareAdapter research) - no
// settable playbackRate, no `stalled`/`suspend`/`abort` mapping needed since usePlayerEvents.ts
// never listens for them.
const FORWARDED_EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'volumechange', 'durationchange', 'canplay', 'seeked', 'progress'] as const

function createCloudflareAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions): PlaybackAdapter {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  function trigger(event: string): void {
    listeners.get(event)?.forEach((listener) => listener())
  }

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'width:100%;height:100%;position:absolute;inset:0'
  videoEl.parentElement?.insertBefore(wrapper, videoEl)
  videoEl.style.display = 'none'

  const parsed = parseCloudflareUrl(options.src)

  const iframe = document.createElement('iframe')
  iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;'
  iframe.style.cssText = 'width:100%;height:100%;border:none'
  if (parsed) {
    // Cloudflare only supports autoplay baked into the iframe's own query string, not a later
    // play() call from the Player object - unlike Twitch/YouTube there's no "queue a real play()
    // once ready" option, so autoplay has to mute (same "mutes automatically" convention every
    // other autoplay path in this package already follows) to have any chance of actually running.
    const params = new URLSearchParams({
      controls: String(!!options.nativeUi),
      muted: String(options.muted ?? options.autoplay ?? false),
      autoplay: String(!!options.autoplay),
      preload: 'metadata',
    })
    const host = parsed.customerCode ? `customer-${parsed.customerCode}.cloudflarestream.com` : 'iframe.videodelivery.net'
    iframe.src = `https://${host}/${parsed.videoUid}/iframe?${params}`
  }
  wrapper.appendChild(iframe)

  let player: CloudflareStreamPlayer | null = null
  let disposed = false

  void ensureApiLoaded().then(() => {
    if (disposed || !window.Stream) return
    player = window.Stream(iframe)

    FORWARDED_EVENTS.forEach((event) => player?.addEventListener(event, () => trigger(event)))
    player.addEventListener('error', () => trigger('error'))
    // Cloudflare's ad-insertion events - only fire when the src carries an `ad-url` VAST tag.
    player.addEventListener('stream-adstart', () => trigger('adstart'))
    player.addEventListener('stream-adend', () => trigger('adend'))
  })

  return {
    el: wrapper,
    play: () => player?.play(),
    pause: () => player?.pause(),
    paused: () => player?.paused ?? true,
    currentTime: () => player?.currentTime ?? 0,
    setCurrentTime: (seconds) => {
      if (player) player.currentTime = seconds
    },
    duration: () => player?.duration ?? 0,
    volume: () => player?.volume ?? 1,
    setVolume: (vol) => {
      if (player) player.volume = vol
      trigger('volumechange')
    },
    muted: () => player?.muted ?? false,
    setMuted: (muted) => {
      if (player) player.muted = muted
      trigger('volumechange')
    },
    playbackRate: () => 1,
    setPlaybackRate: () => {},
    bufferedEnd: () => player?.currentTime ?? 0,
    error: () => null,
    setSrc: (src) => {
      const next = parseCloudflareUrl(src)
      if (!next) return
      const host = next.customerCode ? `customer-${next.customerCode}.cloudflarestream.com` : 'iframe.videodelivery.net'
      iframe.src = `https://${host}/${next.videoUid}/iframe`
    },
    supportsPlaybackRate: () => false,
    supportsCaptions: () => false,
    getCaptionTracks: () => [],
    setCaptionTrack: () => {},
    getActiveCaptionTrack: () => null,
    supportsQuality: () => false,
    getQualityLevels: () => [],
    getCurrentQuality: () => null,
    isAutoQuality: () => true,
    setQuality: () => {},
    supportsPip: () => false,
    isPipActive: () => false,
    togglePip: () => {},
    enterFullscreen: () => wrapper.closest('.player__shell')?.requestFullscreen?.(),
    exitFullscreen: () => document.exitFullscreen?.(),
    on: (event, listener) => {
      const events = Array.isArray(event) ? event : [event]
      events.forEach((e) => {
        if (!listeners.has(e)) listeners.set(e, new Set())
        listeners.get(e)!.add(listener as (...args: unknown[]) => void)
      })
    },
    off: (event, listener) => {
      listeners.get(event)?.delete(listener as (...args: unknown[]) => void)
    },
    dispose: () => {
      disposed = true
      wrapper.remove()
      videoEl.style.display = ''
      listeners.clear()
    },
  }
}

export function registerCloudflareAdapter(): void {
  registerPlatform({
    key: 'cloudflare-stream',
    test: (src) => /cloudflarestream\.com|videodelivery\.net/.test(src),
    embed: true,
    createAdapter: createCloudflareAdapter,
  })
}
