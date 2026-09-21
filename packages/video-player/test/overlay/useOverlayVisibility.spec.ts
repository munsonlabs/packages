import { describe, it, expect } from 'vite-plus/test'
import { reactive } from 'vue'
import { useOverlayVisibility } from '@/overlay/useOverlayVisibility'
import type { PlayerContext, HudContext } from '@/player/playerContext'

function makePlayer(overrides: Record<string, unknown> = {}) {
  return reactive({ isReady: true, isError: false, isFullscreen: false, ...overrides }) as unknown as PlayerContext
}

function makeHud(overrides: Record<string, unknown> = {}) {
  return reactive({ isOpen: false, showHUD: true, ...overrides }) as unknown as HudContext
}

describe('hudVisible', () => {
  it('follows hud.showHUD when the player is ready and error-free', () => {
    const hud = makeHud()
    const { hudVisible } = useOverlayVisibility(makePlayer(), hud)
    expect(hudVisible.value).toBe(true)
    hud.showHUD = false
    expect(hudVisible.value).toBe(false)
  })

  it('is hidden until the player is ready', () => {
    const { hudVisible } = useOverlayVisibility(makePlayer({ isReady: false }), makeHud())
    expect(hudVisible.value).toBe(false)
  })

  it('is hidden while the player is in an error state', () => {
    const { hudVisible } = useOverlayVisibility(makePlayer({ isError: true }), makeHud())
    expect(hudVisible.value).toBe(false)
  })

  it('stays ambient (follows showHUD) in fullscreen too', () => {
    const player = makePlayer({ isFullscreen: true })
    const hud = makeHud({ isOpen: true, showHUD: true })
    const { hudVisible } = useOverlayVisibility(player, hud)
    expect(hudVisible.value).toBe(true)
    hud.showHUD = false
    expect(hudVisible.value).toBe(false)
  })

  it('stays visible with the popup open outside fullscreen', () => {
    const { hudVisible } = useOverlayVisibility(makePlayer(), makeHud({ isOpen: true }))
    expect(hudVisible.value).toBe(true)
  })
})

describe('popupVisible', () => {
  it('follows hud.isOpen when the player is ready and error-free', () => {
    const hud = makeHud()
    const { popupVisible } = useOverlayVisibility(makePlayer(), hud)
    expect(popupVisible.value).toBe(false)
    hud.isOpen = true
    expect(popupVisible.value).toBe(true)
  })

  it('is hidden until the player is ready', () => {
    const { popupVisible } = useOverlayVisibility(makePlayer({ isReady: false }), makeHud({ isOpen: true }))
    expect(popupVisible.value).toBe(false)
  })

  it('in fullscreen, follows hud.showHUD instead of hud.isOpen — auto-shows/hides like a standard player', () => {
    const player = makePlayer({ isFullscreen: true })
    const hud = makeHud({ isOpen: false, showHUD: true })
    const { popupVisible } = useOverlayVisibility(player, hud)
    expect(popupVisible.value).toBe(true)

    hud.showHUD = false
    expect(popupVisible.value).toBe(false)
  })
})
