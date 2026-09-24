---
'@munsonlabs/video-player': patch
---

play() called straight after pause() now starts playback instead of being skipped, so a tap on the scrubber resumes.
