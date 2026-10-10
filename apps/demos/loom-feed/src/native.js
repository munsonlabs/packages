import { shallowRef } from 'vue'
import { createStubNative } from 'bolt-bridge-stub'
import { stories } from 'timeline-kit'

/**
 * One message across the bridge: the web asking the app, or the app pinging the web.
 *
 * @typedef {object} BridgeMessage
 * @property {number} id
 * @property {'to-app' | 'to-web'} direction
 * @property {string} name
 * @property {string} [detail]
 */

/** The last messages across the bridge, newest first, for the demo's Bridge panel. */
export const messages = shallowRef([])
const listeners = new Set()
let id = 0

const log = (message) => (messages.value = [{ ...message, id: id++ }, ...messages.value].slice(0, 30))

/** Every call the web makes to the app. */
export const onNativeCall = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const describe = (payload) => {
  // `bridge.call` sends its arguments as an array: [story, index].
  if (Array.isArray(payload)) payload = { story: payload[0], index: payload[1] }
  const { story, ...rest } = payload ?? {}
  return [story && `“${story.entry.title}”`, ...Object.entries(rest).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)]
    .filter(Boolean)
    .join(', ')
}

/**
 * The native app. In Bolt it's the iOS or Android shell that loads the timeline; here a stub
 * that holds the sample stories, installed where the real one lives.
 */
export const native = createStubNative({
  stories,
  onCall: (name, payload) => {
    log({ direction: 'to-app', name, detail: describe(payload) })
    listeners.forEach((listener) => listener(name, payload))
  },
  onPing: (name) => log({ direction: 'to-web', name: `pugpigUpdate('${name}')` }),
})
window.pugpigBridgeService = native
