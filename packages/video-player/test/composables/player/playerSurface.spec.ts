import { describe, it, expect, vi } from 'vite-plus/test'
import { reactive } from 'vue'
import { PLAYER_METHOD_KEYS, PLAYER_STATE_KEYS, exposePlayerSurface } from '@/composables/player/playerSurface'
import type { PlayerContext } from '@/composables/player/playerContext'

describe('exposePlayerSurface', () => {
  it('exposes live state and bound methods, and nothing else', () => {
    const player = reactive({ isPlaying: false, seekTo: vi.fn(), fire: vi.fn(), isFullscreenPending: true }) as unknown as PlayerContext
    const surface = exposePlayerSurface(player)

    expect(surface.isPlaying).toBe(false)
    player.isPlaying = true
    expect(surface.isPlaying).toBe(true)

    surface.seekTo(12)
    expect(player.seekTo).toHaveBeenCalledWith(12)

    expect('fire' in surface).toBe(false)
    expect('isFullscreenPending' in surface).toBe(false)
    expect(Object.keys(surface).sort()).toEqual([...PLAYER_METHOD_KEYS, ...PLAYER_STATE_KEYS].sort())
  })
})
