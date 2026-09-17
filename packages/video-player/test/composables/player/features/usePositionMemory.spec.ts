import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/composables/withSetup'
import { usePositionMemory } from '@/composables/player/features/usePositionMemory'
import { savePosition, getPosition, clearPosition } from '@/utils/positionMemory'
import type { PlaybackAdapter } from '@/types/playback'

vi.mock('@/utils/positionMemory', () => ({
  savePosition: vi.fn(),
  getPosition: vi.fn(() => null),
  clearPosition: vi.fn(),
}))

const URL = 'https://example.com/video.mp4'

function makeAdapter(currentTime: number): PlaybackAdapter {
  return { setCurrentTime: vi.fn(), currentTime: () => currentTime } as unknown as PlaybackAdapter
}

beforeEach(() => {
  vi.mocked(savePosition).mockClear()
  vi.mocked(getPosition).mockReset().mockReturnValue(null)
  vi.mocked(clearPosition).mockClear()
})

describe('restoreOnce', () => {
  it('seeks to a previously-saved position exactly once', () => {
    vi.mocked(getPosition).mockReturnValue(42)
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(false)))
    const adapter = makeAdapter(0)

    result.restoreOnce(adapter)
    expect(adapter.setCurrentTime).toHaveBeenCalledWith(42)

    result.restoreOnce(adapter)
    expect(adapter.setCurrentTime).toHaveBeenCalledOnce()

    wrapper.unmount()
  })

  it('does nothing when there is no saved position', () => {
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(false)))
    const adapter = makeAdapter(0)

    result.restoreOnce(adapter)

    expect(adapter.setCurrentTime).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('save', () => {
  it('persists the current position', () => {
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(false)))
    const adapter = makeAdapter(37)

    result.save(adapter)

    expect(savePosition).toHaveBeenCalledWith(URL, 37)
    wrapper.unmount()
  })

  it('does nothing when there is no player', () => {
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(false)))

    result.save(null)

    expect(savePosition).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('skips saving once the video has ended', () => {
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(true)))
    const adapter = makeAdapter(37)

    result.save(adapter)

    expect(savePosition).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('clear', () => {
  it('clears the saved position', () => {
    const { result, wrapper } = withSetup(() => usePositionMemory(URL, () => null, ref(false)))

    result.clear()

    expect(clearPosition).toHaveBeenCalledWith(URL)
    wrapper.unmount()
  })
})

describe('auto-save', () => {
  it('saves when the tab becomes hidden', () => {
    const getPlayer = vi.fn(() => makeAdapter(37))
    const { wrapper } = withSetup(() => usePositionMemory(URL, getPlayer, ref(false)))

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(savePosition).toHaveBeenCalledWith(URL, 37)
    wrapper.unmount()
  })

  it('does not save when the tab becomes visible again', () => {
    const getPlayer = vi.fn(() => makeAdapter(37))
    const { wrapper } = withSetup(() => usePositionMemory(URL, getPlayer, ref(false)))

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(savePosition).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('saves once more on unmount', () => {
    const getPlayer = vi.fn(() => makeAdapter(51))
    const { wrapper } = withSetup(() => usePositionMemory(URL, getPlayer, ref(false)))

    wrapper.unmount()

    expect(savePosition).toHaveBeenCalledWith(URL, 51)
  })
})
