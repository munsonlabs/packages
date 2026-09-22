import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { ref } from 'vue'
import { withSetup } from '@test/withSetup'
import { useHud } from '@/ui/overlay/useHud'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

function controlInsidePopup(): HTMLButtonElement {
  const popup = document.createElement('div')
  popup.className = 'overlay__popup'
  const button = document.createElement('button')
  popup.appendChild(button)
  document.body.appendChild(popup)
  return button
}

function setup() {
  const { result } = withSetup(() => useHud(ref(true), ref(true)))
  return result
}

describe('auto-hiding the controls', () => {
  it('hides after a control is clicked, even though the click leaves it focused', () => {
    const hud = setup()
    const button = controlInsidePopup()
    hud.openControls()

    // A mouse click focuses the button without the browser showing a focus ring. jsdom reports every
    // focus as focus-visible, so the browser's own answer is stubbed; the real behaviour is covered
    // by test/browser/playback/fullscreen-hud.spec.ts.
    button.focus()
    vi.spyOn(button, 'matches').mockReturnValue(false)
    hud.scheduleHide()
    vi.advanceTimersByTime(10_000)

    expect(hud.showHUD.value).toBe(false)
  })

  it('waits while a control has keyboard focus, so the ring is not yanked mid-navigation', () => {
    const hud = setup()
    const button = controlInsidePopup()
    button.focus()
    // What the browser does once the viewer is navigating by keyboard.
    vi.spyOn(button, 'matches').mockImplementation((selector: string) => selector === ':focus-visible')
    hud.openControls()

    hud.scheduleHide()
    vi.advanceTimersByTime(10_000)

    expect(hud.showHUD.value).toBe(true)
  })

  it('hides when focus is nowhere near the controls', () => {
    const hud = setup()
    hud.openControls()

    hud.scheduleHide()
    vi.advanceTimersByTime(10_000)

    expect(hud.showHUD.value).toBe(false)
  })
})
