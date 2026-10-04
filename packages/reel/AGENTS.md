# @munsonlabs/reel — Agent Guide

## Package purpose

Experimental, unpublished. Makes short clips in the browser: trim a source, crop it to an aspect
ratio, burn captions into the picture, export MP4 (H.264 + AAC), all with WebCodecs on the device. It
exists to answer whether a "clip this" feature for `@munsonlabs/video-player` is feasible. Its main
runtime dependency is `mediabunny` (demux, decode/encode plumbing, mux), kept external in the build.
The entry is framework-free.

## Public API

```ts
import {
  createClip,
  canClip,
  support,
  createStoryboard,
  clipLink,
  ClipError,
  planCrop,
  planOutput,
  parseVtt,
  isCaptionText,
  toCues,
  loadCaptions,
  createPlaylistCache,
  parseAspect,
  drawEndCard,
  createQrCode,
  drawQrCode,
  readableUrl,
  planStamp,
  listCaptionTracks,
  loadCaptionTrack,
} from '@munsonlabs/reel'
import type {
  ClipOptions,
  ClipSource,
  CanClipResult,
  ClipBlocker,
  OutputPlan,
  Support,
  CaptionCue,
  CaptionStyle,
  ClipOrigin,
  Storyboard,
  EndCardOptions,
  EndCardInfo,
  StampOptions,
  StampPosition,
  ClipWarning,
  ImageSource,
  TrackChoice,
  VideoTrackInfo,
  CaptionTrackInfo,
  CaptionInput,
  CaptionTrackSource,
  PlaylistCache,
} from '@munsonlabs/reel'
```

Member table and examples in README.md. Keep README, `src/index.ts` and `src/types/` in step.

## Layout

Grouped by role, like video-player's `src/`. Source imports use the `@/` alias (`src/`), tests `@/` and
`@test/` (`test/`); `test/` mirrors `src/`.

```
src/
  index.ts          entry `.`: the core, framework-free
  clip/
    clip.ts         createClip(): inspect → planCrop → planOutput → own video pump (VideoSampleSink → canvas →
                    CanvasSource) plus end card frames, beside a composable Conversion for audio only
    crop.ts         parseAspect(), planCrop() (window + even output size), even()
    origin.ts       clipLink() (Media Fragments #t=), originTags() (MP4 ilst atoms)
    support.ts      support(), canClip(), inspect() (opens, lists video tracks, picks the largest decodable as the
                    reference; HLS reads playlists only), selectTracks() (the track to read + its paired audio),
                    planOutput() (H.264 or nothing; the audio: copy, encode, none or unavailable)
    storyboard.ts   createStoryboard(): keyframe timestamps (EncodedPacketSink, metadata only) de-duplicated →
                    CanvasSink → JPEG sprite + VTT; onTile per thumbnail; signal disposes the input
  sources/
    source.ts       resolveSource() (<video>/URL/Blob → Blob | absolute URL, blockers), openInput() (fetchFn from a playlist cache), readError()
    tracks.ts       listVideoCandidates() (size/bitrate/codec from metadata, I-frame playlists dropped),
                    rankCandidates() ('auto' = smallest covering `need`, then largest down), canDecodeCandidate()
    playlists.ts    createPlaylistCache(): a fetch that reads each .m3u8 once, whole, and answers later (Range) requests
                    with synthesised 206s; masters kept until clear(), media playlists only with #EXT-X-ENDLIST
  captions/
    cues.ts         parseVtt(), isCaptionText() (the text-or-URL rule), isVttFile() (a WEBVTT header), captionUrl(),
                    toCues() (text | cues | TextTrack, no fetching), activeCues(),
                    defaultTrackIndex(), passedTrackInfo(), asTrackList(). No fetch, no Mediabunny
    fetch.ts        fetchCaptions() (signal; rejects with an Error on HTTP/CORS failure or a body that is not
                    WebVTT (isVttFile)), loadCaptions() (any CaptionInput). Core only
    hls.ts          master/media playlist parsing (SUBTITLES renditions, variants, segments, BYTERANGE, MAP),
                    X-TIMESTAMP-MAP, cueOffset(), loadHlsCues() (only overlapping segments). No Mediabunny.
    tracks.ts       listCaptionTracks() (passed tracks as passed:<n>, HLS renditions, <video> textTracks), readTextTrack() (disabled → hidden → restored)
    load.ts         loadCaptionTrack() (passed:<n> from `tracks`, hls:<n>, text:<n>), mediaStartOf() (first timestamp of the lowest variant's first segment, via Mediabunny; core only)
  render/           everything painted into the clip's frames (`captions/` gets the cues)
    captions.ts     the one caption look (white bold text on a translucent box near the bottom; CaptionStyle
                    overrides merged over it), wrapText() (also the end card's), createCaptionPainter(): each text
                    wrapped once and remembered, every showing cue's lines stacked; layoutWidth/Height to lay out at
                    another size
    endcard.ts      prepareEndCard() (defaults from origin, logo and QR loaded up front), drawEndCard()
                    (logo, publisher, headline, readable address on a pill; QR only with qr: true)
    qr.ts           createQrCode() (lazy `uqr`, ECC M), drawQrCode()
    stamp.ts        planStamp() (corner + safe-area margins), createStampPainter(): the logo over every clip frame
    watermark.ts    createWatermarkPainter(): the strip drawn over every clip frame
    image.ts        loadImage() (<img crossOrigin=anonymous>, SVG rasterised, 1x1 taint test), createImageCache()
  types/            every public type, documented; `index.ts` re-exports them all (the core's `export type *`)
    clip.ts         ClipOptions, crop, OutputPlan, ClipWarning, ClipOrigin, ClipBlocker, CanClipResult, Support, Storyboard
    captions.ts     CaptionCue, CaptionInput, CaptionTrackSource, CaptionOptions, CaptionTrackInfo
    render.ts       CaptionStyle (how captions are painted), end card, ImageSource, WatermarkOptions, StampOptions
    sources.ts      ClipSource, PlaylistCache, VideoTrackInfo, TrackChoice, SourceInfo
    vite-env.d.ts   vite/client
  utils/
    url.ts          readableUrl() (no scheme/www/query/hash, IDN to Unicode, middle-ellipsis to fit), middleEllipsis()
    errors.ts       ClipError { reason }
scripts/make-fixture.mjs   regenerates the generated fixtures in Playwright Chromium (no ffmpeg needed)
test/               unit specs (happy-dom), mirroring src/: clip/ (crop, origin), sources/ (playlists: the cache,
                    source), captions/ (cues, urls: text-or-URL, passed tracks, fetch), render/ (endcard: layout via a
                    recording ctx), utils/ (url)
test/browser/       real-browser specs in Chromium, WebKit and Firefox, sorted by the same areas:
                    clip/, captions/, render/ (caption-style, endcard, stamp), sources/; the shared helpers.ts, global-setup.ts and media/ (the fixtures) stay at its root
```

