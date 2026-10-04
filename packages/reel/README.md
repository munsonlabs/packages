<div align="center">

<img src="https://raw.githubusercontent.com/munsonlabs/packages/main/docs/public/brand/marks/reel.svg" width="176" height="176" alt="Munson Labs Reel">

# @munsonlabs/reel

</div>

> **Experimental.** This is a feasibility spike. The API will change and it is not published. It
> needs nothing but Mediabunny.

In-browser clip making with WebCodecs. Take the video someone is watching, trim a segment, crop it to
9:16 (or any aspect), burn captions into the picture, stamp your logo on it, end it with a card that
sends viewers back to the article, and export an MP4 (H.264 + AAC), all on the device with no server. Containers are handled by [Mediabunny](https://mediabunny.dev); reel adds cropping, captions,
codec planning and clear reasons for when a source cannot be clipped.

```ts
import { canClip, createClip, clipLink } from '@munsonlabs/reel'

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
  captions: { cues: videoElement.textTracks[0] }, // style: { ... } overrides the boxed look near the bottom
  origin: { url: location.href, title: document.title, publisher: 'Example' },
  endCard: { logo: '/logo.svg' }, // logo, publisher, title and the article's readable address, from origin
  stamp: { logo: '/logo.svg' }, // the logo in the top-right corner of every clip frame, clear of app UI
  watermark: { text: 'example.com' },
  onProgress: (fraction) => bar.update(fraction),
  onWarning: (warning) => console.info(warning.message), // e.g. a logo, captions or audio left out
  signal: controller.signal,
})
// clip.type is 'video/mp4': H.264 video, AAC audio
clipLink(location.href, 42, 52) // 'https://…#t=42,52'
```

## API

| Export                                                        | Description                                                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createClip(options)`                                         | Trim, crop, burn in captions, encode. Resolves a `Blob`; rejects with a `ClipError` (with `reason`) or the abort signal's reason.                                           |
| `canClip(source, options?)`                                   | Reads only the header. Resolves `{ ok: true, info, plan }` or `{ ok: false, reason, message }`; never throws.                                                               |
| `support()`                                                   | Probes `VideoEncoder`/`AudioEncoder`/`VideoDecoder.isConfigSupported` for the H.264 encoder and decoder and the AAC encoder, the only codecs clips use.                     |
| `loadCaptions(input, { signal })`, `isCaptionText`            | Captions from cues, a `TextTrack`, WebVTT text, or a WebVTT file's URL (fetched; rejects with an `Error` when it cannot be fetched or is not WebVTT); the text-or-URL rule. |
| `clipLink(origin, start, end)`                                | The origin URL with a Media Fragments `#t=start,end`.                                                                                                                       |
| `drawEndCard(ctx, info)`                                      | The default end card renderer, for a custom `endCard.draw` that adds to it.                                                                                                 |
| `createQrCode(text)`, `drawQrCode(ctx, modules, x, y, size)`  | QR modules at ECC M (lazy-loads the encoder) and a pixel-snapped painter.                                                                                                   |
| `readableUrl(url, maxWidth?, measure?)`                       | `https://www.acme.news/a/b?x#t=1,2` → `acme.news/a/b`; shortened in the middle (domain and last segment kept) to fit `maxWidth`.                                            |
| `planStamp(width, height, logo, options?)`                    | The box `stamp` draws a logo in, with the default safe-area margins.                                                                                                        |
| `planCrop`, `planOutput`, `parseVtt`, `toCues`, `parseAspect` | The pieces `createClip` is built from, exported for previews and tests.                                                                                                     |

`createClip` options: `source`, `start`, `end`, `crop: { aspect, focus, height }`, `captions: { cues | tracks, style }`,
`audio` (`false` drops it), `origin`,
`metadata` (default `true` with an origin), `endCard`, `stamp`, `watermark`, `onProgress`, `onWarning`, `signal`.

### Caption input

`captions.cues` is cues, a `TextTrack`, the text of a WebVTT file, or a WebVTT file's URL (a `URL`, or a
string), fetched with the clip's `signal`. Captions are WebVTT only: convert SRT to WebVTT first. **A string
is text** when it starts with `WEBVTT` (after a BOM and whitespace), has a cue timing line
(`00:01.000 --> 00:02.000`), holds whitespace, or is empty; **anything else is a URL**, relative to
`document.baseURI` (`isCaptionText`). Captions that will not load never fail a clip: a file that cannot be
fetched (HTTP error, CORS) or is not WebVTT (no `WEBVTT` header) leaves the clip without captions, with
`onWarning({ reason: 'captions-unavailable', target: 'captions', message })` (or `console.warn`).
`loadCaptions`, called directly, rejects when the file cannot be fetched or read.

