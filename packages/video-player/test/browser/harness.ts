import { defineComponent, h, onMounted, ref, reactive } from 'vue'
import { render } from 'vitest-browser-vue'
import { VideoPlayer, VideoStage, VideoCard } from '@/index'
import type { PlayerHandle, StateChangeEvent, StateChangeType, VideoEntry } from '@/index'

export async function waitFor(predicate: () => boolean, message: string, timeout = 20_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

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
  /** A real click grants the user activation Chromium requires before unmuted playback. */
  activate: () => Promise<void>
}

export interface MountOptions {
  awaitMetadata?: boolean
}

export async function mountPlayer(
  entry: VideoEntry,
  props: Partial<VideoEntry> = { autoplay: true, muted: true },
  { awaitMetadata = true }: MountOptions = {},
): Promise<MountedPlayer> {
  const sink = new EventSink()
  const captured: { player: PlayerHandle | null } = { player: null }

  const Host = defineComponent({
    props: { entry: { type: Object, required: true }, extra: { type: Object, required: true } },
    setup(hostProps) {
      const playerRef = ref<PlayerHandle | null>(null)
      onMounted(() => (captured.player = playerRef.value))
      const merged = { ...(hostProps.entry as VideoEntry), ...(hostProps.extra as object) }
      return () =>
        h('div', [h(VideoPlayer, { ...merged, ref: playerRef, onStateChange: sink.push }), h('button', { type: 'button' }, 'grant gesture')])
    },
  })

  const screen = await render(Host, { props: { entry, extra: props } })
  const video = screen.container.querySelector<HTMLVideoElement>('video.ml-video-media')
  if (!video || !captured.player) throw new Error('VideoPlayer did not mount a <video> / expose its handle')
  if (awaitMetadata) await waitFor(() => captured.player!.isLoaded, 'the player to report loaded')

  return {
    screen,
    video,
    player: captured.player,
    sink,
    activate: () => screen.getByRole('button', { name: 'grant gesture' }).click(),
  }
}

export interface MountedCard {
  screen: Awaited<ReturnType<typeof render>>
  sink: EventSink
  video: () => HTMLVideoElement | null
  clickPlaceholder: () => Promise<void>
}

export async function mountCard(entry: VideoEntry): Promise<MountedCard> {
  const sink = new EventSink()
  const Host = defineComponent({
    props: { entry: { type: Object, required: true } },
    setup: (hostProps) => () => h('div', [h(VideoCard, { ...(hostProps.entry as VideoEntry), onStateChange: sink.push })]),
  })
  const screen = await render(Host, { props: { entry } })
  return {
    screen,
    sink,
    video: () => screen.container.querySelector<HTMLVideoElement>('video.ml-video-media'),
    clickPlaceholder: () => screen.getByRole('button', { name: 'Play' }).click(),
  }
}

export interface MountedStage {
  screen: Awaited<ReturnType<typeof render>>
  stage: PlayerHandle & { playNext(): void; hasNext: boolean }
  sink: EventSink
  selectCard: (index: number) => Promise<void>
  stageVideo: () => HTMLVideoElement | null
}

export async function mountStage(playlist: VideoEntry[]): Promise<MountedStage> {
  const sink = new EventSink()
  const captured: { stage: MountedStage['stage'] | null } = { stage: null }

  const Host = defineComponent({
    props: { playlist: { type: Array, required: true } },
    setup(hostProps) {
      const stageRef = ref<MountedStage['stage'] | null>(null)
      onMounted(() => (captured.stage = stageRef.value))
      return () =>
        h('div', [
          h(VideoStage, { playlist: hostProps.playlist as VideoEntry[], ref: stageRef, onStateChange: sink.push }),
          ...(hostProps.playlist as VideoEntry[]).map((v) => h(VideoCard, { ...v, key: v.src, lazy: true, controls: true })),
        ])
    },
  })

  const screen = await render(Host, { props: { playlist } })
  if (!captured.stage) throw new Error('VideoStage did not expose its handle')

  return {
    screen,
    stage: captured.stage,
    sink,
    selectCard: (index) => screen.getByRole('button', { name: 'Play' }).nth(index).click(),
    stageVideo: () => screen.container.querySelector<HTMLVideoElement>('.stage video.ml-video-media'),
  }
}
