# Loom Studio demo

[Loom Studio](../../../packages/loom-studio) editing the [timeline kit](../timeline-kit)'s widgets. Previews run against the Bolt bridge and a stub native app ([`bolt-bridge-stub`](../bolt-bridge-stub)), so **Try** really saves, follows and plays, and the calls log shows each bridge call. Your edits are kept in `localStorage`; **… → Back to the examples** starts over.

**Subscriber** (top left) plays the native app's part: off, the paywalled samples (the orchestra article, the Morning Brief podcast) are locked, and in **Try** any action on them logs `call('showPaywall', …)` instead of running; on, they unlock. Use it to check a widget both ways.

```bash
vp run --filter loom-studio-demo dev   # http://localhost:5189
```

Loom and the studio run from source (aliases from `timeline-kit/vite`); the video player runs from its build.
