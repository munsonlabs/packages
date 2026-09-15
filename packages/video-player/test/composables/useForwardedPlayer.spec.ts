import { describe, it, expect, vi } from 'vite-plus/test'
import { useForwardedPlayer } from '@/composables/useForwardedPlayer'
import type { MethodKey } from '@/composables/useForwardedPlayer'
import type { PlayerContext } from '@/composables/player/playerContext'

function makePlayer(overrides: Partial<PlayerContext> = {}): PlayerContext {
  return {
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    seek: vi.fn(),
    isPlaying: false,
    isMuted: false,
    ...overrides,
  } as unknown as PlayerContext
}

describe('method forwarding', () => {
  it('is a safe no-op when no player is attached yet', async () => {
    const { forwarded } = useForwardedPlayer()

    await expect(forwarded.togglePlay()).resolves.toBeUndefined()
  })

  it('forwards a call to the attached player once playerRef is set', async () => {
    const { playerRef, forwarded } = useForwardedPlayer()
    const player = makePlayer()
    playerRef.value = player

    await forwarded.togglePlay()

    expect(player.togglePlay).toHaveBeenCalledOnce()
  })

  it('forwards call arguments through to the underlying method', async () => {
    const { playerRef, forwarded } = useForwardedPlayer()
    const player = makePlayer()
    playerRef.value = player

    await forwarded.seek(42)

    expect(player.seek).toHaveBeenCalledWith(42)
  })
})

describe('guard', () => {
  it('defaults to letting every call through', async () => {
    const { playerRef, forwarded } = useForwardedPlayer()
    const player = makePlayer()
    playerRef.value = player

    await forwarded.toggleMute()

    expect(player.toggleMute).toHaveBeenCalledOnce()
  })

  it('swallows the call when guard returns false, never reaching the player', async () => {
    const player = makePlayer()
    const guard = vi.fn(() => false)
    const { playerRef, forwarded } = useForwardedPlayer(guard)
    playerRef.value = player

    await forwarded.togglePlay()

    expect(guard).toHaveBeenCalledWith('togglePlay')
    expect(player.togglePlay).not.toHaveBeenCalled()
  })

  it('lets the call through once an async guard resolves true', async () => {
    const player = makePlayer()
    const guard = vi.fn(() => Promise.resolve(true))
    const { playerRef, forwarded } = useForwardedPlayer(guard)
    playerRef.value = player

    await forwarded.togglePlay()

    expect(player.togglePlay).toHaveBeenCalledOnce()
  })

  it('can run a side effect (e.g. mounting a lazy placeholder) before letting the call through', async () => {
    const player = makePlayer()
    const sideEffect = vi.fn()
    const guard = vi.fn((key: MethodKey) => {
      sideEffect(key)
      return true
    })
    const { playerRef, forwarded } = useForwardedPlayer(guard)
    playerRef.value = player

    await forwarded.toggleMute()

    expect(sideEffect).toHaveBeenCalledWith('toggleMute')
    expect(player.toggleMute).toHaveBeenCalledOnce()
  })
})

describe('state forwarding', () => {
  it('is undefined when no player is attached yet', () => {
    const { forwarded } = useForwardedPlayer()

    expect(forwarded.isPlaying.value).toBeUndefined()
  })

  it('reflects the attached player state reactively as playerRef changes', () => {
    const { playerRef, forwarded } = useForwardedPlayer()

    playerRef.value = makePlayer({ isPlaying: true })
    expect(forwarded.isPlaying.value).toBe(true)

    playerRef.value = makePlayer({ isPlaying: false })
    expect(forwarded.isPlaying.value).toBe(false)
  })
})
