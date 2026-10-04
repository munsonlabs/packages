import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import masterUrl from '@test/browser/media/ladder/master.m3u8?url'
import { setPickerDefaults } from '@/elements'
import { engine } from '@test/browser/helpers'
import { PickerHarness, waitFor } from '@test/browser/picker-harness'

const harness = new PickerHarness()
const part = <T extends Element = HTMLElement>(selector: string) => harness.part<T>(selector)

/**
 * Records what reel and Mediabunny fetch (both go through `globalThis.fetch`; the page player's
 * hls.js loads with XHR, and WebKit plays the stream natively, so neither shows up here).
 */
function recordFetches() {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    return original(input, init)
  }
  return {
    count: (name: string) => urls.filter((url) => new URL(url, location.href).pathname.endsWith(`/ladder/${name}`)).length,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

let restore: (() => void) | null = null

beforeEach(() => {
  setPickerDefaults({ length: 2, longest: 3 })
})

afterEach(() => {
  restore?.()
  restore = null
  harness.cleanup()
})

describe('<ml-reel-picker> HLS playlists', () => {
  it('fetches the master and each media playlist once per opening, the export included', async () => {
    const log = recordFetches()
    restore = log.restore
    const picker = await harness.open({ endCard: false }, { src: masterUrl })
    await waitFor(() => part('.reel-timeline').dataset.filmstrip === 'ready', 'the filmstrip')
    // The English rendition on show: the picker loads its cues for the overlay and the export.
    await harness.chooseCaptions('English')
    await harness.export()
    const counts = {
      master: log.count('master.m3u8'),
      small: log.count('small/playlist.m3u8'),
      large: log.count('large/playlist.m3u8'),
      english: log.count('subs/en.m3u8'),
    }
    console.log(`REEL_PLAYLISTS ${engine()} one opening: ${JSON.stringify(counts)}`)
    expect(counts.master).toBe(1)
    expect(counts.small).toBeLessThanOrEqual(1)
    expect(counts.large).toBeLessThanOrEqual(1)
    expect(counts.english).toBe(1)

    // A new opening starts a new cache: the playlists are read again, once.
    picker.close()
    picker.show()
    await waitFor(() => picker.state === 'editing', 'the editor again')
    await waitFor(() => part('.reel-timeline').dataset.filmstrip === 'ready', 'the filmstrip again')
    expect(log.count('master.m3u8')).toBe(2)
  })
})
