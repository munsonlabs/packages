---
'@munsonlabs/video-player': patch
---

The HUD and controls draw their icons through `@munsonlabs/sigil` as the `mlv` library, so a page can replace any of them at runtime with `override('mlv-play', svg)` or swap the whole set by registering its own `mlv` library, without forking the player.
