import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive, ref } from 'vue'
import { usePlayerAction } from '@/ui/overlay/usePlayerAction'
import { NO_PLAYLIST } from '@/ui/player/playerContext'
import type { PlayerContext, PlaylistContext } from '@/ui/player/playerContext'
import type { PlayerAction } from '@/types/player'

function makePlayer(overrides: Record<string, unknown> = {}) {
  return reactive({
    isMuted: false,
    isLooping: false,
    toggleMute: vi.fn(),
    toggleLoop: vi.fn(),
    ...overrides,
  }) as unknown as PlayerContext
}

function makePlaylist(overrides: Partial<PlaylistContext> = {}): PlaylistContext {
  return reactive({ ...NO_PLAYLIST, toggleAutoAdvance: vi.fn(), ...overrides }) as PlaylistContext
}

function setup(action: PlayerAction | null, player = makePlayer(), playlist = makePlaylist()) {
  return { ...usePlayerAction(ref(action), player, playlist), player, playlist }
}

describe('no action configured', () => {
  it('reports nothing to render', () => {
    const { currentAction, isCustom, customAction, builtinLabel, builtinActive } = setup(null)

    expect(currentAction.value).toBeNull()
    expect(isCustom.value).toBe(false)
    expect(customAction.value).toBeNull()
    expect(builtinLabel.value).toBe('')
    expect(builtinActive.value).toBe(false)
  })

  it('survives a click with nothing configured', () => {
    expect(() => setup(null).onBuiltinClick()).not.toThrow()
  })
})

describe('the mute built-in', () => {
  it('labels itself for what the click will do, and tracks the muted state', () => {
    const player = makePlayer()
    const { builtinLabel, builtinActive } = setup('mute', player)

    expect(builtinLabel.value).toBe('Mute')
    expect(builtinActive.value).toBe(false)

    player.isMuted = true
    expect(builtinLabel.value).toBe('Unmute')
    expect(builtinActive.value).toBe(true)
  })

  it('toggles mute on click', () => {
    const { onBuiltinClick, player } = setup('mute')
    onBuiltinClick()
    expect(player.toggleMute).toHaveBeenCalled()
  })
})

describe('the loop built-in', () => {
  it('labels itself and toggles loop', () => {
    const player = makePlayer()
    const { builtinLabel, onBuiltinClick } = setup('loop', player)

    expect(builtinLabel.value).toBe('Loop')
    player.isLooping = true
    expect(builtinLabel.value).toBe('Disable loop')

    onBuiltinClick()
    expect(player.toggleLoop).toHaveBeenCalled()
  })
})

describe('the autoplay built-in', () => {
  it('reads and toggles the playlist preference rather than the player', () => {
    const playlist = makePlaylist({ autoAdvance: false })
    const { builtinLabel, builtinActive, onBuiltinClick } = setup('autoplay', makePlayer(), playlist)

    expect(builtinLabel.value).toBe('Autoplay next')
    expect(builtinActive.value).toBe(false)

    onBuiltinClick()
    expect(playlist.toggleAutoAdvance).toHaveBeenCalled()

    playlist.autoAdvance = true
    expect(builtinLabel.value).toBe('Disable autoplay next')
    expect(builtinActive.value).toBe(true)
  })
})

describe('a custom action', () => {
  it('is reported as custom and never treated as a built-in', () => {
    const onClick = vi.fn()
    const custom = { icon: '<svg />', label: 'Save', onClick }
    const { isCustom, customAction, builtinLabel, onBuiltinClick } = setup(custom)

    expect(isCustom.value).toBe(true)
    expect(customAction.value).toEqual(custom)
    expect(builtinLabel.value).toBe('')

    onBuiltinClick()
    expect(onClick).not.toHaveBeenCalled()
  })
})
