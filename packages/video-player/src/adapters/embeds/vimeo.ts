import { createStatefulEmbedAdapter, failEmbed } from '@/adapters/embeds/embedShared'
import type { EmbedAdapterOptions } from '@/types/playback'
import { loadScript } from '@/adapters/loadScript'
import type { PlaybackAdapter } from '@/types/playback'
import { MUTE_VOLUMECHANGE_SYNC_DELAY_MS } from '@/constants'

export const VIMEO_CLASS = 'ml-video-vimeo'

export const VIMEO_SDK_URL = 'https://player.vimeo.com/api/player.js'

function parseVideoId(url: string): string | null {
  const m = url.match(/(?:vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  return m?.[1] ?? null
}

export function createVimeoAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions): PlaybackAdapter {
  let player: VimeoPlayerInstance | null = null
  let textTracks: VimeoTextTrack[] = []
  let activeTrack: number | null = null
  let announceCaptions = (): void => {}

  /**
   * The SDK only answers asynchronously, so the track list and active index are mirrored here and
   * re-announced through `captionschange` whenever Vimeo reports them - including a switch made
   * inside Vimeo's own UI when `nativeUi` is on.
   */
  function syncTextTracks(): void {
    void player
      ?.getTextTracks()
      .then((tracks) => {
        textTracks = tracks
        const showing = tracks.findIndex((t) => t.mode === 'showing')
        activeTrack = showing === -1 ? null : showing
        announceCaptions()
      })
      .catch(() => {})
  }

  /**
   * `active()` answers from the mirror straight away rather than waiting on the SDK - the player
   * re-reads it on every timeupdate, and a stale answer there would undo the viewer's pick before
   * Vimeo confirmed it. A rejected switch resyncs from the SDK instead.
   */
  function selectTextTrack(index: number | null): void {
    const track = index === null ? null : textTracks[index]
    if (index !== null && !track) return
    activeTrack = index
    const change = track ? player?.enableTextTrack(track.language, track.kind) : player?.disableTextTrack()
    void change?.catch(syncTextTracks)
  }

  return createStatefulEmbedAdapter(videoEl, options, {
    cssClass: VIMEO_CLASS,
    connect: async ({ techId, emitter, state, isDisposed, consumeQueuedPlay }) => {
      textTracks = []
      activeTrack = null
      announceCaptions = () => emitter.trigger('captionschange')
      emitter.trigger('captionschange')

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
          syncTextTracks()
          consumeQueuedPlay(() => void player?.play().catch(() => {}))
        })
        .catch((err: Error) => {
          failEmbed(state, emitter, err?.message, 'This video is unavailable or cannot be embedded here.')
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
        syncTextTracks()
      })

      player.on('texttrackchange', syncTextTracks)

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

      player.on('error', (data) => {
        const reason = (data as { message?: string } | undefined)?.message
        failEmbed(state, emitter, reason, 'This video is unavailable or cannot be embedded here.')
      })
    },
    hasPlayer: () => !!player,
    play: () => player?.play(),
    pause: () => void player?.pause().catch(() => {}),
    seekToSdk: (seconds) => void player?.setCurrentTime(seconds).catch(() => {}),
    volumeToSdk: (vol) => void player?.setVolume(vol).catch(() => {}),
    // The SDK's UI lags its own mute state - schedule a late volumechange so consumers catch up.
    muteToSdk: ({ emitter, schedule }, muted) => {
      void player
        ?.setMuted(muted)
        .then(() => schedule(() => emitter.trigger('volumechange'), MUTE_VOLUMECHANGE_SYNC_DELAY_MS))
        .catch(() => {})
    },
    sdkFullscreenEnter: () => void player?.requestFullscreen().catch(() => {}),
    captions: {
      tracks: () => textTracks.map((t, index) => ({ index, label: t.label, language: t.language })),
      active: () => activeTrack,
      select: selectTextTrack,
    },
    destroyPlayer: () => {
      const toDestroy = player
      player = null
      void toDestroy?.destroy().catch(() => {})
    },
  })
}