Docblocks follow sigil's convention: full sentences on what a function does and what callers can rely
on; inline comments only for a why the code cannot show.

## Invariants to preserve

- **Crop by offset, never by source rectangle.** `pumpVideo` in `clip/clip.ts` draws the whole frame scaled
  and shifted so the canvas edges cut it. WebKit's 9-argument `drawImage(VideoFrame, …)` ignores the
  source rectangle (pinned by `test/browser/clip/webkit-drawimage.spec.ts`), so Mediabunny's own `crop`
  option and `drawWithFit({ crop })` give squashed, uncropped video in Safari. Do not "simplify" back
  to them; the focus test in `clip.spec.ts` catches it in WebKit only.
- **Every decoded sample is closed where it is drawn.** `pumpVideo` closes each `VideoSample` in a
  `finally`, including on `continue`, `break` and errors; `CanvasSource.add` copies the one reused
  `OffscreenCanvas` into a frame and Mediabunny closes that. `trackFrames()` in the browser helpers
  asserts zero open frames after a clip, an abort, an end card and a storyboard.
- **The video is reel's, the audio is Mediabunny's.** Video is not a Conversion track because the end
  card needs frames after the source runs out, and a `process` hook cannot add frames after the last
  sample without building them all at once (each a full-size `VideoFrame`). Audio stays a composable
  `Conversion` so copying AAC keeps working. Both write into one `Output`; on any failure both are
  cancelled and settled before the input is disposed.
- **The end card is silent and loads nothing per frame.** Logo and QR are resolved in
  `prepareEndCard`; `draw` runs once per card frame at the clip's frame rate. The QR code is opt-in
  (`qr: true`; phone viewers cannot scan their own screen); `uqr` is only `import()`ed then, and is
  kept external in the build like Mediabunny. The card shows the article (`origin.url`, readable), the
  QR encodes the `#t=` deep link.
