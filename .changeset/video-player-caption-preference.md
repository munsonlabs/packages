---
'@munsonlabs/video-player': minor
---

Captions now stay the way the viewer left them. Turning them off, or picking a language, persists across players and reloads like mute and volume already did, so moving to the next video no longer switches a `<track default>` or a manifest's default subtitle rendition back on. The choice is remembered as a language rather than a track index, since indices differ per video, and a video that doesn't offer that language keeps its own default instead.
