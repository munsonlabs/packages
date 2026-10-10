# Loom feed demo

An app that only consumes loom, set up like a Bolt timeline. It knows its kit (the [timeline kit](../timeline-kit)), loads a library file, and renders the stories the native app sends over the bridge ([`bolt-bridge-stub`](../bolt-bridge-stub)) with `<Widget :definitions>`. There's no editor here.

```ts
// main.js: the native app, then the bridge
window.pugpigBridgeService = createStubNative({ stories }) // src/native.js
createApp(App).use(BoltBridgeVue)

// App.vue: the bridge is every widget's context
provideKit(timelineKit, useBridge())
```

- It starts from its bundled `public/timeline.library.json`: the kit's example widgets.
- **Import**, **Paste** or drop a file to render another library, such as one made with `createLibrary`. The browser remembers it until **Use the bundled library**.
- Widgets the app can't render (a block or source its kit lacks) are skipped and listed, and so is a library made for another kit.
- Tap the paywalled article or play the members-only podcast: the kit's guard asks the app for its paywall (`bridge.call('showPaywall')`) instead. **Subscribe** there, or flip the switch in the Bridge panel, and they unlock live.
- **Bridge** shows each message as it crosses: the web asking the app (`setSaved`, `openAudio`, `followTopic`, …) and the app pinging back (`pugpigUpdate('savedStories')`). What the app would show on screen appears as toasts.
- Width buttons show the size variants; the theme follows the page's light or dark mode.

```bash
vp run --filter loom-feed-demo dev    # http://localhost:5195
vp run --filter loom-feed-demo test   # the bundled library matches the kit (UPDATE=1 rewrites it)
```