`captions.tracks` offers several, in video-player's `tracks` shape (`{ src, kind?, srclang?, label?,
default? }`, each `src` a WebVTT file's URL or WebVTT text): the one marked `default` is burned in, else the
first matching `navigator.language`, else the first. `cues` wins.

### Caption style

Captions have one look: white bold text (4.5% of the height) on a translucent dark box behind each line,
14% above the bottom, wrapping at 86% of the width onto as many lines as a cue needs. It reads well on
desktop and TV; a host posting to TikTok or Reels, whose own text covers roughly the bottom quarter, can
raise it with `position` and `margin`. `captions.style` is a `CaptionStyle` of overrides, each optional:
`fontFamily`, `fontWeight` (`700`), `size` (`0.045` of the height), `color` (white), `background`
(`'rgba(0, 0, 0, 0.6)'`, or `null` for no box), `position` (`'top' | 'middle' | 'bottom'`), `margin`
(`0.14` of the height) and `maxWidth` (`0.86` of the width).

### End card, stamp and watermark

`endCard` (or `endCard: true`) adds `duration` seconds (default 2.5) after the clip, faded in over its
last frame: logo, publisher, headline and, as the call to action, the article's address in large type
on a pill (`acme.news/2026/10/tides-rising`). Everything defaults from `origin`; override `title`,
`publisher`, `displayUrl` (the address shown; default `origin.url` without scheme, `www.`, query, hash
or trailing slash, shortened in the middle to fit), `cta` (default `'Watch the full video at'`), `logo`,
`url` (what a QR code encodes, default the `#t=` deep link), `qr` or `theme`. `draw(ctx, info)` replaces
the renderer and is called for every card frame with the resolved values, `time`, `progress`, the QR
modules and the clip's `lastFrame`. The card is silent: audio ends with the clip.

**The QR code is off by default.** Clips are mostly watched on phones (TikTok, Reels, Shorts,
WhatsApp), and nobody can scan a code on their own screen. Set `endCard: { qr: true }` for clips
shown on a TV, a desktop or a big screen, where a second device can scan it; it encodes the full
`#t=` deep link. The QR encoder ([uqr](https://github.com/unjs/uqr), MIT) is only imported then.

`stamp: { logo, position, size, margin, opacity }` draws a logo over every clip frame (not the card):
`'top-right'` by default, `size` 0.18 of the frame width, `opacity` 0.9. The default margins keep it
out from under TikTok/Reels/Shorts UI: `{ x: 0.05, y: 0.11 }` (fractions of width and height) at the
top, clear of the status bar and feed tabs; `{ x: 0.05, y: 0.24 }` bottom-left, above the account
name and caption; `{ x: 0.2, y: 0.24 }` bottom-right, also clear of the right-hand action rail.

Logos (`endCard.logo`, `stamp.logo`) are an image, `Blob` or URL. URLs load through an `<img>` with
`crossOrigin = 'anonymous'`, so a cross-origin logo needs CORS headers; SVG works, with a fallback
size when it has none. Each logo is test-drawn to a 1x1 canvas and read back before encoding starts,
because a tainted canvas makes every `VideoFrame` throw. A logo that fails is left out and the clip
is still made, with `onWarning({ reason: 'logo-unavailable', target: 'endCard' | 'stamp', message })`
(or `console.warn` without a handler).

`watermark: { text, position: 'top' | 'bottom' }` runs a thin strip of text over every frame of the
clip (not the card).

### Output

- The crop window is the largest one of the aspect that fits, at its own resolution (a 720p source
  gives 404x720); `crop.height: 1920` scales to 1080x1920.
- Rotated sources (a phone's upright video is stored landscape with a rotation matrix) are cropped in
  display orientation: the crop, focus and captions all work on the picture as it is seen, and the
  clip carries the turn in its pixels, with no rotation metadata.
- Always MP4 with H.264 video and AAC audio (`planOutput`); no H.264 encoder at the clip's size is
  `no-video-encoder`. AAC audio is **copied**, so an AAC source needs no AAC encoder; other audio is
  encoded as AAC. Where there is no AAC encoder (Firefox), a source with other audio gives a **silent**
  clip and `onWarning({ reason: 'audio-unavailable', target: 'audio', message })`;
  `canClip(...).plan.audio` is `'copy' | 'encode' | 'none' | 'unavailable'`.
- With an `origin`, clips get `©nam` (title), `©ART` + `©pub` (publisher), `©cmt` (deep link),
  `©des`, `©day` and `©too` (encoder) atoms.
  Without one (or with `metadata: false`), no tags at all: the source's tags are never copied.
  Mediabunny cannot write XMP, so there is none.

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

| 10s of 1280x720 30fps H.264/AAC, 9:16 + captions | Chromium | WebKit | Firefox |
| ------------------------------------------------ | -------- | ------ | ------- |
| 404x720 output                                   | ~1.2s    | ~1.7s  | ~0.83s  |
| 1080x1920 output                                 | ~1.8s    | ~2.1s  | ~1.9s   |

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
