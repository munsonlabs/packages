---
'@munsonlabs/video-player': patch
---

When a platform lists a source over both http and https, as Brightcove's Playback API does, the player now picks the https one, so https pages no longer have the manifest blocked as mixed content or by a Content Security Policy.
