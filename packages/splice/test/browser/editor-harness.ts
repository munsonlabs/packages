import '@munsonlabs/video-player/element'
import { createApp, h, markRaw, reactive, type App } from 'vue'
import type { CaptionTrackDef, PlayerHandle } from '@munsonlabs/video-player'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import SpliceEditor from '@/editor/SpliceEditor.vue'

/** The page's `<ml-video-player>`: the element and its handle. */
export type PlayerElement = HTMLElement & PlayerHandle

/** What a test's editor exposes: its methods, from a template ref. */
export interface EditorApi {
  show(): void
  close(): void
  export(): Promise<void>
  cancel(): void
}

export interface PlayerOptions {
  src?: string
  tracks?: CaptionTrackDef[]
  /** Where the player sits when the editor opens; 2 by default, `null` leaves it at the start. */
  time?: number | null
}

/** A media element's state, for failure messages: what a timed-out wait on it was up against. */
export function readMediaState(media: HTMLMediaElement | null | undefined): string {
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

const findPreviewVideo = () => document.querySelector<HTMLVideoElement>('ml-video-player video.ml-video-media')

/**
 * Polls `predicate` until it holds, for state the editor shows only through the DOM. On timeout the
 * error names what was awaited, `detail()` if given, and the player `<video>`'s state.
 */
export async function waitFor(predicate: () => boolean, message: string, timeout = 20_000, detail?: () => string): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > timeout) {
      const extra = detail ? `; ${detail()}` : ''
      throw new Error(`Timed out after ${timeout}ms waiting for ${message}${extra}; player: ${readMediaState(findPreviewVideo())}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/** Resolves on the next `type` event from `media` (listen before causing it), or rejects with its state. */
export function waitForMediaEvent(media: HTMLMediaElement, type: string, message: string, timeout = 20_000): Promise<void> {
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
      reject(new Error(`<video> error while waiting for ${message}: ${readMediaState(media)}`))
    }
    const timer = setTimeout(() => {
      done()
      reject(new Error(`Timed out after ${timeout}ms waiting for ${message} (${type}): ${readMediaState(media)}`))
    }, timeout)
    media.addEventListener(type, onEvent)
    media.addEventListener('error', onError)
  })
}

/** Resolves once `media` has presented a frame and the page has painted after it. */
export async function waitForPresentedFrame(media: HTMLVideoElement, timeout = 1000): Promise<void> {
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
 * Collects `media.currentTime` on every presented frame until `done(times)` holds and at least
 * `atLeast` ms have passed, or rejects after `timeout` with how far it got. A wall-clock window alone
 * undercounts on a loaded machine, where playback runs slower than real time.
 */
export function sampleTimes(
  media: HTMLVideoElement,
  done: (times: number[]) => boolean,
  message: string,
  { atLeast = 0, timeout = 20_000, onSample }: { atLeast?: number; timeout?: number; onSample?: () => void } = {},
): Promise<number[]> {
  const times: number[] = []
  const started = performance.now()
  const hasFrameCallback = typeof media.requestVideoFrameCallback === 'function'

  return new Promise<number[]>((resolve, reject) => {
    const step = () => {
      times.push(media.currentTime)
      onSample?.()
      const elapsed = performance.now() - started
      if (elapsed >= atLeast && done(times)) return resolve(times)
      if (elapsed > timeout) {
        const span = times.length ? `${Math.min(...times).toFixed(2)}-${Math.max(...times).toFixed(2)}` : 'none'
        return reject(
          new Error(`Timed out after ${timeout}ms waiting for ${message}: ${times.length} samples over ${span}s; ${readMediaState(media)}`),
        )
      }
      // Paused or stalled, a frame callback may never come; poll then so the timeout still fires.
      if (!hasFrameCallback || media.paused) return void requestAnimationFrame(step)
      const fallback = setTimeout(() => {
        media.cancelVideoFrameCallback(id)
        step()
      }, 250)
      const id = media.requestVideoFrameCallback(() => {
        clearTimeout(fallback)
        step()
      })
    }
    step()
  })
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * One page per test: a real `<ml-video-player>` and a `SpliceEditor` that clips it, with every event
 * the editor emits recorded. The player is the preview. The editor's parts are found with `part()`, in
 * the editor and then the player (where the crop window is drawn).
 */
export class EditorHarness {
  player!: PlayerElement
  editor: EditorApi | null = null
  readonly props = reactive<Record<string, unknown>>({})
  readonly events: Array<{ type: string; detail: unknown }> = []
  private host: HTMLElement | null = null
  private app: App | null = null
  private serial = 0
  private files: string[] = []

  /** A WebVTT file as an object URL, for a player's `tracks`; revoked on cleanup. */
  createVtt(text: string): string {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/vtt' }))
    this.files.push(url)
    return url
  }

  /** Puts a muted player on the page and waits until it has loaded and sits at `time`. */
  async mountPlayer({ src = flowerUrl, tracks, time = 2 }: PlayerOptions = {}): Promise<PlayerElement> {
    this.player?.remove()
    const player = document.createElement('ml-video-player') as PlayerElement
    player.id = `splice-test-player-${++this.serial}`
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
      () => readMediaState(player.mediaElement),
    )
    if (time === null) return player

    const media = player.mediaElement!
    player.seek(time)
    // The handle's currentTime follows `timeupdate`, a little after the seek lands, and it's the one the editor reads.
    await waitFor(
      () => !media.seeking && Math.abs(media.currentTime - time) < 0.2 && Math.abs(player.currentTime - time) < 0.2,
      `the player at ${time}`,
      20_000,
      () => `handle currentTime=${player.currentTime}; ${readMediaState(media)}`,
    )
    return player
  }

  /**
   * The player, then an editor for it. An HLS source is passed as `source`, since the player plays it
   * through MediaSource.
   */
  async mount(props: Record<string, unknown> = {}, options: PlayerOptions = {}): Promise<EditorApi> {
    await this.mountPlayer(options)
    const isHls = options.src && /\.m3u8(?:[?#]|$)/.test(options.src)
    Object.assign(this.props, { player: markRaw(this.player), source: isHls ? options.src : undefined, ...props })

    const record = (type: string) => (detail: unknown) => this.events.push({ type, detail })
    const render = () =>
      h(SpliceEditor, {
        ...this.props,
        ref: (instance) => (this.editor = instance as EditorApi | null),
        onExport: record('export'),
        onError: record('error'),
        'onUpdate:open': (open: boolean) => {
          record('update:open')(open)
          this.props.open = open
        },
      })

    this.host = document.createElement('div')
    document.body.append(this.host)
    this.app = createApp({ render })
    this.app.mount(this.host)
    await waitFor(() => this.editor !== null, 'the editor to mount')
    return this.editor!
  }

  async open(props: Record<string, unknown> = {}, options: PlayerOptions = {}): Promise<EditorApi> {
    const editor = await this.mount(props, options)
    editor.show()
    await waitFor(
      () => this.state === 'editing',
      'the editor',
      20_000,
      () => `state=${this.state} status=${this.part('.splice-editor-status')?.textContent}`,
    )
    return editor
  }

  /** What the editor is doing, from its `data-state`; `'closed'` when it isn't rendered. */
  get state(): string {
    return this.host?.querySelector('.splice-editor')?.getAttribute('data-state') ?? 'closed'
  }

  /** The clip's range, from the handles. */
  get range(): { start: number; end: number } {
    const at = (handle: string) => Number(this.part(`.splice-handle[data-handle="${handle}"]`).getAttribute('aria-valuenow'))
    return { start: at('start'), end: at('end') }
  }

  /** The crop window's position along the frame, from 0 to 1. */
  get cropFocus(): number {
    return Number(this.part('.splice-crop').getAttribute('aria-valuenow')) / 100
  }

  of(type: string): Array<{ type: string; detail: unknown }> {
    return this.events.filter((event) => event.type === type)
  }

  /** An element of the editor's panel, else of the player (its controls, the crop window drawn over it). */
  part<T extends Element = HTMLElement>(selector: string): T {
    return (this.host?.querySelector<T>(selector) ?? this.player?.querySelector<T>(selector))!
  }

  video(): HTMLVideoElement {
    return this.player.mediaElement as HTMLVideoElement
  }

  /** Waits for the player to play inside the range, as it does once the editor is ready. */
  async waitForPlaying(): Promise<void> {
    await waitFor(
      () => {
        const video = this.video()
        return Boolean(video) && !video.paused && this.player.isPlaying && video.currentTime >= this.range.start - 0.3
      },
      'the player to play the range',
      20_000,
      () => `state=${this.state} isPlaying=${this.player.isPlaying} range=${JSON.stringify(this.range)}`,
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
   * the `<video>` has finished that seek and presented the frame.
   */
  async seekTo(at: number): Promise<void> {
    const video = this.video()
    if (!video.paused) throw new Error(`seekTo needs the player paused; ${readMediaState(video)}`)

    const box = this.part('.splice-timeline').getBoundingClientRect()
    const max = Number(this.part('.splice-handle[data-handle="end"]').getAttribute('aria-valuemax'))
    const init = { bubbles: true, composed: true, clientX: box.left + (at / max) * box.width, clientY: box.top + 10, pointerId: 3 }
    const seeked = waitForMediaEvent(video, 'seeked', `the seek to ${at}`)

    this.part('.splice-selection').dispatchEvent(new PointerEvent('pointerdown', init))
    this.part('.splice-selection').dispatchEvent(new PointerEvent('pointerup', init))
    await seeked
    await waitFor(() => !video.seeking && Math.abs(video.currentTime - at) < 0.15, `the player at ${at}`)
    await waitForPresentedFrame(video)
  }

  /** The label of the caption track the player shows, "Off" for none. */
  getCaptions(): string {
    const { captionTracks, activeCaptionIndex } = this.player
    return captionTracks.find((track) => track.index === activeCaptionIndex)?.label ?? 'Off'
  }

  /** Has the player show the caption track named `label` ("Off" for none), through its handle. */
  async chooseCaptions(label: string): Promise<void> {
    const detail = () => `showing=${this.getCaptions()}, tracks: ${this.player.captionTracks.map((track) => track.label).join(', ') || 'none'}`
    if (label === 'Off') {
      this.player.setCaptionTrack(null)
    } else {
      await waitFor(() => this.player.captionTracks.some((track) => track.label === label), `the player to offer ${label}`, 20_000, detail)
      this.player.setCaptionTrack(this.player.captionTracks.find((track) => track.label === label)!.index)
    }
    await waitFor(() => this.getCaptions() === label, `the captions to read ${label}`, 20_000, detail)
  }

  /** Exports and resolves the clip. */
  async export(): Promise<Blob> {
    const before = this.of('export').length
    this.part<HTMLButtonElement>('.splice-export-button').click()
    await waitFor(
      () => this.of('export').length > before,
      'the export',
      60_000,
      () =>
        `state=${this.state} progress=${this.part('.splice-bar')?.getAttribute('aria-valuenow') ?? '-'}% events=${this.events.map((e) => e.type).join(',')}`,
    )
    return (this.of('export')[before].detail as { blob: Blob }).blob
  }

  /** Goes back to editing from a finished clip. */
  async editAgain(): Promise<void> {
    this.part<HTMLButtonElement>('.splice-again').click()
    await waitFor(() => this.state === 'editing', 'the editor again')
  }

  cleanup(): void {
    this.editor?.close()
    this.app?.unmount()
    this.host?.remove()
    this.player?.remove()
    this.app = null
    this.host = null
    this.editor = null
    this.events.length = 0
    for (const key of Object.keys(this.props)) delete this.props[key]
    this.files.forEach((url) => URL.revokeObjectURL(url))
    this.files = []
    // The player remembers the viewer's captions, quality, sound and position; none may leak into the next test.
    localStorage.clear()
  }
}
