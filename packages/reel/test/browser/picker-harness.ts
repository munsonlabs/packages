import '@munsonlabs/video-player/element'
import type { CaptionTrackDef, PlayerHandle } from '@munsonlabs/video-player'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { setPickerDefaults, getPickerDefaults, type ReelPickerElement } from '@/elements'

/** The page's `<ml-video-player>`: the element and its handle. */
export type PlayerElement = HTMLElement & PlayerHandle

export interface PlayerOptions {
  src?: string
  tracks?: CaptionTrackDef[]
  /** Where the player sits when the editor opens; 2 by default, `null` leaves it at the start. */
  time?: number | null
}

/** The shared defaults before any spec touched them, to put back after each. */
export const initialDefaults = getPickerDefaults()

/** A media element's state, for failure messages: what a timed-out wait on it was up against. */
export function mediaState(media: HTMLMediaElement | null | undefined): string {
  if (!media) return 'no <video>'
  const buffered = Array.from(
    { length: media.buffered.length },
    (_, i) => `${media.buffered.start(i).toFixed(2)}-${media.buffered.end(i).toFixed(2)}`,
  )
  const error = media.error ? `${media.error.code} ${media.error.message}` : 'none'
  return (
    `readyState=${media.readyState} networkState=${media.networkState} currentTime=${media.currentTime.toFixed(3)} ` +
    `paused=${media.paused} seeking=${media.seeking} ended=${media.ended} buffered=[${buffered.join(',')}] error=${error}`
  )
}

/** The page's player `<video>`, if one is on the page. */
const previewVideo = () => document.querySelector<HTMLVideoElement>('ml-video-player video.ml-video-media')

/**
 * Polls `predicate` until it holds, for state the picker exposes only through the DOM (Vue renders a
 * tick after an event, so there is no event to wait on). On timeout the error names what was awaited,
 * `detail()` if given, and the player `<video>`'s state, so a slow or stalled media stack reads as
 * such in the failure rather than as a bare timeout.
 */
