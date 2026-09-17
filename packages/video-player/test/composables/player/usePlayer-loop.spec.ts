import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref, reactive, nextTick } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { mockIntersectionObserver } from '@test/helpers'
import { fakeAdapter, emitter, resetEmitter } from '@test/composables/player/fakeAdapter'
import type { PlayerProps, StateChangeEvent } from '@/types/player'

vi.mock('@/composables/player/useAdapterMount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/composables/player/useAdapterMount')>()),
  mountAdapter: vi.fn(async () => ({
    status: 'mounted',
    mounted: { adapter: fakeAdapter, currentSrc: { src: 'a.mp4' }, needsReveal: false },
  })),
}))

const { usePlayer } = await import('@/composables/player/usePlayer')

beforeEach(() => {
  vi.clearAllMocks()
  resetEmitter()
  mockIntersectionObserver()
})

function setup(props: Partial<PlayerProps>) {
  const reactiveProps = reactive<PlayerProps>({ src: 'https://example.com/a.mp4', ...props })
  const events: StateChangeEvent[] = []
  const videoEl = ref<HTMLVideoElement | null>(document.createElement('video'))
  const { result } = withSetup(() => usePlayer(videoEl, reactiveProps, (_name, e) => events.push(e)))
  return { player: result, props: reactiveProps, events }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('loop prop', () => {
  it('defaults to off', () => {
    const { player } = setup({})
    expect(player.isLooping.value).toBe(false)
  })

  it('starts looping when loop is true', () => {
    const { player } = setup({ loop: true })
    expect(player.isLooping.value).toBe(true)
  })

  it('restarts instead of ending when loop is set and the media ends', async () => {
    const { player, events } = setup({ loop: true })
    await flush()
    emitter.trigger('play')
    emitter.trigger('ended')

    expect(fakeAdapter.setCurrentTime).toHaveBeenCalledWith(0)
    expect(fakeAdapter.play).toHaveBeenCalled()
    expect(player.hasEnded.value).toBe(false)
    expect(events.map((e) => e.type)).not.toContain('ended')
  })

  it('tracks later changes to the prop, like toggleLoop() would', async () => {
    const { player, props, events } = setup({ loop: false })
    await flush()
    emitter.trigger('play')

    props.loop = true
    await nextTick()
    expect(player.isLooping.value).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'loopchange', isLooping: true })

    props.loop = false
    await nextTick()
    expect(player.isLooping.value).toBe(false)
    expect(events.at(-1)).toMatchObject({ type: 'loopchange', isLooping: false })
  })

  it('does not fight toggleLoop() when the prop is left alone', async () => {
    const { player, props } = setup({ loop: true })
    player.toggleLoop()
    expect(player.isLooping.value).toBe(false)
    props.title = 'nudge'
    await nextTick()
    expect(player.isLooping.value).toBe(false)
  })
})
