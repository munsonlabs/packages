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
clipLink(location.href, 42, 52) // 'https://…#ml-t=42,52'
```

## API

| Export                                                          | Description                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createClip(options)`                                           | Trim, crop, burn in captions, encode. Resolves a `Blob`; rejects with a `ClipError` (with `reason`) or the abort signal's reason.                                                                                                                       |
| `canClip(source, options?)`                                     | Reads only the header. Resolves `{ ok: true, info, plan }` or `{ ok: false, reason, message }`; never throws.                                                                                                                                           |
| `createStoryboard(options)`                                     | A JPEG sprite of thumbnails plus a WebVTT storyboard (`#xywh=`) for scrubber previews: keyframes by default (`exact: true` for exact frames), from the smallest track that fills a tile, with `onTile` for progressive painting and `signal` to stop.   |
| `listCaptionTracks(source, { tracks?, cache? })`                | The caption tracks to choose from: the `tracks` passed in (`passed:<n>`), then the source's HLS `SUBTITLES` renditions (`hls:<n>`) and a `<video>`'s caption/subtitle text tracks (`text:<n>`), as `{ id, kind, language, label, default }`.            |
| `loadCaptionTrack(source, id, { start, end, tracks?, cache? })` | One track's cues for a range: a passed track's WebVTT file is fetched or parsed; for HLS only the overlapping WebVTT segments are fetched, with `X-TIMESTAMP-MAP` honoured; a disabled text track is read and restored.                                 |
| `loadCaptions(input, { signal })`, `isVttFile`                  | Captions from cues, a `TextTrack`, WebVTT text, or a WebVTT file's URL (fetched; rejects with an `Error` when it cannot be fetched or is not WebVTT); `isVttFile` tells the two apart: a string that starts with `WEBVTT` is text, anything else a URL. |
| `createPlaylistCache()`                                         | `{ fetch, clear() }`, passed as `cache` to `canClip`, `createStoryboard`, `createClip`, `listCaptionTracks` and `loadCaptionTrack` so one flow fetches each HLS playlist once.                                                                          |
| `clipLink(origin, start, end)`                                  | The origin URL with `#ml-t=start,end` (and `&ml-player=<id>` from `origin.player`), the link video-player's deep links open.                                                                                                                            |
| `drawEndCard(ctx, info)`                                        | The default end card renderer, for a custom `endCard.draw` that adds to it.                                                                                                                                                                             |
| `readableUrl(url, maxWidth?, measure?)`                         | `https://www.acme.news/a/b?x#ml-t=1,2` → `acme.news/a/b`; shortened in the middle (domain and last segment kept) to fit `maxWidth`.                                                                                                                     |
| `planStamp(width, height, logo, options?)`                      | The box `stamp` draws a logo in, with the default safe-area margins.                                                                                                                                                                                    |
| `planCrop`, `planOutput`, `parseVtt`, `toCues`, `parseAspect`   | The pieces `createClip` is built from, exported for previews and tests.                                                                                                                                                                                 |

`createClip` options: `source`, `start`, `end`, `crop: { aspect, focus, height }`, `captions: { cues | tracks + track, style }`, `track`,
`audio` (`false` drops it), `origin`,
`metadata` (default `true` with an origin), `endCard`, `stamp`, `watermark`, `onProgress`, `onWarning`, `signal`, `cache`.

### Caption input

`captions.cues` is cues, a `TextTrack`, the text of a WebVTT file, or a WebVTT file's URL (a `URL`, or a
string), fetched with the clip's `signal`. Captions are WebVTT only: convert SRT to WebVTT first. **A string
is text** when it starts with `WEBVTT` (after a BOM and whitespace); **anything else is a URL**, relative to
`document.baseURI` (`isVttFile`). Captions that will not load never fail a clip: a file that cannot be
fetched (HTTP error, CORS) or is not WebVTT (no `WEBVTT` header), or an HLS rendition whose playlist or
segments fail, leaves the clip without captions, with `onWarning({ reason: 'captions-unavailable', target:
'captions', message })` (or `console.warn`). An unknown `track` id still rejects (`RangeError`);
`loadCaptions` and `loadCaptionTrack`, called directly, reject when the file cannot be fetched or read.

