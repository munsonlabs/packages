import { createStatefulEmbedAdapter } from '@/adapters/embeds/embedShared'
import type { EmbedAdapterOptions } from '@/adapters/embeds/embedShared'
import { loadScript } from '@/utils/loadScript'
import type { PlaybackAdapter } from '@/types/playback'
import { MUTE_VOLUMECHANGE_SYNC_DELAY_MS, MVP_VIMEO_CLASS, VIMEO_SDK_URL } from '@/constants'

function parseVideoId(url: string): string | null {
  const m = url.match(/(?:vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  return m?.[1] ?? null
}

export function createVimeoAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions): PlaybackAdapter {
  let player: VimeoPlayerInstance | null = null

  return createStatefulEmbedAdapter(videoEl, options, {
    cssClass: MVP_VIMEO_CLASS,
    connect: async ({ techId, emitter, state, isDisposed, consumeQueuedPlay }) => {
      const videoId = parseVideoId(options.src)
      if (!videoId) return

      try {
        await loadScript(VIMEO_SDK_URL, 'vimeo')
      } catch (err) {
        if (isDisposed()) return
        state.errorState = { code: 4, message: err instanceof Error ? err.message : 'The Vimeo player failed to load.' }
        emitter.trigger('error')
        return
      }
      if (isDisposed()) return
      if (!window.Vimeo) {
        state.errorState = { code: 4, message: 'The Vimeo player failed to load.' }
        emitter.trigger('error')
        return
      }

      const playerOptions: VimeoPlayerOptions = {
        id: Number(videoId),
        byline: false,
        portrait: false,
        title: false,
        transparent: true,
        controls: !!options.nativeUi,
        autopause: false,
        ...(options.autoplay !== undefined && { autoplay: options.autoplay }),
        ...(options.muted !== undefined && { muted: options.muted }),
      }

      player = new window.Vimeo.Player(techId, playerOptions)
      if (options.autoplay) state.playQueued = true

      player
        .ready()
        .then(() => {
          if (options.muted) player?.setMuted(true).catch(() => {})
          if (options.volume !== undefined) player?.setVolume(options.volume).catch(() => {})
          consumeQueuedPlay(() => void player?.play().catch(() => {}))
        })
        .catch((err: Error) => {
          state.errorState = { code: 4, message: err?.message || 'This video is unavailable or cannot be embedded here.' }
          emitter.trigger('error')
        })

      player.on('play', () => {
        state.paused = false
        emitter.trigger('play')
        emitter.trigger('playing')
      })
      player.on('pause', () => {
        state.paused = true
        emitter.trigger('pause')
      })
      player.on('ended', () => {
        state.paused = true
        emitter.trigger('ended')
      })
      let durationSet = false
      player.on('timeupdate', (data) => {
        const { seconds, duration: dur } = data as { seconds: number; duration: number }
        state.currentTime = seconds
        state.duration = dur
        emitter.trigger('timeupdate')
        if (dur && !durationSet) {
          durationSet = true
          emitter.trigger('durationchange')
        }
      })
      player.on('loaded', () => {
        durationSet = false
        emitter.trigger('durationchange')
      })
      player.on('seeked', (data) => {
        state.currentTime = (data as { seconds: number }).seconds
        emitter.trigger('seeked')
        emitter.trigger('timeupdate')
      })
      player.on('bufferstart', () => emitter.trigger('waiting'))
      player.on('bufferend', () => emitter.trigger('canplay'))
      player.on('volumechange', (data) => {
        state.volume = (data as { volume: number }).volume
        emitter.trigger('volumechange')
      })
      player.on('error', () => emitter.trigger('error'))
    },
    hasPlayer: () => !!player,
    play: () => void player?.play().catch(() => {}),
    pause: () => void player?.pause().catch(() => {}),
    seekToSdk: (seconds) => void player?.setCurrentTime(seconds).catch(() => {}),
    volumeToSdk: (vol) => void player?.setVolume(vol).catch(() => {}),
    /** The SDK's UI lags its own mute state - schedule a late volumechange so consumers catch up. */
    muteToSdk: ({ emitter, schedule }, muted) => {
      void player
        ?.setMuted(muted)
        .then(() => schedule(() => emitter.trigger('volumechange'), MUTE_VOLUMECHANGE_SYNC_DELAY_MS))
        .catch(() => {})
    },
    sdkFullscreenEnter: () => void player?.requestFullscreen().catch(() => {}),
    destroyPlayer: () => {
      const toDestroy = player
      player = null
      void toDestroy?.destroy().catch(() => {})
    },
  })
}
