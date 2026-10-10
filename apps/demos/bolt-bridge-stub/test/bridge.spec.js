import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { reactive } from 'vue'
import { createBridge, createStubNative } from '@/index'

const stories = [{ entry: { id: 'a', type: 'article', title: 'A' } }, { entry: { id: 'gig', type: 'event', title: 'Gig' } }]

/** A native app and a connected bridge, as a page would have after `app.use(BoltBridgeVue)`. */
function connect() {
  const onCall = vi.fn()
  window.pugpigBridgeService = createStubNative({ stories, onCall })
  const bridge = reactive(createBridge())
  bridge.connect()
  return { bridge, onCall }
}

/** Lets the native app's ping arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve))

afterEach(() => {
  delete window.pugpigBridgeService
  delete window.pugpigUpdate
})

describe('the bridge stub', () => {
  it('reads the feed from the native app when it connects', () => {
    const { bridge } = connect()
    expect(bridge.stories.map((s) => s.entry.id)).toEqual(['a', 'gig'])
    expect(bridge.stories[0].saved).toBe(false)
  })

  it('round-trips an action: the web asks, the app changes, pings, and the web reads it back', async () => {
    const { bridge, onCall } = connect()
    bridge.setSaved(bridge.stories[0], 0, true)
    expect(onCall).toHaveBeenCalledWith('setSaved', expect.objectContaining({ saved: true }))
    expect(bridge.stories[0].saved).toBe(false) // not until the app says so
    await settle()
    expect(bridge.stories[0].saved).toBe(true)
  })

  it('lets the app change the feed itself', async () => {
    const { bridge } = connect()
    const updated = vi.fn()
    bridge.$on('stories-updated', updated)
    bridge.addToCalendar(bridge.stories[1], 1)
    await settle()
    expect(bridge.stories[1].entry.diarised).toBe(true)
    expect(updated).toHaveBeenCalled()
  })

  it('plays one episode at a time, and pauses the one playing', async () => {
    const { bridge } = connect()
    bridge.openAudio(bridge.stories[0], {}, 0)
    await settle()
    expect(bridge.stories.map((s) => s.playing)).toEqual([true, false])
    bridge.openAudio(bridge.stories[0], {}, 0)
    await settle()
    expect(bridge.stories[0].playing).toBe(false)
  })
})

describe('the paywall', () => {
  const paywalled = [{ entry: { id: 'premium', type: 'article', title: 'Premium', paywall_locked: true } }, ...stories]

  it('locks paywalled stories until the reader subscribes in the app', async () => {
    const onCall = vi.fn()
    const native = createStubNative({ stories: paywalled, onCall })
    window.pugpigBridgeService = native
    const bridge = reactive(createBridge())
    bridge.connect()
    expect(bridge.stories.map((s) => s.locked)).toEqual([true, false, false])

    bridge.call('showPaywall', bridge.stories[0], 0)
    expect(onCall).toHaveBeenCalledWith('showPaywall', [expect.objectContaining({ entry: expect.objectContaining({ id: 'premium' }) }), 0])

    native.setSubscribed(true)
    await settle()
    expect(bridge.stories[0].locked).toBe(false)
  })
})
