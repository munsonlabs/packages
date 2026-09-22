import { describe, it, expect } from 'vite-plus/test'

/**
 * `:has()` with a nested `:not()` is what decides whether the centred play row survives next to the
 * controls popup, and only a real engine evaluates it. Asserted through `matches()` on a built DOM
 * rather than through computed style on a live player, whose own hide timers would race the check.
 */
function build(popupClass: string): { row: Element; cleanup: () => void } {
  const host = document.createElement('div')
  host.innerHTML = `<div class="overlay__hud"></div><div class="${popupClass}"></div>`
  document.body.appendChild(host)
  return { row: host.querySelector('.overlay__hud')!, cleanup: () => host.remove() }
}

const HIDDEN_BEHIND_POPUP = '.overlay__hud:has(~ .overlay__popup:not(.overlay__popup--fs))'

describe('the rule that hides the centred row behind the popup', () => {
  it('hides it behind a centred popup', () => {
    const { row, cleanup } = build('overlay__popup')
    expect(row.matches(HIDDEN_BEHIND_POPUP)).toBe(true)
    cleanup()
  })

  it('leaves it alone beside a popup docked for fullscreen', () => {
    const { row, cleanup } = build('overlay__popup overlay__popup--fs')
    expect(row.matches(HIDDEN_BEHIND_POPUP)).toBe(false)
    cleanup()
  })

  it('leaves it alone when no popup is showing', () => {
    const { row, cleanup } = build('something-else')
    expect(row.matches(HIDDEN_BEHIND_POPUP)).toBe(false)
    cleanup()
  })
})
