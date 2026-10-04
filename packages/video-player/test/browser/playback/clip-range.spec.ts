import { describe, it, expect } from 'vite-plus/test'
import { defineComponent, h, onMounted, ref } from 'vue'
import { render } from 'vitest-browser-vue'
import { VideoPlayer, Scrubber } from '@/index'
import type { PlayerHandle } from '@/index'
import { catalogue, CLIP_DURATION } from '@test/browser/catalogue'
import { EventSink, mountPlayer, waitFor } from '@test/browser/harness'

/**
 * The media time of every frame presented for `ms` (`requestVideoFrameCallback`; where an engine has
 * none, `currentTime` once per animation frame), and the frame duration they imply.
 */
async function presented(video: HTMLVideoElement, ms: number): Promise<{ times: number[]; frame: number }> {
  const times: number[] = []
  const started = performance.now()
  await new Promise<void>((resolve) => {
    const next = () => {
      if (performance.now() - started >= ms) return resolve()
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback((_now, meta) => {
          times.push(meta.mediaTime)
          next()
        })
      } else {
        requestAnimationFrame(() => {
          times.push(video.currentTime)
          next()
        })
      }
    }
    next()
  })
  const steps = times
    .slice(1)
    .map((time, i) => time - times[i])
    .filter((step) => step > 0.005 && step < 0.1)
    .sort((a, b) => a - b)
  return { times, frame: steps[Math.floor(steps.length / 2)] ?? 1 / 30 }
}

/** Counts the frame callbacks a `<video>` has asked for and not yet had or cancelled. */
function trackFrameCallbacks(video: HTMLVideoElement) {
  const live = new Set<number>()
  const request = video.requestVideoFrameCallback?.bind(video)
  const cancel = video.cancelVideoFrameCallback?.bind(video)
  if (!request || !cancel) return null
  video.requestVideoFrameCallback = (callback) => {
    const id: number = request((now, meta) => {
      live.delete(id)
      callback(now, meta)
    })
    live.add(id)
    return id
  }
  video.cancelVideoFrameCallback = (id) => {
    live.delete(id)
    cancel(id)
  }
  return {
    get live() {
      return live.size
    },
  }
}

/** Samples the playhead every 40ms for `ms`, while playback runs. */
async function sample(video: HTMLVideoElement, ms: number): Promise<number[]> {
  const times: number[] = []
  const started = Date.now()
  while (Date.now() - started < ms) {
    times.push(video.currentTime)
    await new Promise((r) => setTimeout(r, 40))
  }
  return times
}