- **Captions that will not load never fail a clip.** `createClip` loads the cues before encoding;
  any failure but an abort or a `RangeError` (an unknown track id: the caller's mistake) leaves the
  clip without captions and `onWarning` gets `'captions-unavailable'` (`target: 'captions'`). That
  covers a fetch or HTTP error, CORS, an HLS rendition whose playlist or segments fail, and a fetched
  body that is not WebVTT (`isVttFile`: no `WEBVTT` header). `loadCaptions`/`loadCaptionTrack`,
  called directly, still reject (a plain `Error`). It is not a `ClipBlocker`.
- **A logo never fails a clip.** Every logo (stamp and card) goes through `loadImage` in `render/image.ts`
  before encoding: `<img crossOrigin="anonymous">`, then a 1x1 draw-and-read-back, because a tainted
  canvas makes `CanvasSource`'s `VideoFrame` throw on every frame. Failure resolves `{ ok: false }`,
  the logo is left out and `onWarning` gets `'logo-unavailable'`. `test/browser/global-setup.ts` serves logos from another
  port, with and without CORS headers, to prove it in every engine.
- **Crop in display orientation.** `inspect()` reports `getDisplayWidth/Height` (rotation applied),
  `planCrop` works in those pixels and `sample.draw` turns each frame upright, so a phone video's
  rotation ends up in the pixels and the clip has no rotation metadata (`rotation.spec.ts`).
- **Abort means the signal's reason.** Cancelling surfaces from Mediabunny as `ConversionCanceledError`
  or as "Output has been canceled." depending on timing; `createClip` maps any failure after
  `signal.aborted` to `signal.reason`, and an abort during `output.finalize()`, after every frame is in,
  still rejects with it.
- **Blockers are codes, not stack traces.** Every way a source is refused is a `ClipBlocker` in
  `types/clip.ts`; `canClip` never throws and `createClip` throws `ClipError` with the same code.
  `URL` sources never retry (`getRetryDelay: () => null`), because a CORS failure looks like a
  network error and Mediabunny's default backoff would retry it forever.
- **`blob:` probing is a GET.** A `blob:` URL from a `MediaSource` cannot be fetched; one from a File
  can. HEAD on any `blob:` URL is a network error by spec, so it must stay a GET with the body cancelled.
- **Source tags never reach the clip.** `tags` is always set: the origin's tags or `{}`.
- **Output is MP4 with H.264 and AAC, only** (`planOutput`). No H.264 encoder at the clip's size is
  `no-video-encoder`. AAC audio is copied (no encoder needed); other audio is encoded as AAC where
  `canEncodeAudio('aac')` says so, else the clip is silent and warns `'audio-unavailable'`
  (`target: 'audio'`), like a logo or captions. Firefox has
  no AAC encoder, which is fine for AAC sources (copied) and silent for anything else there. No WebM,
  VP9/VP8/AV1 or Opus output; input formats are Mediabunny's and unchanged.

- **Read the smallest track that will do.** `inspect()` lists every video track (HLS variants) from
  metadata and plans crops on the largest decodable one; `selectTracks()` then reads the smallest that
  covers the output (`createClip`) or a tile (`createStoryboard`), and its own paired audio, which is
  why the audio Conversion runs with `tracks: 'all'` and discards every other audio track ('primary'
  would take the top variant's). For HLS, duration comes from the reference variant's playlist
  (`getDurationFromMetadata`), never `computeDuration()` over all tracks, which reads the last segment
  of every variant. Decodability is checked with `getDecoderConfig()` + `isConfigSupported`, not
  `track.canDecode()`, which reports a segment that fails to download as "cannot decode" and would
  silently fall through to a bigger variant. `hls-ladder.spec.ts` counts requests to prove it.
- **Thumbnails are keyframes unless `exact`.** One decode per distinct keyframe; `onTile` reports
  each thumbnail as it lands, and an aborted `signal` disposes the input.

## Testing

`vp test` runs the unit project (happy-dom) and the browser project. Shipkit's browser project has
Chromium and WebKit; `vite.config.ts` appends Firefox. Install browsers once with
`vp exec playwright install chromium webkit firefox`. Browser specs log `REEL_*` lines (support matrix,
timings, caption pixel diffs, plans, tags); run with `--reporter=verbose` to see them.

WebKit runs after Chromium and Firefox, not beside them (its own `sequence.groupOrder` in `vite.config.ts`).
All three encode H.264 with macOS's hardware encoder, which the machine shares; with every engine exporting
at once it runs short, and then Chromium's `VideoEncoder` fails with "Encoding error." while WebKit's takes
frames and never outputs or errors, hanging the spec until its timeout. CPU load alone does not do this.
WebKit alone retries a failed spec twice (`retry: 2` on its instance): that stall, and native MPEG-TS HLS
reporting "Media failed to decode" now and then in Playwright's WebKit, are its environment, not reel.
Chromium and Firefox never retry, so a real bug fails there at once.
Headed (the default without `CI`), vitest runs one file per engine at a time; headless (`CI=1`) runs
up to one fewer than the CPU count per engine.

`caption-style.spec.ts` holds the caption look on a real canvas: the default is pixel-identical to a
verbatim copy of the painter reel shipped first (the old `'subtitle'` look), overrides apply, and a long
cue wraps onto more lines with every word kept. `clip.spec.ts` checks the burned-in band and that a clip
whose captions fail to load (a 404 URL, a broken HLS rendition, a file that is not captions) is still made,
warns `captions-unavailable` and has no captions.

Fixtures: `flower.mp4` and `hls/` are copied from video-player (960x540 H.264 + AAC, 5.06s).
`ladder/` (`make-fixture.mjs ladder`) is an HLS master with 320x180 and 1280x720 variants (1s MPEG-TS
segments named `.m2ts`, because the Vite test server compiles `.ts` URLs as TypeScript; media starts at
PTS 10s) and en/fr segmented WebVTT subtitles with `X-TIMESTAMP-MAP=MPEGTS:945000`; `broken.m3u8`
points the small variant at missing segments.
`count-720p.mp4` (12s 1280x720 30fps H.264 + AAC) and `rotated-90.mp4`/`rotated-270.mp4` (2s, 640x480
frames with a `tkhd` rotation matrix, displayed 480x640 with red/green/blue/yellow quadrants) are
generated by `scripts/make-fixture.mjs [count] [rotated]`; tests
never run the script. Assertions check outputs (dimensions, duration within 0.15s, codecs, the
browser's own `<video>` accepting the file, caption pixels), never speed.
