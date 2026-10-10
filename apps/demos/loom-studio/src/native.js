import { createStubNative } from 'bolt-bridge-stub'
import { stories } from 'timeline-kit'

/**
 * The native app: in Bolt the iOS or Android shell, here a stub holding the sample stories,
 * installed where the real one lives. Exported so the demo can play the app's part too, like
 * subscribing.
 */
export const native = createStubNative({ stories })
window.pugpigBridgeService = native
