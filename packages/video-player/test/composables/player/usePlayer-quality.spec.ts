import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, reactive, nextTick } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { mockIntersectionObserver } from '@test/helpers'
import { fakeAdapter, emitter, resetEmitter } from '@test/composables/player/fakeAdapter'
import type { PlayerProps, StateChangeEvent } from '@/types/player'
import type { QualityLevelInfo } from '@/types/playback'

vi.mock('@/composables/player/useAdapterMount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/composables/player/useAdapterMount')>()),
  mountAdapter: vi.fn(async () => ({
    status: 'mounted',
    mounted: { adapter: fakeAdapter, currentSrc: { src: 'a.m3u8' }, needsReveal: false },
  })),
}))

const { usePlayer } = await import('@/composables/player/usePlayer')

const LEVELS: QualityLevelInfo[] = [
  { index: 0, height: 360, bitrate: 800_000, label: '360p' },
  { index: 1, height: 720, bitrate: 2_500_000, label: '720p' },
  { index: 2, height: 1080, bitrate: 5_000_000, label: '1080p' },
]

const originalGetQualityLevels = fakeAdapter.getQualityLevels

beforeEach(() => {
  vi.clearAllMocks()
  resetEmitter()
  mockIntersectionObserver()
})

afterEach(() => {
  fakeAdapter.getQualityLevels = originalGetQualityLevels
})

function setup(props: Partial<PlayerProps>) {
  const reactiveProps = reactive<PlayerProps>({ src: 'https://example.com/a.m3u8', ...props })
  const events: StateChangeEvent[] = []
  const videoEl = ref<HTMLVideoElement | null>(document.createElement('video'))
  const { result } = withSetup(() => usePlayer(videoEl, reactiveProps, (_name, e) => events.push(e)))
  return { player: result, props: reactiveProps, events }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

async function levelsArrive(): Promise<void> {
  fakeAdapter.getQualityLevels = () => LEVELS
  emitter.trigger('qualitychange')
  await nextTick()
}

describe('quality prop', () => {
  it('leaves Auto alone when unset', async () => {
    setup({})
    await flush()
    await levelsArrive()

    expect(fakeAdapter.setQuality).not.toHaveBeenCalled()
  })

  it('picks the nearest level once the levels are known', async () => {
    const { player } = setup({ quality: 700 })
    await flush()
    expect(fakeAdapter.setQuality).not.toHaveBeenCalled()

    await levelsArrive()

    expect(fakeAdapter.setQuality).toHaveBeenCalledWith(1)
    expect(player.currentQualityIndex.value).toBe(1)
    expect(player.isAutoQuality.value).toBe(false)
  })

  it('follows later changes to the prop, and null restores Auto', async () => {
    const { player, props } = setup({ quality: 720 })
    await flush()
    await levelsArrive()

    props.quality = 1080
    await nextTick()
    expect(fakeAdapter.setQuality).toHaveBeenLastCalledWith(2)

    props.quality = null
    await nextTick()
    expect(fakeAdapter.setQuality).toHaveBeenLastCalledWith(null)
    expect(player.isAutoQuality.value).toBe(true)
  })

  it('does not re-apply over a level the viewer picked when the engine refreshes its levels', async () => {
    const { player } = setup({ quality: 720 })
    await flush()
    await levelsArrive()

    player.setQuality(0)
    emitter.trigger('qualitychange')
    await nextTick()

    expect(vi.mocked(fakeAdapter.setQuality).mock.calls.map(([index]) => index)).toEqual([1, 0])
  })
})
