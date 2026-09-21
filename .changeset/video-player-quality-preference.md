---
'@munsonlabs/video-player': minor
---

A quality level the viewer picks is now remembered across players and reloads, like captions and volume, so the next video starts at roughly that resolution rather than back on Auto. The `quality` prop still wins outright and records nothing, so a host pinning a resolution never decides on the viewer's behalf.
