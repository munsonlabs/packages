import { createStatefulEmbedAdapter, failEmbed } from '@/adapters/embeds/embedShared'
import type { EmbedAdapterOptions } from '@/types/playback'
import { loadScript } from '@/utils/loadScript'
import type { PlaybackAdapter } from '@/types/playback'
import { MVP_DAILYMOTION_CLASS } from '@/constants'

function parseVideoId(url: string): string | null {
  const qs = url.match(/[?&]video=([a-zA-Z0-9]+)/)
  if (qs) return qs[1]
  const m = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/)
  return m?.[1] ?? null
}

export function createDailymotionAdapter(videoEl: HTMLVideoElement, options: EmbedAdapterOptions): PlaybackAdapter {
  let dm: DailymotionPlayer | null = null

  return createStatefulEmbedAdapter(videoEl, options, {
    cssClass: MVP_DAILYMOTION_CLASS,
    connect: async ({ techId, emitter, state, isDisposed, consumeQueuedPlay }) => {
      const videoId = parseVideoId(options.src)
      if (!videoId) {
        state.errorState = { code: 4, message: 'Could not parse video ID from source URL' }
        emitter.trigger('error')
        return
      }

      let initialAutoplayHandled = false

      try {
        const sdk = await loadScript('https://geo.dailymotion.com/libs/player.js', 'dailymotion-sdk').then(() => window.dailymotion)
        if (!sdk || isDisposed()) return

        const player = await sdk.createPlayer(techId, {
          video: videoId,
          params: { autoplay: !!options.autoplay, mute: !!options.muted },
        })
        /** createPlayer is a round-trip: an unmount during it already ran destroyPlayer against a null dm, so adopting this one now would orphan it and its iframe. */
        if (isDisposed()) {
          player.destroy?.()
          return
        }
        dm = player
        if (options.volume !== undefined) player.setVolume(options.volume)

        const e = sdk.events
        consumeQueuedPlay(() => dm?.play())

        /** Dailymotion fires VIDEO_PLAY even without autoplay - pause back out the first time. */
        player.on(e.VIDEO_PLAY, () => {
          state.paused = false
          emitter.trigger('play')
          emitter.trigger('playing')
          if (!options.autoplay && !initialAutoplayHandled) {
            initialAutoplayHandled = true
            player.pause()
          }
        })

        player.on(e.VIDEO_PLAYING, () => {
          state.paused = false
          emitter.trigger('play')
          emitter.trigger('playing')
        })

        player.on(e.VIDEO_PAUSE, () => {
          state.paused = true
          emitter.trigger('pause')
        })

        if (e.VIDEO_BUFFERING) player.on(e.VIDEO_BUFFERING, () => emitter.trigger('waiting'))
        player.on(e.VIDEO_END, () => {
          state.paused = true
          emitter.trigger('ended')
        })

        player.on(e.VIDEO_TIMECHANGE, (data: { videoTime?: number; videoDuration?: number }) => {
          state.currentTime = data.videoTime ?? state.currentTime
          state.duration = data.videoDuration ?? state.duration
          emitter.trigger('timeupdate')
        })

        player.on(e.VIDEO_DURATIONCHANGE, (data: { videoDuration?: number }) => {
          state.duration = data.videoDuration ?? state.duration
          emitter.trigger('durationchange')
        })

        player.on(e.VIDEO_SEEKEND, (data: { videoTime?: number }) => {
          state.currentTime = data.videoTime ?? state.currentTime
          emitter.trigger('seeked')
        })

        player.on(e.PLAYER_VOLUMECHANGE, (data: { playerVolume?: number; playerIsMuted?: boolean }) => {
          state.volume = data.playerVolume ?? state.volume
          state.muted = data.playerIsMuted ?? state.muted
          emitter.trigger('volumechange')
        })

        player.on(e.PLAYER_ERROR, (payload: { error?: { message?: string } } | undefined) => {
          failEmbed(state, emitter, payload?.error?.message, 'This video could not be played.')
        })

        if (e.AD_START) {
          player.on(e.AD_START, () => {
            state.paused = false
            emitter.trigger('play')
            emitter.trigger('adstart')
          })
        }
        if (e.AD_END) player.on(e.AD_END, () => emitter.trigger('adend'))
      } catch (err) {
        state.errorState = { code: 4, message: err instanceof Error ? err.message : 'This video could not be played.' }
        emitter.trigger('error')
      }
    },
    hasPlayer: () => !!dm,
    play: () => dm?.play(),
    pause: () => dm?.pause(),
    seekToSdk: (seconds) => dm?.seek(seconds),
    volumeToSdk: (vol) => dm?.setVolume(vol),
    muteToSdk: (_core, muted) => dm?.setMute(muted),
    sdkFullscreenEnter: () => dm?.setFullscreen(true),
    sdkFullscreenExit: () => dm?.setFullscreen(false),
    destroyPlayer: () => {
      const toDestroy = dm
      dm = null
      toDestroy?.destroy?.()
    },
  })
}
