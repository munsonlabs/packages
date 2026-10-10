import { inject, reactive } from 'vue'
import { createBridge } from './bridge'

/**
 * The bridge as Vue state, one per page, like `globalBridge` from `@pugpigbolt/bridge/vue`.
 * Being `reactive()`, everything that reads it re-renders when the native app pings.
 */
export const globalBridge = reactive(createBridge())

/**
 * Like Bolt's `BoltBridgeVue`: connects to the native app and provides the bridge as
 * `globalBridge`, the key Bolt's widget composables inject.
 */
export const BoltBridgeVue = (app) => {
  globalBridge.connect()
  app.provide('globalBridge', globalBridge)
}

export const useBridge = () => inject('globalBridge', globalBridge)
