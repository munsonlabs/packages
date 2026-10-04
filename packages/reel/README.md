<div align="center">

<img src="https://raw.githubusercontent.com/munsonlabs/packages/main/docs/public/brand/marks/reel.svg" width="176" height="176" alt="Munson Labs Reel">

# @munsonlabs/reel

</div>

> **Experimental.** This is a feasibility spike. The API will change and it is not published. It
> needs nothing but Mediabunny.

In-browser clip making with WebCodecs. Take the video someone is watching, trim a segment, crop it to
9:16 (or any aspect) and export an MP4 (H.264 + AAC), all on the device with no server. Containers are handled by [Mediabunny](https://mediabunny.dev); reel adds cropping,
codec planning and clear reasons for when a source cannot be clipped.

```ts
import { canClip, createClip } from '@munsonlabs/reel'

const check = await canClip(videoElement) // or a URL, or a File/Blob
if (!check.ok) {
  console.warn(check.reason, check.message) // 'mse' | 'drm' | 'embed' | 'unreachable' | ...
}

const controller = new AbortController()
const clip: Blob = await createClip({
  source: videoElement, // Blob | string | URL | HTMLVideoElement
  start: 42,
  end: 52,
  crop: { aspect: '9:16', focus: 0.4 }, // focus: 0 = left edge, 1 = right edge
  onProgress: (fraction) => bar.update(fraction),
  onWarning: (warning) => console.info(warning.message), // e.g. audio left out
  signal: controller.signal,
})
// clip.type is 'video/mp4': H.264 video, AAC audio
```

## API

| Export                                  | Description                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createClip(options)`                   | Trim, crop, encode. Resolves a `Blob`; rejects with a `ClipError` (with `reason`) or the abort signal's reason.                                         |
| `canClip(source, options?)`             | Reads only the header. Resolves `{ ok: true, info, plan }` or `{ ok: false, reason, message }`; never throws.                                           |
| `support()`                             | Probes `VideoEncoder`/`AudioEncoder`/`VideoDecoder.isConfigSupported` for the H.264 encoder and decoder and the AAC encoder, the only codecs clips use. |
| `planCrop`, `planOutput`, `parseAspect` | The pieces `createClip` is built from, exported for previews and tests.                                                                                 |

`createClip` options: `source`, `start`, `end`, `crop: { aspect, focus, height }`,
`audio` (`false` drops it), `onProgress`, `onWarning`, `signal`.

### Output

- The crop window is the largest one of the aspect that fits, at its own resolution (a 720p source
  gives 404x720); `crop.height: 1920` scales to 1080x1920.
- Rotated sources (a phone's upright video is stored landscape with a rotation matrix) are cropped in
  display orientation: the crop and focus work on the picture as it is seen, and the
  clip carries the turn in its pixels, with no rotation metadata.
- Always MP4 with H.264 video and AAC audio (`planOutput`); no H.264 encoder at the clip's size is
  `no-video-encoder`. AAC audio is **copied**, so an AAC source needs no AAC encoder; other audio is
  encoded as AAC. Where there is no AAC encoder (Firefox), a source with other audio gives a **silent**
  clip and `onWarning({ reason: 'audio-unavailable', target: 'audio', message })`;
  `canClip(...).plan.audio` is `'copy' | 'encode' | 'none' | 'unavailable'`.
- No tags at all: the source's tags are never copied.

### What cannot be clipped

| `reason`                                                                                     | Source                                                                                                      |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `mse`                                                                                        | A `<video>` fed by MediaSource: hls.js, dash.js, Shaka. Pass the playlist URL instead (HLS works directly). |
| `dash`                                                                                       | A `.mpd` manifest. Mediabunny reads files and HLS, not DASH.                                                |
| `drm`                                                                                        | A `<video>` with `mediaKeys` (EME). Decoded frames of protected media are not readable.                     |
| `media-stream`                                                                               | A `<video>` with a `MediaStream` (`srcObject`).                                                             |
| `embed`                                                                                      | YouTube, Vimeo, Dailymotion, Brightcove or JW Player page URLs.                                             |
| `unreachable`                                                                                | A URL that cannot be fetched: most often a cross-origin file without CORS (and Range) headers.              |
| `unsupported-container`, `no-video`, `undecodable-video`, `no-video-encoder`, `no-webcodecs` | What they say.                                                                                              |

## Browser results (spike, Apple M3 Pro, macOS 26.7)

Real-browser suite through Playwright, all passing in Chromium 151, WebKit 26.5 and Firefox 153.

| 10s of 1280x720 30fps H.264/AAC, 9:16 | Chromium | WebKit | Firefox |
| ------------------------------------- | -------- | ------ | ------- |
| 404x720 output                        | ~1.2s    | ~1.7s  | ~0.83s  |
| 1080x1920 output                      | ~1.8s    | ~2.1s  | ~1.9s   |

| Encoder (`isConfigSupported`) | Chromium | WebKit | Firefox |
| ----------------------------- | -------- | ------ | ------- |
| H.264 `avc1.640028` 1080x1920 | yes      | yes    | yes     |
| AAC `mp4a.40.2`               | yes      | yes    | **no**  |

WebKit's `drawImage(VideoFrame, sx, sy, sw, sh, …)` ignores the source rectangle, so reel crops by
drawing the whole frame offset and scaled instead (see `test/browser/clip/webkit-drawimage.spec.ts`).

## Develop

```bash
vp test                                                        # unit + chromium, webkit, firefox
vp test --project browser --browser.name=webkit --reporter=verbose   # one engine, with the REEL_* evidence lines
node scripts/make-fixture.mjs [count] [rotated]               # regenerate the generated fixtures
```