`captions.tracks` offers several, in video-player's `tracks` shape (`{ src, kind?, srclang?, label?,
default? }`, each `src` a WebVTT file's URL or WebVTT text), chosen by `track: 'passed:<n>'`; without `track` the
one marked `default` is burned in, else the first matching `navigator.language`, else the first. Ids:
`passed:<n>` is `tracks[n]`, `hls:<n>` the master's n-th subtitles rendition, `text:<n>` a `<video>`'s
`textTracks[n]`. `cues` wins over both.

### Caption style

Captions have one look: white bold text (4.5% of the height) on a translucent dark box behind each line,
14% above the bottom, wrapping at 86% of the width onto as many lines as a cue needs. It reads well on
desktop and TV; a host posting to TikTok or Reels, whose own text covers roughly the bottom quarter, can
raise it with `position` and `margin`. `captions.style` is a `CaptionStyle` of overrides, each optional:
`fontFamily`, `fontWeight` (`700`), `size` (`0.045` of the height), `color` (white), `background`
(`'rgba(0, 0, 0, 0.6)'`, or `null` for no box), `position` (`'top' | 'middle' | 'bottom'`), `margin`
(`0.14` of the height) and `maxWidth` (`0.86` of the width).

### HLS: variants and subtitles

An HLS master playlist is read through Mediabunny, choosing variants from the playlist's `RESOLUTION`,
`BANDWIDTH` and `CODECS`, so `canClip` downloads playlists only. `info` describes the largest
variant this browser can decode and `info.videoTracks` lists them all. `createClip` reads the
**smallest variant that covers the output** after the crop (and that variant's own audio);
storyboards read the smallest one that fills a tile. `track: 'auto' | 'smallest' | 'largest'`
overrides the choice for either. `captions: { track: 'hls:0' }` burns in a
subtitle rendition from `listCaptionTracks`, fetching only the WebVTT segments the clip overlaps;
cues passed as `cues` win. Calls on one stream can share a `createPlaylistCache()` (`cache`): each `.m3u8`
is fetched once, whole, and Mediabunny's range requests for it are answered from memory; a master is kept
until `clear()`, a media playlist only once it has `#EXT-X-ENDLIST`, so live playlists are always re-read.

### End card, stamp and watermark

`endCard` (or `endCard: true`) adds `duration` seconds (default 2.5) after the clip, faded in over its
last frame: logo, publisher, headline and, as the call to action, the article's address in large type
on a pill (`acme.news/2026/10/tides-rising`). Everything defaults from `origin`; override `title`,
`publisher`, `displayUrl` (the address shown; default `origin.url` without scheme, `www.`, query, hash
or trailing slash, shortened in the middle to fit), `cta` (default `'Watch the full video at'`), `logo`
or `theme`. `draw(ctx, info)` replaces the renderer and is called for every card frame with the
resolved values (the `#ml-t=` deep link as `url`), `time`, `progress` and the clip's `lastFrame`. The card
is silent: audio ends with the clip. There is no QR code: clips are mostly watched on phones, and
nobody can scan a code on their own screen.

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

## Picker

`@munsonlabs/reel/vue` (`ReelPicker`) and `@munsonlabs/reel/element` (`<ml-reel-picker>`) are an inline "clip this" editor on the page's own `@munsonlabs/video-player`, which is the preview: opening it pauses the player on the moment, loops the range through `setClipRange()` and draws a 9:16 crop window over the picture; the filmstrip, the player's own controls (play, time within the clip, mute, captions), a caption position control (top, middle, bottom), toggles, export and the finished clip sit in a panel under the player. `vue` and `@munsonlabs/video-player` are peer dependencies; the core and Mediabunny load on first open.

```vue
<VideoPlayer ref="player" :src="src" deep-link="article" />
<ReelPicker v-model:open="open" :player="player" :source="src" :origin="{ url: location.href, title, player: 'article' }" />
```

```html
<ml-video-player id="article" src="/video/interview.mp4" deep-link="article"></ml-video-player> <ml-reel-picker for="article"></ml-reel-picker>
```

Props: `player` (the handle) or `for` (an `<ml-video-player>`'s id; neither inside a `VideoPlayer`'s slot), `source`/`src` (defaults to the player's file; give the stream URL when the player plays a `blob:` MediaSource), `origin`, `endCard`, `watermark`, `open`. The captions burned in are the track the viewer has on in the player. The docs' picker pages have the events, labels and theming.

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
node scripts/make-fixture.mjs [count] [rotated] [ladder]      # regenerate the generated fixtures (ladder: the HLS variant + subtitles fixture)
```
