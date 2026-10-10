# Loom Studio demo

[Loom Studio](../../../packages/loom-studio) editing the [timeline kit](../timeline-kit)'s widgets. Previews run against the Bolt bridge and a stub native app ([`bolt-bridge-stub`](../bolt-bridge-stub)). Your edits are kept in `localStorage`; **… → Back to the examples** starts over.

```bash
vp run --filter loom-studio-demo dev   # http://localhost:5189
```

Loom and the studio run from source (aliases from `timeline-kit/vite`); the video player runs from its build.
