---
'@munsonlabs/video-player': patch
---

Embed SDK load failures now surface an error with a working Retry, the player handle gains `play()`, `pause()`, `replay()`, `seekTo()` and `isLoaded`, and the public API is trimmed of internal wiring (playlist bridge props, the `video-state` event, granular registry exports, `MethodKey`) ahead of the first stable release. The `title` prop is renamed `label` (it clashed with `HTMLElement.title` on the custom elements), and `PlaybackAdapter.play()` always returns a promise.
