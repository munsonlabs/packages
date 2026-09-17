---
'@munsonlabs/video-player': minor
---

Player handle additions: `play()` (returns a promise that resolves once playing and rejects on an autoplay block or media error), `pause()`, `seekTo(seconds)` alongside the percent-based `seek()`, and `isLoaded` with a matching `loaded` state-change once the duration is known. Methods forwarded through wrapper components and custom elements now return the underlying result, so `await player.play()` works there too.
