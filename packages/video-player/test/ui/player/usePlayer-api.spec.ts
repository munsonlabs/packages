import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, reactive, nextTick } from 'vue'
import { withSetup } from '@test/withSetup'
import { fakeAdapter, emitter, resetEmitter } from '@test/ui/player/fakeAdapter'
import { mockIntersectionObserver, flush, installMemoryStorage } from '@test/helpers'
import type { PlayerProps, StateChangeEvent } from '@/types/player'

vi.mock('@/ui/player/adapterMount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/ui/player/adapterMount')>()),
  mountAdapter: vi.fn(async () => ({
    status: 'mounted',
    mounted: { adapter: fakeAdapter, needsReveal: false },
  })),
}))

const { usePlayer } = await import('@/ui/player/usePlayer')

beforeEach(() => {
  vi.clearAllMocks()
  resetEmitter()
  mockIntersectionObserver()
  installMemoryStorage()
})

async function setup(props: Partial<PlayerProps> = {}) {
  const events: StateChangeEvent[] = []
  const videoEl = ref<HTMLVideoElement | null>(document.createElement('video'))
  const { result } = withSetup(() =>
    usePlayer(videoEl, reactive<PlayerProps>({ src: 'https://example.com/a.mp4', ...props }), (_n, e) => events.push(e)),
  )
  await flush(4)
  return { player: result, events }
}

describe('play()', () => {
  it('resolves once the adapter reports playing', async () => {
    const { player } = await setup()
    let settled = false
    const p = player.play().then(() => (settled = true))
    await flush()
    expect(fakeAdapter.play).toHaveBeenCalledOnce()
    expect(settled).toBe(false)

    emitter.trigger('play')
    emitter.trigger('playing')
    await p
    expect(settled).toBe(true)
    expect(player.isPlaying.value).toBe(true)
  })

  it('rejects when the adapter errors instead', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { player } = await setup()
    const p = player.play()
    emitter.trigger('error')
    await expect(p).rejects.toThrow(/could not be played/)
    expect(player.isError.value).toBe(true)
  })

  it('rejects with the adapter play() rejection (autoplay block)', async () => {
    const { player } = await setup()
    vi.mocked(fakeAdapter.play).mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    await expect(player.play()).rejects.toThrow('blocked')
  })

  it('resolves immediately when already playing', async () => {
    const { player } = await setup()
    emitter.trigger('play')
    await player.play()
    expect(fakeAdapter.play).not.toHaveBeenCalled()
  })
})

describe('replay()', () => {
  it('seeks to 0, clears hasEnded and plays', async () => {
    const { player } = await setup()
    emitter.trigger('play')
    emitter.trigger('ended')
    expect(player.hasEnded.value).toBe(true)

    const p = player.replay()
    expect(vi.mocked(fakeAdapter.setCurrentTime)).toHaveBeenCalledWith(0)
    expect(player.hasEnded.value).toBe(false)
    emitter.trigger('play')
    emitter.trigger('playing')
    await p
    expect(player.isPlaying.value).toBe(true)
  })
})

describe('pause() / seek()', () => {
  it('pause() pauses the adapter', async () => {
    const { player } = await setup()
    player.pause()
    expect(fakeAdapter.pause).toHaveBeenCalledOnce()
  })

  it('seek() takes seconds and clamps to the known duration', async () => {
    const { player } = await setup()
    emitter.trigger('durationchange')
    await nextTick()
    expect(player.duration.value).toBe(100)

    player.seek(30)
    player.seek(500)
    player.seek(-5)
    expect(vi.mocked(fakeAdapter.setCurrentTime).mock.calls.map((c) => c[0])).toEqual([30, 100, 0])
  })
})

describe('isLoaded', () => {
  it('flips once the duration is known and fires `loaded` once', async () => {
    const { player, events } = await setup()
    expect(player.isLoaded.value).toBe(false)

    emitter.trigger('durationchange')
    await nextTick()
    emitter.trigger('durationchange')
    await nextTick()

    expect(player.isLoaded.value).toBe(true)
    expect(events.filter((e) => e.type === 'loaded')).toHaveLength(1)
  })

  it('resets on retry() so the reload reports loaded again', async () => {
    const { player, events } = await setup()
    emitter.trigger('durationchange')
    await nextTick()
    expect(player.isLoaded.value).toBe(true)

    player.retry()
    expect(player.isLoaded.value).toBe(false)
    await nextTick()
    emitter.trigger('durationchange')
    await nextTick()
    expect(events.filter((e) => e.type === 'loaded')).toHaveLength(2)
  })
})
