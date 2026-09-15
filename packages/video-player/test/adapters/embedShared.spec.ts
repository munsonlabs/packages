import { describe, it, expect, vi } from 'vite-plus/test'
import { spawnIosFullscreenOverlay } from '@/adapters/embeds/embedShared'
import { createEmitter } from '@/composables/player/emitter'
import { MVP_FULLSCREEN_PENDING, MVP_FULLSCREEN_PENDING_DONE } from '@/constants'

describe('spawnIosFullscreenOverlay', () => {
  it('fires the pending event immediately and appends an invisible/inert overlay', () => {
    const emitter = createEmitter()
    const onPending = vi.fn()
    emitter.on(MVP_FULLSCREEN_PENDING, onPending)

    const { overlay } = spawnIosFullscreenOverlay(emitter)

    expect(onPending).toHaveBeenCalledOnce()
    expect(document.body.contains(overlay)).toBe(true)
    expect(overlay.style.opacity).toBe('0')
    expect(overlay.style.pointerEvents).toBe('none')
  })

  it('reveal() clears the pending state without removing the overlay', () => {
    const emitter = createEmitter()
    const onPendingDone = vi.fn()
    emitter.on(MVP_FULLSCREEN_PENDING_DONE, onPendingDone)
    const { overlay, reveal } = spawnIosFullscreenOverlay(emitter)

    reveal()

    expect(onPendingDone).toHaveBeenCalledOnce()
    expect(document.body.contains(overlay)).toBe(true)
  })

  /**
   * Regression test: onReady previously called finish() (which both signals "no longer pending"
   * AND tears down/removes the overlay) instead of a dedicated reveal step — removing the
   * overlay, and the clone player's own mount point inside it, the instant it became ready,
   * before anything was ever shown, and permanently blocking the real teardown afterwards.
   */
  it('finish() can still run after reveal() — the overlay is removed once, by finish, not reveal', () => {
    const emitter = createEmitter()
    const { overlay, reveal, finish } = spawnIosFullscreenOverlay(emitter)
    const onTeardown = vi.fn()

    reveal()
    expect(document.body.contains(overlay)).toBe(true)

    finish(onTeardown)

    expect(document.body.contains(overlay)).toBe(false)
    expect(onTeardown).toHaveBeenCalledOnce()
  })

  it('finish() is idempotent — a second call does not re-invoke onTeardown', () => {
    const emitter = createEmitter()
    const { finish } = spawnIosFullscreenOverlay(emitter)
    const onTeardown = vi.fn()

    finish(onTeardown)
    finish(onTeardown)

    expect(onTeardown).toHaveBeenCalledOnce()
  })

  it('reveal() after finish() does nothing (overlay already torn down)', () => {
    const emitter = createEmitter()
    const { overlay, reveal, finish } = spawnIosFullscreenOverlay(emitter)

    finish()
    reveal()

    expect(document.body.contains(overlay)).toBe(false)
  })
})
