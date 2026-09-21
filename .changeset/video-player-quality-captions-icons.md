---
'@munsonlabs/video-player': minor
---

Added a `quality` prop (a target height in pixels, applied as the nearest level each source offers, `null` for Auto) with `qualityHeight` on the `qualitychange` event, a `captionLine` prop that keeps caption cues clear of overlaid UI, and a fix so HLS sources never show two caption tracks at once. Icon names dropped the `mlv-` prefix (`play` instead of `mlv-play`) - breaking for any existing `override('mlv-play', …)` call.
