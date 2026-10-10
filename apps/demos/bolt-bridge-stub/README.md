# bolt-bridge-stub

A stand-in for `@pugpigbolt/bridge` and the native app behind it, so the loom demos run the way a Bolt timeline does, with no Bolt. Same names, same flow, about 200 lines.

```
 native app (stub)                         web (bridge)                       widgets
 window.pugpigBridgeService  <-- reads --  globalBridge (reactive store)  <-- context: every loom source
                             <-- actions --  openArticle, setSaved, …      <-- composables call these
  pings: pugpigUpdate(name)  ---------->   reads `name` again, store updates, widgets re-render
```

1. **The web asks.** A composable calls `bridge.setSaved(story, index, true)`. The bridge sends JSON to `window.pugpigBridgeService.setSaved(json)`, as Bolt's `dispatchBridgeAction` does.
2. **The app changes and pings.** The stub saves it, then calls `window.pugpigUpdate('savedStories')`.
3. **The web reads.** The bridge calls `pugpigBridgeService.savedStories()`, updates its `saved` set, and `bridge.stories` applies it to each story (`story.saved`), as Bolt's `deriveStories` does. Everything reading it re-renders.

| File        | Is                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `types.js`  | `Story`, `StoryEntry`, and `NativeService`: the native side's methods                                       |
| `bridge.js` | `createBridge()`: the store, the incoming handlers (one per ping), the outgoing actions, `$on`/`$emit`      |
| `native.js` | `createStubNative({ stories })`: the pretend app, with its own saved/read/followed/playing/subscribed state |
| `vue.js`    | `globalBridge`, `BoltBridgeVue` (connects and provides `globalBridge`), `useBridge()`                       |

```ts
window.pugpigBridgeService = createStubNative({ stories }) // where the native app would be
createApp(App).use(BoltBridgeVue).mount('#app') // connect, then provide `globalBridge`
```

**Paywalls.** The bridge works out `story.locked` from the entry's `paywall_locked` and the reader's `authorisationStatus`, as Bolt's `deriveStories` does, so widgets only ever see a settled flag. `bridge.call('showPaywall', story, index)` asks the app to show its paywall (Bolt's `call` escape hatch, with the arguments as a JSON array). The stub's `setSubscribed(true)` stands in for subscribing on that screen: the app pings `authorisationStatus` and every paywalled story unlocks.

To swap in the real thing, import `globalBridge`, `BoltBridgeVue` and `useBridge` from `@pugpigbolt/bridge/vue` instead, and drop the stub: the native shell provides `pugpigBridgeService`. Three things here have no typed equivalent in Bolt's bridge: the `followTopic` action (reach it with `bridge.call('followTopic', …)`), and the `followedTopics` and `nowPlaying` reads.

```bash
vp run --filter bolt-bridge-stub test
```
