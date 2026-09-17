---
'@munsonlabs/video-player': patch
---

YouTube and Vimeo embeds now surface a failed SDK script load as a playback error (clearing the loading spinner and showing Retry) instead of hanging forever, matching the Dailymotion adapter. Retry now actually re-runs the SDK load and player connect for all three embed adapters, and `loadScript` no longer caches a failed load so the re-fetch is real.
