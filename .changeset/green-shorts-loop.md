---
'@munsonlabs/video-player': patch
---

Add `loop` and `preload` props to `VideoPlayer`/`VideoCard` (and the matching custom-element attributes).

- `loop` starts the player with looping on and stays reactive, so a feed no longer has to wait for the player to mount and call `toggleLoop()`.
- `preload` maps to the native `<video preload>` attribute. For HLS via hls.js, `'none'` also defers segment loading until the first play, since the attribute alone can't hold hls.js back. Unset leaves the browser default, so existing players are unaffected.