describe('setClipRange', () => {
  it('loops the range while playing, staying inside it, and publishes it as clipRange', async () => {
    const { player, video } = await mountPlayer(catalogue.plain, { muted: true })
    player.setClipRange({ start: 1, end: 1.8 }, { end: 'loop' })
    expect(player.clipRange).toEqual({ start: 1, end: 1.8 })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    const times = await sample(video, 2400)
    // The end is checked on every presented frame, so a loop never runs a quarter of a second past it.
    expect(Math.max(...times)).toBeLessThan(1.8 + 0.1)
    expect(Math.min(...times.slice(5))).toBeGreaterThan(1 - 0.2)
    const wraps = times.filter((time, i) => i > 0 && time < times[i - 1] - 0.3).length
    expect(wraps).toBeGreaterThanOrEqual(2)
    expect(player.isPlaying).toBe(true)
  })

  it('loops within two frames of the end, frame by frame', async () => {
    const { player, video } = await mountPlayer(catalogue.plain, { muted: true })
    expect(player.mediaElement).toBe(video)
    const end = 1.8
    player.setClipRange({ start: 1, end }, { end: 'loop' })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    const { times, frame } = await presented(video, 2400)
    const overshoot = Math.max(...times) - end
    console.log(
      `CLIP_RANGE_OVERSHOOT ${navigator.userAgent.match(/(Firefox|Chrome|Version)\/[\d.]+/)?.[0]} ${(overshoot * 1000).toFixed(1)}ms frame=${(frame * 1000).toFixed(1)}ms frames=${times.length}`,
    )
    expect(times.filter((time, i) => i > 0 && time < times[i - 1] - 0.3).length).toBeGreaterThanOrEqual(2)
    expect(overshoot).toBeLessThanOrEqual(2 * frame + 0.005)
  })

  it('runs its frame callbacks only while playing inside a range, and lets go of them on pause, clear and unmount', async () => {
    const { player, video, screen } = await mountPlayer(catalogue.plain, { muted: true })
    const callbacks = trackFrameCallbacks(video)
    if (!callbacks) return
    player.setClipRange({ start: 1, end: 3 }, { end: 'loop' })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    expect(callbacks.live, 'none while paused').toBe(0)
    await player.play()
    await waitFor(() => callbacks.live === 1, 'a frame callback while playing')

    player.pause()
    await waitFor(() => !player.isPlaying, 'the pause')
    expect(callbacks.live, 'cancelled on pause').toBe(0)

    await player.play()
    await waitFor(() => callbacks.live === 1, 'a frame callback again')
    player.setClipRange(null)
    expect(callbacks.live, 'cancelled with the range').toBe(0)

    player.setClipRange({ start: 1, end: 3 }, { end: 'loop' })
    await waitFor(() => callbacks.live === 1, 'a frame callback for the new range')
    screen.unmount()
    expect(callbacks.live, 'cancelled on unmount').toBe(0)
  })

  it('loops a range that runs to the end of the media from the ended event', async () => {
    const { player, video } = await mountPlayer(catalogue.plain, { muted: true })
    const start = CLIP_DURATION - 0.8
    player.setClipRange({ start, end: CLIP_DURATION }, { end: 'loop' })
    player.seek(start)
    await waitFor(() => Math.abs(player.currentTime - start) < 0.2, 'the seek to the start')
    await player.play()
    await waitFor(() => video.currentTime > CLIP_DURATION - 0.3, 'playback to near the end')
    await waitFor(() => video.currentTime < start + 0.3 && !video.paused, 'the loop back from the end')
    expect(player.clipRange).toEqual({ start, end: CLIP_DURATION })
  })

  it('pauses once at the end by default, then plays on', async () => {
    const { player, video, sink } = await mountPlayer(catalogue.plain, { muted: true })
    player.setClipRange({ start: 1, end: 1.6 })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    await sink.next('pause')
    expect(video.currentTime).toBeGreaterThanOrEqual(1.6)
    // Paused from the frame at the end, not from the next timeupdate.
    expect(video.currentTime).toBeLessThan(1.6 + 0.1)
    await player.play()
    await waitFor(() => video.currentTime > 2.4, 'playback to continue past the range')
  })

  it('plays straight through with end: continue', async () => {
    const { player, video, sink } = await mountPlayer(catalogue.plain, { muted: true })
    player.setClipRange({ start: 1, end: 1.4 }, { end: 'continue' })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    await player.play()
    await waitFor(() => video.currentTime > 2.2, 'playback past the range')
    expect(sink.has('pause')).toBe(false)
    expect(player.clipRange).toEqual({ start: 1, end: 1.4 })
  })

  it('lets go when cleared with null', async () => {
    const { player, video } = await mountPlayer(catalogue.plain, { muted: true })
    player.setClipRange({ start: 1, end: 1.6 }, { end: 'loop' })
    player.seek(1)
    await waitFor(() => Math.abs(player.currentTime - 1) < 0.2, 'the seek to the start')
    player.setClipRange(null)
    expect(player.clipRange).toBeNull()
    await player.play()
    await waitFor(() => video.currentTime > 2.4, 'playback to run past the old range')
    expect(player.isPlaying).toBe(true)
  })

  it('highlights the range on the scrubber and follows a new one', async () => {
    const sink = new EventSink()
    const captured: { player: PlayerHandle | null } = { player: null }
    const Host = defineComponent({
      setup() {
        const player = ref<PlayerHandle | null>(null)
        onMounted(() => (captured.player = player.value))
        return () => h(VideoPlayer, { ...catalogue.plain, muted: true, controls: false, ref: player, onStateChange: sink.push }, () => [h(Scrubber)])
      },
    })
    const screen = await render(Host)
    await waitFor(() => Boolean(captured.player?.isLoaded), 'the player to load')
    const player = captured.player!
    const highlight = () => screen.container.querySelector<HTMLElement>('[data-testid="clip-range"]')
    expect(highlight()).toBeNull()

    player.setClipRange({ start: 1, end: 2 }, { end: 'loop' })
    await waitFor(() => highlight() !== null, 'the highlight')
    expect(parseFloat(highlight()!.style.left)).toBeCloseTo((1 / player.duration) * 100, 1)
    expect(parseFloat(highlight()!.style.width)).toBeCloseTo((1 / player.duration) * 100, 1)

    player.setClipRange({ start: 3, end: 4.5 })
    await waitFor(() => parseFloat(highlight()?.style.left ?? '0') > (2.5 / player.duration) * 100, 'the highlight to move')
    expect(parseFloat(highlight()!.style.width)).toBeCloseTo((1.5 / player.duration) * 100, 1)

    player.setClipRange(null)
    await waitFor(() => highlight() === null, 'the highlight to go')
  })
})
