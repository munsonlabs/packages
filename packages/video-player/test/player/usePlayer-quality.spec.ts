import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, reactive, nextTick } from 'vue'
import { withSetup } from '@test/withSetup'
import { mockIntersectionObserver } from '@test/helpers'
import { fakeAdapter, emitter, resetEmitter } from '@test/player/fakeAdapter'
import type { PlayerProps, StateChangeEvent } from '@/types/player'
import type { QualityLevelInfo } from '@/types/playback'
import { STORAGE_QUALITY_PREFERENCE_KEY } from '@/utils/qualityPreference'

vi.mock('@/player/adapterMount', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/player/adapterMount')>()),
  mountAdapter: vi.fn(async () => ({
    status: 'mounted',
    mounted: { adapter: fakeAdapter, needsReveal: false },
  })),
}))

const { usePlayer } = await import('@/player/usePlayer')

const LEVELS: QualityLevelInfo[] = [
  { index: 0, height: 360, bitrate: 800_000, label: '360p' },
  { index: 1, height: 720, bitrate: 2_500_000, label: '720p' },
  { index: 2, height: 1080, bitrate: 5_000_000, label: '1080p' },
]

const originalGetQualityLevels = fakeAdapter.quality!.levels

beforeEach(() => {
  vi.clearAllMocks()
  resetEmitter()
  mockIntersectionObserver()
})

afterEach(() => {
  fakeAdapter.quality!.levels = originalGetQualityLevels
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
  fakeAdapter.quality!.levels = () => LEVELS
  emitter.trigger('qualitychange')
  await nextTick()
}

describe('quality prop', () => {
  it('leaves Auto alone when unset', async () => {
    setup({})
    await flush()
    await levelsArrive()

    expect(fakeAdapter.quality!.select).not.toHaveBeenCalled()
  })

  it('picks the nearest level once the levels are known', async () => {
    const { player } = setup({ quality: 700 })
    await flush()
    expect(fakeAdapter.quality!.select).not.toHaveBeenCalled()

    await levelsArrive()

    expect(fakeAdapter.quality!.select).toHaveBeenCalledWith(1)
    expect(player.currentQualityHeight.value).toBe(720)
    expect(player.isAutoQuality.value).toBe(false)
  })

  it('follows later changes to the prop, and null restores Auto', async () => {
    const { player, props } = setup({ quality: 720 })
    await flush()
    await levelsArrive()

    props.quality = 1080
    await nextTick()
    expect(fakeAdapter.quality!.select).toHaveBeenLastCalledWith(2)

    props.quality = null
    await nextTick()
    expect(fakeAdapter.quality!.select).toHaveBeenLastCalledWith(null)
    expect(player.isAutoQuality.value).toBe(true)
  })

  it('does not re-apply over a level the viewer picked when the engine refreshes its levels', async () => {
    const { player } = setup({ quality: 720 })
    await flush()
    await levelsArrive()

    player.setQuality(360)
    emitter.trigger('qualitychange')
    await nextTick()

    expect(vi.mocked(fakeAdapter.quality!.select).mock.calls.map(([index]) => index)).toEqual([1, 0])
  })
})

describe('quality preference across players', () => {
  /**
   * A real engine reflects a selection back through current()/isAuto(), and the refresh that follows
   * a qualitychange reads exactly those. Without that, the fake would report Auto straight back over
   * anything the player selected and the assertions below would be measuring the fake.
   */
  let selectedIndex: number | null = null

  beforeEach(() => {
    localStorage.clear()
    selectedIndex = null
    fakeAdapter.quality!.current = () => selectedIndex
    fakeAdapter.quality!.isAuto = () => selectedIndex === null
    vi.mocked(fakeAdapter.quality!.select).mockImplementation((index) => {
      selectedIndex = index
    })
  })

  it('remembers a height the viewer picked, and restores it on the next source', async () => {
    const first = setup({})
    await flush()
    await levelsArrive()

    first.player.setQuality(720)
    expect(fakeAdapter.quality!.select).toHaveBeenCalledWith(1)

    vi.mocked(fakeAdapter.quality!.select).mockClear()
    const second = setup({})
    await flush()
    await levelsArrive()

    expect(fakeAdapter.quality!.select).toHaveBeenCalledWith(1)
    expect(second.player.currentQualityHeight.value).toBe(720)
  })

  it('restores Auto when that is what the viewer last chose', async () => {
    const first = setup({})
    await flush()
    await levelsArrive()
    first.player.setQuality(1080)
    first.player.setQuality(null)

    vi.mocked(fakeAdapter.quality!.select).mockClear()
    const second = setup({})
    await flush()
    await levelsArrive()

    expect(second.player.isAutoQuality.value).toBe(true)
  })

  it('leaves the engine alone when the viewer has never picked', async () => {
    setup({})
    await flush()
    await levelsArrive()

    expect(fakeAdapter.quality!.select).not.toHaveBeenCalled()
  })

  it('lets the prop win over a stored preference', async () => {
    const first = setup({})
    await flush()
    await levelsArrive()
    first.player.setQuality(360)

    vi.mocked(fakeAdapter.quality!.select).mockClear()
    const second = setup({ quality: 1080 })
    await flush()
    await levelsArrive()

    expect(second.player.currentQualityHeight.value).toBe(1080)
  })

  it('does not record the prop as the viewer picking that height', async () => {
    setup({ quality: 1080 })
    await flush()
    await levelsArrive()

    // Asserted on storage rather than a second player, since the host setting a prop must leave no trace at all.
    expect(localStorage.getItem(STORAGE_QUALITY_PREFERENCE_KEY)).toBeNull()
  })

  it('records a viewer pick, and only a viewer pick', async () => {
    const { player } = setup({})
    await flush()
    await levelsArrive()
    expect(localStorage.getItem(STORAGE_QUALITY_PREFERENCE_KEY)).toBeNull()

    player.setQuality(720)

    expect(localStorage.getItem(STORAGE_QUALITY_PREFERENCE_KEY)).toBe(JSON.stringify({ height: 720 }))
  })
})
