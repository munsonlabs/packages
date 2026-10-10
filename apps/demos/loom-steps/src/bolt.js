import { reactive } from 'vue'
import { createStubNative, globalBridge } from 'bolt-bridge-stub'

/** A few stories in Bolt's shape, as the native app would have downloaded them. */
const stories = [
  { entry: { id: 'harbour', type: 'article', title: 'Harbour redevelopment clears its final planning hurdle', section: 'City' } },
  { entry: { id: 'storm', type: 'article', title: 'Storm warnings extended along the coast', section: 'Weather', paywall_locked: true } },
]

/** Every message between the web and the stub app, newest first. */
export const messages = reactive([])

/** The native app, where Bolt's shell would be. Exported so a chapter can play its part, like subscribing. */
export const native = createStubNative({
  stories,
  onCall: (name) => messages.unshift(`web → app   ${name}`),
  onPing: (name) => messages.unshift(`app → web   pugpigUpdate('${name}')`),
})
window.pugpigBridgeService = native

/** The bridge, connected as Bolt's BoltBridgeVue does: it reads everything once, then follows the app's pings. */
export const bridge = globalBridge
bridge.connect()
