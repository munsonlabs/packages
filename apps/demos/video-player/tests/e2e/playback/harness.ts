import { defineComponent, onMounted, ref, reactive } from 'vue'
import { render } from 'vitest-browser-vue'
import { VideoPlayer, VideoStage, VideoCard } from '@munsonlabs/video-player'
import type { PlayerHandle, StateChangeEvent, StateChangeType, VideoEntry } from '@munsonlabs/video-player'

export async function waitFor(predicate: () => boolean, message: string, timeout = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

/** Every `state-change` the mounted player emitted, in order - the surface package consumers actually depend on. */
export class EventSink {
  readonly events: StateChangeEvent[] = reactive([])

  push = (e: StateChangeEvent): void => {
    this.events.push(e)
  }

  of(type: StateChangeType): StateChangeEvent[] {
    return this.events.filter((e) => e.type === type)
  }

  has(type: StateChangeType): boolean {
    return this.of(type).length > 0
  }

  async next(type: StateChangeType, after = 0): Promise<StateChangeEvent> {
    await waitFor(() => this.of(type).length > after, `a '${type}' state-change`)
    return this.of(type)[after]
  }

  clear(): void {
    this.events.length = 0
  }
}

export interface MountedPlayer {
  screen: Awaited<ReturnType<typeof render>>
  video: HTMLVideoElement
  player: PlayerHandle
  sink: EventSink
  /** Performs a real click so the page holds a user gesture - required before anything unmuted can play. */
  activate: () => Promise<void>
}

/**
 * Mounts a bare `VideoPlayer` on a fixture, captures its exposed handle and every state-change.
 * Muted autoplay by default: Chromium permits that without a gesture, so tests only pay for
 * `activate()` when they genuinely need sound.
 */
export async function mountPlayer(entry: VideoEntry, props: Partial<VideoEntry> = { autoplay: true, muted: true }): Promise<MountedPlayer> {
  const sink = new EventSink()
  const captured: { player: PlayerHandle | null } = { player: null }

  const Host = defineComponent({
    components: { VideoPlayer },
    props: { entry: { type: Object, required: true }, extra: { type: Object, required: true } },
    setup(hostProps) {
      const playerRef = ref<PlayerHandle | null>(null)
      onMounted(() => (captured.player = playerRef.value))
      return { playerRef, onStateChange: sink.push, merged: { ...(hostProps.entry as VideoEntry), ...(hostProps.extra as object) } }
    },
    // The extra button exists only to be clicked: any real click grants the page user activation,
    // without which Chromium refuses unmuted playback. The player's own controls are either
    // aria-hidden (HUD) or visually clipped (the skip link), so neither is reliably clickable.
    template: `
      <div>
        <VideoPlayer ref="playerRef" v-bind="merged" :controls="true" @state-change="onStateChange" />
        <button type="button">grant gesture</button>
      </div>
    `,
  })

  const screen = await render(Host, { props: { entry, extra: props } })
  const video = screen.container.querySelector<HTMLVideoElement>('video.mlv-video')
  if (!video || !captured.player) throw new Error('VideoPlayer did not mount a <video> / expose its handle')
  await waitFor(() => video.duration > 0, 'video metadata to load')

  return {
    screen,
    video,
    player: captured.player,
    sink,
    activate: () => screen.getByRole('button', { name: 'grant gesture' }).click(),
  }
}

export interface MountedStage {
  screen: Awaited<ReturnType<typeof render>>
  stage: PlayerHandle & { playNext(): void; hasNext: boolean }
  sink: EventSink
  /** Clicks the Nth card's placeholder, which dispatches that entry to the stage (a real gesture). */
  selectCard: (index: number) => Promise<void>
  stageVideo: () => HTMLVideoElement | null
}

/** Mounts a `VideoStage` over a playlist plus one `VideoCard` per entry, the way VideoPanel does with `show-stage`. */
export async function mountStage(playlist: VideoEntry[]): Promise<MountedStage> {
  const sink = new EventSink()
  const captured: { stage: MountedStage['stage'] | null } = { stage: null }

  const Host = defineComponent({
    components: { VideoStage, VideoCard },
    props: { playlist: { type: Array, required: true } },
    setup() {
      const stageRef = ref<MountedStage['stage'] | null>(null)
      onMounted(() => (captured.stage = stageRef.value))
      return { stageRef, onStateChange: sink.push }
    },
    template: `
      <div>
        <VideoStage ref="stageRef" :playlist="playlist" @state-change="onStateChange" />
        <VideoCard v-for="v in playlist" :key="v.src" v-bind="v" :lazy="true" :controls="true" />
      </div>
    `,
  })

  const screen = await render(Host, { props: { playlist } })
  if (!captured.stage) throw new Error('VideoStage did not expose its handle')

  return {
    screen,
    stage: captured.stage,
    sink,
    selectCard: (index) => screen.getByRole('button', { name: 'Play' }).nth(index).click(),
    stageVideo: () => screen.container.querySelector<HTMLVideoElement>('.stage video.mlv-video'),
  }
}
