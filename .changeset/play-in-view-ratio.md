---
'@munsonlabs/video-player': patch
---

`playInViewRatio` sets how much of a `playInView` player must be on screen before it plays (0.5 by default). `1` waits for all of it, and a player too big to fit plays once it fills as much of the screen as it can. That also applies at the default, so a player more than twice the screen's height now plays in view instead of never.
