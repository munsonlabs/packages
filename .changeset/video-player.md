---
'@munsonlabs/video-player': patch
---

Captions and quality now persist the way mute and volume already did, so turning captions off or picking a resolution carries to the next video and survives a reload. In Vue, headless controls placed inside a player, card or stage now drive it with no `player` prop or `for` id to wire up. `registerPlatform` can take over a URL a built-in platform already claims.

Fixes include desktop Safari losing its controls in fullscreen, Retry doing nothing after a Vimeo or Dailymotion error, hour-long videos reading `80:05`, and blocked storage taking down a click handler.

Breaking:

- `current`, `total` and `vol` are now `currentTime`, `duration` and `currentVolume`
- `seek()` takes seconds; `seekTo()` is gone
- quality is addressed by height everywhere, and `currentQualityIndex` is `currentQualityHeight`
- adapters expose optional `captions`, `quality` and `pip` objects, and `load`/`retry` in place of `setSrc`
- `useCaptions`, `useQuality` and `usePlaybackRate` are plain functions: `cycleCaptionTrack`, `cycleQuality`, `cyclePlaybackRate` and their label helpers
- icon names dropped the `mlv-` prefix, so `override('mlv-play', …)` becomes `override('play', …)`
