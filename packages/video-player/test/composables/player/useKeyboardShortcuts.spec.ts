import { describe, it, expect, vi } from 'vite-plus/test'
import { useKeyboardShortcuts } from '@/composables/player/useKeyboardShortcuts'
import type { PlayerContext, HudContext } from '@/composables/player/playerContext'

function makePlayer(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    total: 100,
    current: 50,
    vol: 0.5,
    supportsCaptions: false,
    activeCaptionIndex: null,
    togglePlay: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleFullscreen: vi.fn(),
    setCaptionTrack: vi.fn(),
    ...overrides,
  } as unknown as PlayerContext
}

function makeHud(): HudContext {
  return { onMouseMove: vi.fn() } as unknown as HudContext
}

function fireKeydown(
  onKeydown: (e: KeyboardEvent) => void,
  key: string,
  target: HTMLElement,
  extra: Partial<KeyboardEvent> = {},
): { preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn()
  const event = { key, target, preventDefault, repeat: false, metaKey: false, ctrlKey: false, altKey: false, ...extra }
  onKeydown(event as unknown as KeyboardEvent)
  return { preventDefault }
}

describe('form control guard', () => {
  it('does not seek when a range input has focus', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const input = document.createElement('input')
    input.type = 'range'

    fireKeydown(onKeydown, 'ArrowRight', input)

    expect(player.seek).not.toHaveBeenCalled()
  })

  it('does not jump to start/end when a range input has focus', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const input = document.createElement('input')
    input.type = 'range'

    fireKeydown(onKeydown, 'Home', input)

    expect(player.seek).not.toHaveBeenCalled()
  })

  it('still fires m/f/c/digit/Space shortcuts while a range input has focus - it only owns arrow/Home/End keys natively', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const input = document.createElement('input')
    input.type = 'range'

    fireKeydown(onKeydown, 'm', input)
    fireKeydown(onKeydown, 'f', input)
    fireKeydown(onKeydown, ' ', input)
    fireKeydown(onKeydown, '5', input)

    expect(player.toggleMute).toHaveBeenCalledOnce()
    expect(player.toggleFullscreen).toHaveBeenCalledOnce()
    expect(player.togglePlay).toHaveBeenCalledOnce()
    expect(player.seek).toHaveBeenCalledWith(50)
  })

  it('does not toggle play when a text input has focus', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const input = document.createElement('input')
    input.type = 'text'

    fireKeydown(onKeydown, ' ', input)

    expect(player.togglePlay).not.toHaveBeenCalled()
  })

  it('does not react to keys inside a contenteditable element', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')

    fireKeydown(onKeydown, 'm', el)

    expect(player.toggleMute).not.toHaveBeenCalled()
  })
})

describe('activation-key guard on buttons/links', () => {
  it('lets a focused button own Space/Enter instead of toggling play', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const button = document.createElement('button')

    fireKeydown(onKeydown, ' ', button)
    fireKeydown(onKeydown, 'Enter', button)

    expect(player.togglePlay).not.toHaveBeenCalled()
  })

  it('still fires non-activation shortcuts while a button has focus', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    const button = document.createElement('button')

    fireKeydown(onKeydown, 'ArrowRight', button)

    expect(player.seek).toHaveBeenCalledOnce()
  })
})

describe('shortcuts on the bare shell', () => {
  const shell = () => document.createElement('div')

  it('togglePlay on Space and k', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, ' ', shell())
    fireKeydown(onKeydown, 'k', shell())
    expect(player.togglePlay).toHaveBeenCalledTimes(2)
  })

  it('seeks forward/back by the configured step on arrow keys', () => {
    const player = makePlayer({ current: 50, total: 100 })
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())

    fireKeydown(onKeydown, 'ArrowRight', shell())
    expect((player.seek as ReturnType<typeof vi.fn>).mock.lastCall?.[0]).toBeCloseTo(55)

    fireKeydown(onKeydown, 'ArrowLeft', shell())
    expect((player.seek as ReturnType<typeof vi.fn>).mock.lastCall?.[0]).toBeCloseTo(45)
  })

  it('clamps seek to the start/end of the video', () => {
    const player = makePlayer({ current: 2, total: 100 })
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'ArrowLeft', shell())
    expect(player.seek).toHaveBeenCalledWith(0)
  })

  it('adjusts volume up/down and clamps to 0-1', () => {
    const player = makePlayer({ vol: 0.95 })
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'ArrowUp', shell())
    expect(player.setVolume).toHaveBeenCalledWith(1)
  })

  it('mutes/fullscreens on m/f', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'm', shell())
    fireKeydown(onKeydown, 'f', shell())
    expect(player.toggleMute).toHaveBeenCalledOnce()
    expect(player.toggleFullscreen).toHaveBeenCalledOnce()
  })

  it('toggles captions on c only when supported', () => {
    const player = makePlayer({ supportsCaptions: false })
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'c', shell())
    expect(player.setCaptionTrack).not.toHaveBeenCalled()
  })

  it('jumps to a percentage of duration on digit keys', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, '7', shell())
    expect(player.seek).toHaveBeenCalledWith(70)
  })

  it('seeks to start/end on Home/End', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'Home', shell())
    expect(player.seek).toHaveBeenCalledWith(0)
    fireKeydown(onKeydown, 'End', shell())
    expect(player.seek).toHaveBeenCalledWith(100)
  })
})

describe('ignored input', () => {
  it('ignores auto-repeated keydowns', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, ' ', document.createElement('div'), { repeat: true })
    expect(player.togglePlay).not.toHaveBeenCalled()
  })

  it('ignores modifier-held combos', () => {
    const player = makePlayer()
    const { onKeydown } = useKeyboardShortcuts(player, makeHud())
    fireKeydown(onKeydown, 'f', document.createElement('div'), { metaKey: true })
    expect(player.toggleFullscreen).not.toHaveBeenCalled()
  })
})
