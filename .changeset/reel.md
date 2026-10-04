---
'@munsonlabs/reel': minor
---

Experimental first cut of reel: `createClip()` trims a video, crops it to 9:16 (or any aspect) and exports an MP4 with H.264 video and AAC audio entirely in the browser with WebCodecs and Mediabunny. AAC audio is copied without re-encoding and other audio is encoded as AAC; where this browser has no AAC encoder (Firefox), a source with other audio gives a silent clip and `onWarning({ reason: 'audio-unavailable', target: 'audio', message })` (`console.warn` by default). An abort that lands while the file is being finalised still rejects with the signal's reason. Sources are a `Blob`, a URL or a `<video>`; one that cannot be clipped rejects with a `ClipError` carrying a stable `reason` code (an embed page, DRM, MediaSource, a MediaStream, DASH, a cross-origin file without CORS, an unreadable container, an undecodable video, no H.264 encoder, no WebCodecs).
