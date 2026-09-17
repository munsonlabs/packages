import { defineComponent, onMounted, ref, reactive } from 'vue'
import { render } from 'vitest-browser-vue'
import { VideoPlayer, VideoStage, VideoCard } from '@munsonlabs/video-player'
import type { PlayerHandle, StateChangeEvent, StateChangeType, VideoEntry } from '@munsonlabs/video-player'
import { useEventLog } from '../../src/composables/useEventLog'

export async function waitFor(predicate: () => boolean, message: string, timeout = 10_000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for: ${message}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

export const CUES = [
  { time: 0, text: 'Cue one - opening frame.' },
  { time: 2, text: 'Cue two - two seconds in.' },
  { time: 4, text: 'Cue three - four seconds in.' },
]

export async function waitForLogged(type: string) {
  const { log } = useEventLog()
  await waitFor(() => log.value.some((e) => e.type === type), `a '${type}' state-change to be logged`)
  return log.value.find((e) => e.type === type)!
}

export function loggedTime(entry: { ct: string }): number {
  return parseFloat(entry.ct)
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
  /** Default true. Set false for sources that never load metadata (preload="none", a broken URL). */
  awaitMetadata?: boolean
}

/** Muted autoplay by default so tests only pay for activate() when they need sound. */
export async function mountPlayer(
  entry: VideoEntry,
  props: Partial<VideoEntry> = { autoplay: true, muted: true },
  { awaitMetadata = true }: MountOptions = {},
): Promise<MountedPlayer> {
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
    template: `
      <div>
        <VideoPlayer ref="playerRef" v-bind="merged" @state-change="onStateChange" />
        <button type="button">grant gesture</button>
      </div>
    `,
  })

  const screen = await render(Host, { props: { entry, extra: props } })
  const video = screen.container.querySelector<HTMLVideoElement>('video.mlv-video')
  if (!video || !captured.player) throw new Error('VideoPlayer did not mount a <video> / expose its handle')
  if (awaitMetadata) await waitFor(() => video.duration > 0, 'video metadata to load')

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

/** A lazy VideoCard with no stage on the page: placeholder first, real player on click or in-view activation. */
export async function mountCard(entry: VideoEntry): Promise<MountedCard> {
  const sink = new EventSink()
  const Host = defineComponent({
    components: { VideoCard },
    props: { entry: { type: Object, required: true } },
    setup: () => ({ onStateChange: sink.push }),
    template: `<div><VideoCard v-bind="entry" @state-change="onStateChange" /></div>`,
  })
  const screen = await render(Host, { props: { entry } })
  return {
    screen,
    sink,
    video: () => screen.container.querySelector<HTMLVideoElement>('video.mlv-video'),
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
