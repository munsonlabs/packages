import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref, nextTick } from 'vue'
import { withSetup } from '@test/withSetup'
import { useHud } from '@/overlay/useHud'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup(isPlaying = false, isFullscreen = false) {
  const playing = ref(isPlaying)
  const fullscreen = ref(isFullscreen)
  const { result, wrapper } = withSetup(() => useHud(playing, fullscreen))
  return { ...result, playing, fullscreen, wrapper }
}

describe('initial state', () => {
  it('showHUD starts as true', () => {
    const { showHUD } = setup()
    expect(showHUD.value).toBe(true)
  })

  it('isOpen starts as false', () => {
    const { isOpen } = setup()
    expect(isOpen.value).toBe(false)
  })
})

describe('scheduleHide', () => {
  it('hides the HUD after the default 3500ms delay', () => {
    const { showHUD, scheduleHide } = setup()
    scheduleHide()
    expect(showHUD.value).toBe(true)
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })

  it('accepts a custom delay', () => {
    const { showHUD, scheduleHide } = setup()
    scheduleHide(1000)
    vi.advanceTimersByTime(999)
    expect(showHUD.value).toBe(true)
    vi.advanceTimersByTime(1)
    expect(showHUD.value).toBe(false)
  })

  it('cancels a previous timer when called again', () => {
    const { showHUD, scheduleHide } = setup()
    scheduleHide(2000)
    vi.advanceTimersByTime(1000)
    scheduleHide(2000) // resets the clock
    vi.advanceTimersByTime(1500)
    expect(showHUD.value).toBe(true) // would have hidden at 2000 without reset
  })

  it('closes the controls panel when it fires', () => {
    const { isOpen, openControls, scheduleHide } = setup()
    openControls()
    expect(isOpen.value).toBe(true)
    scheduleHide(500)
    vi.advanceTimersByTime(500)
    expect(isOpen.value).toBe(false)
  })
})

describe('pauseHide', () => {
  it('cancels a scheduled hide', () => {
    const { showHUD, scheduleHide, pauseHide } = setup()
    scheduleHide(1000)
    pauseHide()
    vi.advanceTimersByTime(2000)
    expect(showHUD.value).toBe(true)
  })
})

describe('openControls / closeControls', () => {
  it('openControls sets isOpen and showHUD to true', () => {
    const { showHUD, isOpen, openControls } = setup()
    showHUD.value = false
    openControls()
    expect(isOpen.value).toBe(true)
    expect(showHUD.value).toBe(true)
  })

  it('openControls schedules a hide', () => {
    const { showHUD, openControls } = setup()
    openControls()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })

  it('closeControls sets isOpen to false', () => {
    const { isOpen, openControls, closeControls } = setup()
    openControls()
    closeControls()
    expect(isOpen.value).toBe(false)
  })

  it('closeControls schedules hide when playing', () => {
    const { showHUD, openControls, closeControls } = setup(true)
    openControls()
    closeControls()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })

  it('closeControls does not schedule hide when paused', () => {
    const { showHUD, openControls, closeControls } = setup(false)
    openControls()
    vi.advanceTimersByTime(3500) // flush openControls timer
    showHUD.value = true
    closeControls()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(true)
  })

  it('closeControls also hides showHUD immediately in fullscreen', () => {
    const { showHUD, openControls, closeControls } = setup(false, true)
    openControls()
    closeControls()
    expect(showHUD.value).toBe(false)
  })

  it('closeControls leaves showHUD alone outside fullscreen', () => {
    const { showHUD, openControls, closeControls } = setup(false, false)
    openControls()
    closeControls()
    expect(showHUD.value).toBe(true)
  })

  it('closeControls(true) hides showHUD immediately outside fullscreen too', () => {
    const { showHUD, openControls, closeControls } = setup(false, false)
    openControls()
    closeControls(true)
    expect(showHUD.value).toBe(false)
  })
})

describe('onVideoTap', () => {
  it('shows the HUD', () => {
    const { showHUD, onVideoTap } = setup()
    showHUD.value = false
    onVideoTap()
    expect(showHUD.value).toBe(true)
  })

  it('schedules a hide when playing', () => {
    const { showHUD, onVideoTap } = setup(true)
    onVideoTap()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })

  it('does not schedule a hide when paused', () => {
    const { showHUD, onVideoTap } = setup(false)
    onVideoTap()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(true)
  })
})

describe('onMouseMove', () => {
  it('shows the HUD and schedules a hide', () => {
    const { showHUD, onMouseMove } = setup()
    showHUD.value = false
    onMouseMove()
    expect(showHUD.value).toBe(true)
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })
})

describe('onMouseLeave', () => {
  it('schedules a short hide when playing', () => {
    const { showHUD, onMouseLeave } = setup(true)
    onMouseLeave()
    vi.advanceTimersByTime(600)
    expect(showHUD.value).toBe(false)
  })

  it('does nothing when paused', () => {
    const { showHUD, onMouseLeave } = setup(false)
    onMouseLeave()
    vi.advanceTimersByTime(600)
    expect(showHUD.value).toBe(true)
  })
})

describe('isPlaying watcher', () => {
  it('schedules hide when playback starts', async () => {
    const { showHUD, playing } = setup(false)
    playing.value = true
    await nextTick()
    vi.advanceTimersByTime(3500)
    expect(showHUD.value).toBe(false)
  })

  it('shows HUD and cancels timer when playback pauses', async () => {
    const { showHUD, scheduleHide, playing } = setup(true)
    scheduleHide(1000)
    playing.value = false
    await nextTick()
    vi.advanceTimersByTime(1000)
    expect(showHUD.value).toBe(true) // timer was cancelled
  })
})