export async function waitFor(predicate: () => boolean, message: string, timeout = 20_000, detail?: () => string): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > timeout) {
      const extra = detail ? `; ${detail()}` : ''
      throw new Error(`Timed out after ${timeout}ms waiting for ${message}${extra}; player: ${mediaState(previewVideo())}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/**
 * Resolves on the next `type` event from `media` (listen before causing it), or rejects after
 * `timeout` with the element's state. `error` on the element rejects at once.
 */
export function mediaEvent(media: HTMLMediaElement, type: string, message: string, timeout = 20_000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      clearTimeout(timer)
      media.removeEventListener(type, onEvent)
      media.removeEventListener('error', onError)
    }
    const onEvent = () => {
      done()
      resolve()
    }
    const onError = () => {
      done()
      reject(new Error(`<video> error while waiting for ${message}: ${mediaState(media)}`))
    }
    const timer = setTimeout(() => {
      done()
      reject(new Error(`Timed out after ${timeout}ms waiting for ${message} (${type}): ${mediaState(media)}`))
    }, timeout)
    media.addEventListener(type, onEvent)
    media.addEventListener('error', onError)
  })
}

/**
 * Resolves once `media` has presented a frame and the page has painted after it:
 * `requestVideoFrameCallback` where there is one, bounded (a paused element whose frame is already on
 * screen may not call it again), then two animation frames so canvas work keyed to the frame is done.
 */
export async function presentedFrame(media: HTMLVideoElement, timeout = 1000): Promise<void> {
  if (typeof media.requestVideoFrameCallback === 'function') {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        media.cancelVideoFrameCallback(id)
        resolve()
      }, timeout)
      const id = media.requestVideoFrameCallback(() => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
  for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
}

/**
 * Collects `media.currentTime` on every presented frame (`requestVideoFrameCallback`, else each
 * animation frame) until `done(times)` holds and at least `atLeast` ms have passed, or rejects after
 * `timeout` with how far it got. A wall-clock window alone undercounts on a loaded machine, where
 * playback runs slower than real time; this waits for what the test needs to see.
 */
export function sampleTimes(
  media: HTMLVideoElement,
  done: (times: number[]) => boolean,
  message: string,
  { atLeast = 0, timeout = 20_000, onSample }: { atLeast?: number; timeout?: number; onSample?: () => void } = {},
): Promise<number[]> {
  const times: number[] = []
  const started = performance.now()
  const rvfc = typeof media.requestVideoFrameCallback === 'function'
  return new Promise<number[]>((resolve, reject) => {
    const step = () => {
      times.push(media.currentTime)
      onSample?.()
      const elapsed = performance.now() - started
      if (elapsed >= atLeast && done(times)) return resolve(times)
      if (elapsed > timeout) {
        const span = times.length ? `${Math.min(...times).toFixed(2)}-${Math.max(...times).toFixed(2)}` : 'none'
        return reject(new Error(`Timed out after ${timeout}ms waiting for ${message}: ${times.length} samples over ${span}s; ${mediaState(media)}`))
      }
      // Paused or stalled, a frame callback may never come; poll then so the timeout still fires.
      if (rvfc && !media.paused) {
        const fallback = setTimeout(() => {
          media.cancelVideoFrameCallback(id)
          step()
        }, 250)
        const id = media.requestVideoFrameCallback(() => {
          clearTimeout(fallback)
          step()
        })
      } else {
        requestAnimationFrame(step)
      }
    }
    step()
  })
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const EVENTS = ['reel-open', 'reel-close', 'reel-export', 'reel-cancel', 'reel-error', 'reel-share', 'reel-download', 'reel-range', 'reel-copy']

/**
 * One page per test: a real `<ml-video-player>` and the `<ml-reel-picker for="...">` that clips it,
 * with every `reel-*` event the picker fires recorded. The player is the preview. The picker renders
 * without a shadow root, so its parts are found with `part()`, a `querySelector` on the picker and then
 * the player (where the crop window is drawn).
 */
export class PickerHarness {
  picker!: ReelPickerElement
  player!: PlayerElement
  readonly events: Array<{ type: string; detail: unknown }> = []
  private serial = 0
  private files: string[] = []

  /** A WebVTT file as an object URL, for a player's `tracks`; revoked on cleanup. */
  vtt(text: string): string {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }))
    this.files.push(url)
    return url
  }

  /**
   * Puts a muted player on the page and waits until it has loaded and sits at `time`, as a viewer's
   * would when they decide to clip a moment.
   */
  async mountPlayer({ src = flowerUrl, tracks, time = 2 }: PlayerOptions = {}): Promise<PlayerElement> {
    this.player?.remove()
    const player = document.createElement('ml-video-player') as PlayerElement
    player.id = `reel-test-player-${++this.serial}`
    player.setAttribute('src', src)
    player.setAttribute('muted', '')
    player.style.display = 'block'
    player.style.width = '480px'
    if (tracks) (player as unknown as { tracks: CaptionTrackDef[] }).tracks = tracks
    document.body.append(player)
    this.player = player
    await waitFor(
      () => player.isLoaded === true && Boolean(player.mediaElement),
      'the player to load',
      20_000,
      () => mediaState(player.mediaElement),
    )
    if (time !== null) {
      const media = player.mediaElement!
      player.seek(time)
      // The handle's currentTime follows the `<video>`'s `timeupdate`, a little after the seek lands, and it is the one the picker reads.
      await waitFor(
        () => !media.seeking && Math.abs(media.currentTime - time) < 0.2 && Math.abs(player.currentTime - time) < 0.2,
        `the player at ${time}`,
        20_000,
        () => `handle currentTime=${player.currentTime}; ${mediaState(media)}`,
      )
    }
    return player
  }

  /** The player, then the picker for it (an HLS source is passed as `source`: the player plays it through MediaSource). */
  async mount(props: Partial<ReelPickerElement> = {}, options: PlayerOptions = {}): Promise<ReelPickerElement> {
    await this.mountPlayer(options)
    this.picker = document.createElement('ml-reel-picker') as ReelPickerElement
    this.picker.setAttribute('for', this.player.id)
    const source = options.src && /\.m3u8(?:[?#]|$)/.test(options.src) ? options.src : undefined
    Object.assign(this.picker, { source, ...props })
    for (const type of EVENTS) {
      this.picker.addEventListener(type, (event) => this.events.push({ type, detail: (event as CustomEvent).detail }))
    }
    document.body.append(this.picker)
    return this.picker
  }

  async open(props: Partial<ReelPickerElement> = {}, options: PlayerOptions = {}): Promise<ReelPickerElement> {
    await this.mount(props, options)
    this.picker.show()
    await waitFor(() => this.picker.state === 'editing', 'the editor')
    return this.picker
  }

  of(type: string): Array<{ type: string; detail: unknown }> {
    return this.events.filter((event) => event.type === type)
  }

  /** An element of the picker's panel, else of the player (its controls, the crop window drawn over it). */
  part<T extends Element = HTMLElement>(selector: string): T {
    return (this.picker?.querySelector<T>(selector) ?? this.player?.querySelector<T>(selector))!
  }

  /** The player's `<video>`. */
  video(): HTMLVideoElement {
    return this.player.mediaElement as HTMLVideoElement
  }

  /**
   * Waits for the player to play inside the range, as it does once the editor is ready, and for the
   * player to know it: its state follows the `<video>`'s `play` event, a task after `paused` flips.
   * It needs playback started, not frames presented, so a loaded machine slows it down without
   * failing it.
   */
  async playing(): Promise<void> {
    await waitFor(
      () => {
        const video = this.video()
        return Boolean(video) && !video.paused && this.player.isPlaying && video.currentTime >= this.picker.range.start - 0.3
      },
      'the player to play the range',
      20_000,
      () => `state=${this.picker.state} isPlaying=${this.player.isPlaying} range=${JSON.stringify(this.picker.range)}`,
    )
  }

  /** Pauses the player and waits for it to know. */
  async pause(): Promise<void> {
    this.player.pause()
    await waitFor(
      () => this.video().paused && !this.player.isPlaying,
      'the player to pause',
      20_000,
      () => `isPlaying=${this.player.isPlaying}`,
    )
  }

  /**
   * Seeks the paused player to `at` by clicking the selection, as a viewer would, and resolves once
   * the `<video>` has finished that seek (`seeked`) at `at` and presented the frame, so what is drawn
   * over it is that frame's. Deterministic: nothing plays, nothing is sampled.
   */
  async seekTo(at: number): Promise<void> {
    const video = this.video()
    if (!video.paused) throw new Error(`seekTo needs the player paused; ${mediaState(video)}`)
    this.part<HTMLButtonElement>('.reel-handle[data-handle="start"]').focus()
    const box = this.part('.reel-timeline').getBoundingClientRect()
    const max = Number(this.part('.reel-handle[data-handle="end"]').getAttribute('aria-valuemax'))
    const init = { bubbles: true, composed: true, clientX: box.left + (at / max) * box.width, clientY: box.top + 10, pointerId: 3 }
    const seeked = mediaEvent(video, 'seeked', `the seek to ${at}`)
    this.part('.reel-selection').dispatchEvent(new PointerEvent('pointerdown', init))
    this.part('.reel-selection').dispatchEvent(new PointerEvent('pointerup', init))
    await seeked
    // A click lands within a pixel of `at`; a second seek (the player settling) may follow the first.
    await waitFor(() => !video.seeking && Math.abs(video.currentTime - at) < 0.15, `the player at ${at}`)
    await presentedFrame(video)
  }

  /** The label of the caption track the player shows, "Off" for none. */
  captions(): string {
    const { captionTracks, activeCaptionIndex } = this.player
    return captionTracks.find((track) => track.index === activeCaptionIndex)?.label ?? 'Off'
  }

  /** Has the player show the caption track named `label` ("Off" for none), through its handle, as its own captions control does. */
  async chooseCaptions(label: string): Promise<void> {
    const textTracks = () => Array.from(this.video()?.textTracks ?? [], (track) => `${track.kind}:${track.label || track.language}:${track.mode}`)
    const detail = () =>
      `showing=${this.captions()}, tracks: ${this.player.captionTracks.map((track) => track.label).join(', ') || 'none'}, text tracks: ${textTracks().join(', ') || 'none'}`
    if (label === 'Off') {
      this.player.setCaptionTrack(null)
    } else {
      await waitFor(() => this.player.captionTracks.some((track) => track.label === label), `the player to offer ${label}`, 20_000, detail)
      this.player.setCaptionTrack(this.player.captionTracks.find((track) => track.label === label)!.index)
    }
    await waitFor(() => this.captions() === label, `the captions to read ${label}`, 20_000, detail)
  }

  /** Exports and resolves the clip. */
  async export(): Promise<Blob> {
    const before = this.of('reel-export').length
    this.part<HTMLButtonElement>('.reel-export-button').click()
    await waitFor(
      () => this.of('reel-export').length > before,
      'the export',
      60_000,
      () =>
        `state=${this.picker.state} progress=${this.part('.reel-bar')?.getAttribute('aria-valuenow') ?? '-'}% events=${this.events.map((e) => e.type).join(',')}`,
    )
    return (this.of('reel-export')[before].detail as { blob: Blob }).blob
  }

  cleanup(): void {
    this.picker?.close()
    this.picker?.remove()
    this.player?.remove()
    this.events.length = 0
    this.files.forEach((url) => URL.revokeObjectURL(url))
    this.files = []
    setPickerDefaults(initialDefaults)
    // The player remembers the viewer's captions, quality, sound and position; none may leak into the next test.
    localStorage.clear()
  }
}
