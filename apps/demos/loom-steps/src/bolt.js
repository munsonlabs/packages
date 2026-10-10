import { reactive } from 'vue'
import { createStubNative, globalBridge } from 'bolt-bridge-stub'
// The timeline kit's sample feed: something for every kind of story, in Bolt's shape.
import { stories } from 'timeline-kit'

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
