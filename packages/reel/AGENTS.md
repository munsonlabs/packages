# @munsonlabs/reel — Agent Guide

## Package purpose

Experimental, unpublished. Makes short clips in the browser: trim a source, crop it to an aspect
ratio, burn captions into the picture, export MP4 (H.264 + AAC), all with WebCodecs on the device. It
exists to answer whether a "clip this" feature for `@munsonlabs/video-player` is feasible. Its main
runtime dependency is `mediabunny` (demux, decode/encode plumbing, mux), kept external in the build.
The core entry is framework-free. The picker (`/vue`, `/element`) is Vue SFCs, inline on the page's own
`@munsonlabs/video-player` (the player is the preview): `vue` and the player are peer dependencies (optional, for the core's sake),
and `@munsonlabs/sigil`'s Vue component draws the close icon (`mlv` library). Every task waits for
`@munsonlabs/sigil#build` and `@munsonlabs/video-player#build`, since tests and the build resolve their dist.

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
  isVttFile,
  toCues,
  loadCaptions,
  createPlaylistCache,
  parseAspect,
  drawEndCard,
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
  ClipErrorReason,
  OutputPlan,
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

```ts
import { ReelPicker, getPickerDefaults, setPickerDefaults } from '@munsonlabs/reel/vue' // + '@munsonlabs/reel/style'
import { ReelPickerElement, defineReelPicker, getPickerDefaults, setPickerDefaults } from '@munsonlabs/reel/element'
import type {
  PickerApi,
  PickerState,
  PickerDefaults,
  PickerLabels,
  PickerStamp,
  ShareCaptionInfo,
  ShareResult,
  Range,
  ReelExportDetail,
  ReelErrorDetail,
  ReelCopyDetail,
} from '@munsonlabs/reel/vue'
```

Member table and examples in README.md. Keep README, `src/index.ts` and `src/types/` in step.

## Layout

Grouped by role, like video-player's `src/`. Source imports use the `@/` alias (`src/`), tests `@/` and
`@test/` (`test/`); `test/` mirrors `src/`.

```
src/
  index.ts          entry `.`: the core, framework-free (no Vue, no player; `test/ui/picker/lazy.spec.ts` checks)
  vue.ts            entry /vue: ReelPicker, the defaults and the picker's types; styles are dist/style.css (`./style`)
  elements/
    index.ts        entry /element (built as dist/elements/element.mjs): ReelPicker itself through defineCustomElement
                    (no shadow root; the picker reads its host to dispatch `reel-*` CustomEvents and reflect
                    `open`/`data-state`); injects reel's inlined CSS once (not the player's: the page has the player);
                    defines <ml-reel-picker> on import (unless ?defer)
  clip/
    clip.ts         createClip() in steps: planClip() (range, crop, tracks, output plan), clipCues(), prepareOverlays()
                    (caption, watermark and stamp painters, the end card), then writeClip() per attempt: openOutput()
                    (Output, CanvasSource, the audio Conversion), encodeFrames() (the video pump: VideoSampleSink →
                    canvas → CanvasSource, then card frames), finalize; a stall retries once with 'prefer-software'
    watchdog.ts     createEncoderWatchdog() (the stall clock), STALL_TIMEOUT (15s), closeEncoder() (Mediabunny's private encoder)
    crop.ts         parseAspect(), planCrop() (window + even output size: at least the aspect's fit in 1080x1920), even()
    origin.ts       clipLink() (#ml-t=start,end plus &ml-player=<id> from origin.player), originTags() (MP4 ilst atoms)
    support.ts      canClip(), inspect() (opens, lists video tracks, picks the largest decodable as the
                    reference; HLS reads playlists only), selectTracks() (the track to read + its paired audio),
                    planOutput() (H.264 or nothing; the audio: copy, encode, none or unavailable)
    storyboard.ts   createStoryboard(): keyframe timestamps (EncodedPacketSink, metadata only) de-duplicated →
                    CanvasSink → JPEG sprite + VTT; onTile per thumbnail; signal disposes the input
  sources/
    source.ts       resolveSource() (<video>/URL/Blob → Blob | absolute URL, blockers), openInput() (fetchFn from a playlist cache), readError()
    tracks.ts       listVideoCandidates() (size/bitrate/codec from metadata, I-frame playlists dropped),
                    rankCandidates() ('auto' = smallest covering `need`, then largest down), canDecodeCandidate()
                    (HLS: the playlist's codec, no download), canDecodeTrack() (the track's own decoder config)
    playlists.ts    createPlaylistCache(): a fetch that reads each .m3u8 once, whole, and answers later (Range) requests
                    with synthesised 206s; masters kept until clear(), media playlists only with #EXT-X-ENDLIST
  captions/
    cues.ts         parseVtt(), vttTimestamp(), isCaptionKind(), isVttFile() (a WEBVTT header: the text-or-URL rule), captionUrl(),
                    toCues() (text | cues | TextTrack, no fetching), activeCues(),
                    defaultTrackIndex(), passedTrackInfo(), asTrackList(). No fetch, no Mediabunny: the picker uses it
    fetch.ts        fetchCaptions() (signal; rejects with an Error on HTTP/CORS failure or a body that is not
                    WebVTT (isVttFile)), loadCaptions() (any CaptionInput). Core only
    hls.ts          master/media playlist parsing (SUBTITLES renditions, variants, segments, BYTERANGE, MAP),
                    X-TIMESTAMP-MAP, cueOffset(), loadHlsCues() (only overlapping segments). No Mediabunny.
    tracks.ts       listCaptionTracks() (passed tracks as passed:<n>, HLS renditions, <video> textTracks), readTextTrack() (disabled → hidden → restored)
    load.ts         loadCaptionTrack() (passed:<n> from `tracks`, hls:<n>, text:<n>), mediaStartOf() (first timestamp of the lowest variant's first segment, via Mediabunny; core only)
  render/           everything painted into the clip's frames (`ui/` is what the page shows; `captions/` gets the cues)
    captions.ts     the one caption look (white bold text on a translucent box near the bottom; CaptionStyle
                    overrides merged over it), wrapText() (also the end card's), createCaptionPainter(): each text
                    wrapped once and remembered, every showing cue's lines stacked; layoutWidth/Height to lay out at
                    another size
    endcard.ts      prepareEndCard() (defaults from origin, logo loaded up front), drawEndCard()
                    (logo, publisher, headline, readable address on a pill)
    stamp.ts        planStamp() (corner + safe-area margins), createStampPainter(): the logo over every clip frame
    watermark.ts    createWatermarkPainter(): the strip drawn over every clip frame
    image.ts        loadImage() (<img crossOrigin=anonymous>, SVG rasterised, 1x1 taint test), createImageCache()
  registries/
    pickerDefaults.ts  shared page-wide defaults on globalThis[Symbol.for('@munsonlabs/reel')],
                    endCardFor, formatShareCaption
  types/            every public type, documented; `index.ts` re-exports them all (the core's `export type *`)
    clip.ts         ClipOptions, crop, OutputPlan, ClipWarning, ClipOrigin, ClipBlocker, CanClipResult, Storyboard
    captions.ts     CaptionCue, CaptionInput, CaptionTrackSource, CaptionOptions, CaptionTrackInfo
    render.ts       CaptionStyle (how captions are painted), end card, ImageSource, WatermarkOptions, StampOptions
    sources.ts      ClipSource, PlaylistCache, VideoTrackInfo, TrackChoice, SourceInfo
    style.d.ts      types for `./style`
    vite-env.d.ts   vite/client and `*.vue` modules
  ui/picker/
    ReelPicker.vue  the inline panel and flow (loading → editing → exporting → done/blocked) on the page's player,
                    resolved by video-player's useResolvedPlayer (`player`, `for`, or the enclosing VideoPlayer);
                    as an element (a host from getCurrentInstance().ce) its emits become bubbling `reel-*`
                    CustomEvents, `open` an attribute and `state` data-state, and `src` is a URL prop beside `source`;
                    pauses the player, loops the range with setClipRange, teleports CropOverlay into the player's
                    shell (the parent of `[data-ml-video-player]`), the lazy core, one playlist cache per opening
                    (made after loadCore, cleared on close) for every core call, export
    CropOverlay.vue the 9:16 window over the player's picture (box from planCrop as fractions of the source, scrim
                    outside via box-shadow, `--reel-scrim`): crop focus by drag/keys, the stamp preview (planStamp)
                    and the hint, with CaptionOverlay inside it
    CaptionOverlay.vue  canvas inside the window: the shown track's cues painted by createCaptionPainter at
                    the canvas's device-pixel size, laid out at the export's size (layoutWidth/Height, planCrop) so
                    lines match; painted on an OffscreenCanvas and copied (Firefox picks another face for
                    system-ui on a page canvas); redrawn when the cues on show, the style or the size change
    RangeTimeline.vue  filmstrip canvas (placeholders, tiles()), handles (ARIA sliders, keys), selection drag,
                    click-to-seek, playhead from the frame clock's time, the times readout
    Transport.vue   video-player's headless controls (play, clip-relative time, mute, captions) on the player handle
    ExportPanel.vue the end-card and logo toggles, the caption position radios, export, progress and cancel
    ClipResult.vue  the finished clip: player, Share (Web Share, else download), Download, Copy caption, Edit again
    picker.css      the shared look of every picker component (the `--reel-*` properties) and `.reel-previewing`; imported by ReelPicker.vue
    types.ts        PickerState, PickerApi, the event details (the picker's own; exported by /vue and /element only)
    features/
      frameClock.ts useFrameClock(): the player's time per presented frame (requestVideoFrameCallback on the
                    handle's mediaElement, else rAF) while editing, playing, visible and once the clock has moved
                    since play (a stalled WebKit MPEG-TS stream fails to decode under per-frame work); currentTime otherwise
      core.ts       loadCore(): the one `import('@/index')`
      export.ts     useExport(): the export job (createClip with the range, crop, captions and toggles, the player paused
                    meanwhile), progress, the result and its notes, cancel, and back to editing
      trackCues.ts  useTrackCues(): the cues of the caption track on show, per opening (one cue cache, URL tracks keyed
                    by URL, HLS renditions matched to the core's, matchRendition()), read from the player's `<video>` text tracks
                    as `text:<n>`, for the overlay (previewCues) and the export (burnInCues)
      range.ts      pure range maths: initialRange, timelineWindow, moveHandle, shiftRange, formatTime (m:ss.t)
  utils/
    url.ts          readableUrl() (no scheme/www/query/hash, IDN to Unicode, middle-ellipsis to fit), middleEllipsis()
    errors.ts       ClipError { reason: ClipErrorReason }, abortReason() (a signal's reason, else an AbortError)
scripts/make-fixture.mjs   regenerates the generated fixtures in Playwright Chromium (no ffmpeg needed)
test/               unit specs (happy-dom), mirroring src/: clip/ (crop, origin), sources/ (playlists: the cache,
                    source), captions/ (cues, urls: text-or-URL, passed tracks, fetch), render/ (endcard: layout via a
                    recording ctx), utils/ (url), ui/picker/ (lazy: the entries' imports; features/captions, features/range)
test/browser/       real-browser specs in Chromium, WebKit and Firefox, sorted by the same areas: clip/, captions/,
                    render/ (caption-style, endcard, stamp), sources/, ui/picker/; the shared helpers.ts,
                    picker-harness.ts, setup.ts (the codec log), global-setup.ts and media/ (the fixtures) stay at its root
```

Comments are kept to what the code cannot show: a browser quirk, an invariant, a warning, or the
behaviour callers rely on. Nothing restates a name or a signature, and no member of an interface, type
or props object carries a docblock: a type is documented once, above it, with the docs pages for
detail. Block comments are always the multi-line form, never `/** one line */`.

## Invariants to preserve

- **Crop by offset, never by source rectangle.** `encodeFrames` in `clip/clip.ts` draws the whole frame scaled
  and shifted so the canvas edges cut it. WebKit's 9-argument `drawImage(VideoFrame, …)` ignores the
  source rectangle (pinned by `test/browser/clip/webkit-drawimage.spec.ts`), so Mediabunny's own `crop`
  option and `drawWithFit({ crop })` give squashed, uncropped video in Safari. Do not "simplify" back
  to them; the focus test in `clip.spec.ts` catches it in WebKit only.
- **Clips are drawn at the size they are seen.** `planCrop`'s default output is the largest frame of the
  aspect that fits 1080x1920 (1920x1080 landscape), or the window's own size if bigger; it is computed from
  the requested aspect, not the rounded window, so 9:16 of 1080p is 1080x1920, not 1078x1918. Every painter
  (captions, card, stamp, watermark) draws at the output's size, never at the source's and scaled, and
  frames are scaled with `imageSmoothingQuality = 'high'`. `crop.height` overrides either way. The picker's
  overlay lays out at `planCrop`'s output too, so it follows. `clip.spec.ts` and `endcard.spec.ts` measure
  text edge sharpness against the native size scaled up (about 2x); don't drop the default to native.
- **An encoder that stalls fails the clip, never hangs it.** `writeClip` races every `videoSource.add`, the
  wait on the pumps and `finalize()` against an `EncoderWatchdog`: frames handed over minus packets out
  (`onEncodedPacket`), timed only while reel waits on the encoder (an add, or the flush after
  `videoSource.close()`), restarting at each packet, so a slow source never counts. On a stall,
  `closeEncoder` closes Mediabunny's private `VideoEncoder` (a finalising Output cannot be cancelled and its
  stalled flush holds the lock) and fires a `dequeue` so a frame held by backpressure is released; then the
  usual cancel. One retry with `hardwareAcceleration: 'prefer-software'` if `canEncodeVideo` (bounded: in
  Firefox it encodes a test frame) says so, else `ClipError('encoder-stalled')`. `watchdog.spec.ts` (browser)
  simulates both stall shapes with `stallVideoEncoders()` in the helpers and checks frames and encoders
  are closed; it warms Mediabunny's memoised encoder probes first, since Firefox's would stall too.
- **Every decoded sample is closed where it is drawn.** `encodeFrames` closes each `VideoSample` in a
  `finally`, including on `continue`, `break` and errors; `CanvasSource.add` copies the one reused
  `OffscreenCanvas` into a frame and Mediabunny closes that. `trackFrames()` in the browser helpers
  asserts zero open frames after a clip, an abort, an end card and a storyboard.
- **The video is reel's, the audio is Mediabunny's.** Video is not a Conversion track because the end
  card needs frames after the source runs out, and a `process` hook cannot add frames after the last
  sample without building them all at once (each a full-size `VideoFrame`). Audio stays a composable
  `Conversion` so copying AAC keeps working. Both write into one `Output`; on any failure both are
  cancelled and settled before the input is disposed.
- **The end card is silent and loads nothing per frame.** The logo is resolved in `prepareEndCard`;
  `draw` runs once per card frame at the clip's frame rate. The card shows the article (`origin.url`,
  readable) and has no QR code: phone viewers cannot scan their own screen.
- **Captions that will not load never fail a clip.** `createClip` loads the cues before encoding;
  any failure but an abort or a `RangeError` (an unknown track id: the caller's mistake) leaves the
  clip without captions and `onWarning` gets `'captions-unavailable'` (`target: 'captions'`). That
  covers a fetch or HTTP error, CORS, an HLS rendition whose playlist or segments fail, and a fetched
  body that is not WebVTT (`isVttFile`: no `WEBVTT` header). `loadCaptions`/`loadCaptionTrack`,
  called directly, still reject (a plain `Error`). It is not a `ClipBlocker`.
- **A logo never fails a clip.** Every logo (stamp and card) goes through `loadImage` in `render/image.ts`
  before encoding: `<img crossOrigin="anonymous">`, then a 1x1 draw-and-read-back, because a tainted
  canvas makes `CanvasSource`'s `VideoFrame` throw on every frame. Failure resolves `{ ok: false }`,
  the logo is left out and `onWarning` gets `'logo-unavailable'`; the picker turns that into a
  non-fatal `reel-error` (`fatal: false`). `test/browser/global-setup.ts` serves logos from another
  port, with and without CORS headers, to prove it in every engine.
- **Crop in display orientation.** `inspect()` reports `getDisplayWidth/Height` (rotation applied),
  `planCrop` works in those pixels and `sample.draw` turns each frame upright, so a phone video's
  rotation ends up in the pixels and the clip has no rotation metadata (`rotation.spec.ts`).
- **Abort means the signal's reason.** Cancelling surfaces from Mediabunny as `ConversionCanceledError`
  or as "Output has been canceled." depending on timing; `createClip` maps any failure after
  `signal.aborted` to `signal.reason`, and an abort during `output.finalize()`, after every frame is in,
  still rejects with it. The picker treats an aborted job as cancelled even when `createClip` resolved,
  so a late cancel goes back to editing instead of leaving the picker in `exporting`.
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
  (`target: 'audio'`), like a logo or captions, and the picker notes it (`audioLeftOut`). Firefox has
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
- **Thumbnails are keyframes unless `exact`.** One decode per distinct keyframe; the picker paints
  tiles as `onTile` reports them and aborts the storyboard on close or reopen.
- **The picker entries never import the core statically.** `elements/index.ts`, `vue.ts` and everything
  they reach (`.vue` script blocks included) use only `clip/crop`, `clip/origin`, `render/stamp`, `captions/cues`,
  `render/captions` (types only, no Mediabunny), `ui/picker/*`, `registries/pickerDefaults`, Vue, the player and sigil's Vue component; the core (`@/index`) is `import()`ed by
  `ui/picker/features/core.ts` on the first open. The core entry reaches no Vue, player or picker module.
  `test/ui/picker/lazy.spec.ts` walks the imports (relative and `@/` specifiers) and fails otherwise; `picker.spec.ts` checks no Mediabunny
  request happens before opening.
- **Playback is the player's.** The picker never drives the `<video>`: it pauses, plays and seeks through the
  player's handle, loops with `setClipRange(range, { end: 'loop' })` (re-set on every range change; the player
  acts within about a frame of the end), hides the HUD with `setControls(false)` once editing, and `close()`
  calls `setClipRange(null)` and `setControls(null)`. The one thing it reads off the
  `<video>` is the time per frame, through the handle's `mediaElement` (`ui/picker/features/frameClock.ts`), only while
  editing, playing and visible, and the text tracks' cues (`features/trackCues.ts`). The player is the page's: the
  picker mounts none, and finds it through `useResolvedPlayer` (`player`, `for`, the enclosing `VideoPlayer`);
  none is `no-player`, one on a `blob:` MediaSource with no `source` is `no-source`. The panel's transport
  (`Transport.vue`) is video-player's headless controls on that same handle, not a second player.
- **What the overlay shows is what the clip gets.** The caption track the viewer has on in the player decides
  the burn-in: a track's cues are read from the player's `<video>` text tracks (`text:<n>`) and an HLS rendition
  (which has no cues on the `<video>`) is matched by name, then language, to `listCaptionTracks`. Off is no captions.
  A load failure is `captions-unavailable` (a note, a non-fatal `reel-error`, and the `captionsLeftOut` note on the
  finished clip) and the clip is made without them. The look matches too: `CropOverlay.vue` draws the stamp preview
  and `CaptionOverlay.vue` the same cues (`trackCues`, loaded once per track for the timeline's window and reused by
  the export) with the same `createCaptionPainter` and the same `captionStyle` default the export gets, laid out at the
  export's frame size, so its lines break where the clip's do. The window's box is `planCrop` as fractions of the
  source, so it matches the export's crop. Never style captions in CSS or with the player's renderer: the overlay must
  stay the export's painter. The position chosen in the panel (`captionPosition`) goes to both, as `captionStyle`
  with `position` set. While the window is over the picture the native cue rendering is hidden with
  `.reel-previewing` on the player's shell (`::cue` visibility), and the track stays `showing`: never flip its mode,
  the player reports it and reel reads its cues.
- **Captions are WebVTT only.** Convert SRT to WebVTT first; a fetched file without a `WEBVTT` header
  is `captions-unavailable`.
- **Captions by URL are fetched by reel.** `isVttFile` decides text vs URL (a `WEBVTT` header → text; anything
  else → URL against `document.baseURI`); keep README and the captions page in step if it changes. A failed fetch
  rejects `loadCaptions` with an `Error` and is a `'captions-unavailable'` warning from `createClip`. The picker
  passes no captions of its own: the cues are the player's tracks'.
- **One opening, one read of each playlist.** Every core call the picker makes (canClip, createStoryboard,
  listCaptionTracks, loadCaptionTrack, createClip) gets the opening's `PlaylistCache`; Mediabunny reads
  through it via `UrlSource`'s `fetchFn`, reel's own `fetchRange`/`fetchText` via `cache.fetch`. Never cache a media
  playlist without `#EXT-X-ENDLIST` (live), a redirected response (it moves the segments' base) or across
  openings. `picker-playlists.spec.ts` counts the requests.
- **Props reach the component a tick late.** An element's properties set just before `show()` arrive on
  the next render, so `prepare()` awaits `nextTick()` before reading them.
- **Filmstrip pointer model.** Handles drag at once; on the selection, under `DRAG_THRESHOLD` (4px) is
  a click that seeks, past it slides the range; the playhead drags to scrub; outside the selection does
  nothing. Seeks never move the handles or fire `reel-range`.
- **The picker reports, never throws.** A missing or unclippable source, a failed export: shown in
  the panel's status line and dispatched as `reel-error` (`error` in Vue) with a reason. Optional things
  that fail (thumbnails, a caption track, a logo) are a note plus a
  non-fatal `reel-error`; the editor keeps working.

## Testing

`vp test` runs the unit project (happy-dom) and the browser project. Shipkit's browser project has
Chromium and WebKit; `vite.config.ts` appends Firefox. Install browsers once with
`vp exec playwright install chromium webkit firefox`. Browser specs log `REEL_*` lines (support matrix,
timings, caption pixel diffs, plans, tags); run with `--reporter=verbose` to see them.

WebKit runs after Chromium and Firefox, not beside them (its own `sequence.groupOrder` in `vite.config.ts`).
All three encode H.264 with macOS's hardware encoder, which the machine shares; with every engine exporting
at once it runs short, and then Chromium's `VideoEncoder` fails with "Encoding error." while WebKit's takes
frames and never outputs or errors. That used to hang the spec until its timeout; now `createClip`'s watchdog
fails it after 15s (after a software retry), still a failure. CPU load alone does not do this. Clips are
1080x1920 by default, so specs about something other than size pass an explicit `crop.height` (540 for flower).
WebKit alone retries a failed spec twice (`retry: 2` on its instance): that stall, and native MPEG-TS HLS
reporting "Media failed to decode" now and then in Playwright's WebKit, are its environment, not reel.
Chromium and Firefox never retry, so a real bug fails there at once.
Headed (the default without `CI`), vitest runs one file per engine at a time; headless (`CI=1`) runs
up to one fewer than the CPU count per engine. `test/browser/setup.ts` logs every codec a failed test
made (`REEL_CODECS`: state, queue, inputs, outputs, errors), which is how the stall was told from slow work.

Waiting on media: frame and pixel checks never play and sample. They pause (`harness.pause()`), seek
(`harness.seekTo()`: the selection click, then `seeked`, then a presented frame via
`requestVideoFrameCallback`, bounded, plus two animation frames) and assert. Playback tests wait for what
they need to see, not for a wall-clock window: `sampleTimes()` collects `currentTime` per presented frame
until, say, the range has looped (with a minimum span where a rate is counted), because on a loaded machine
playback runs slower than real time. `waitFor()` polls only state the DOM alone shows, and its timeout message
carries the preview `<video>`'s readyState, networkState, currentTime, paused, seeking, buffered and error;
`mediaEvent()` waits on one media event with the same state on timeout.
`caption-style.spec.ts` holds the caption look on a real canvas: the default is pixel-identical to a
verbatim copy of the painter reel shipped first (the old `'subtitle'` look), overrides apply, and a long
cue wraps onto more lines with every word kept. `clip.spec.ts` checks the burned-in band and that a clip
whose captions fail to load (a 404 URL, a broken HLS rendition, a file that is not captions) is still made,
warns `captions-unavailable` and has no captions. `picker-preview.spec.ts`
compares the preview overlay's caption fill with the export's frame at the same time on a 27x48 grid
(bounds within a cell and a half, IoU over 0.6), for a short cue and for a long one that wraps, counts the playhead's moves against `timeupdate`, counts
live frame callbacks, and compares `localStorage` before and after a picker session.
`audio.spec.ts` pins the output audio: AAC copied (identical codec, rate and channels) with or without
an AAC encoder, Opus encoded as AAC where the engine can, and a silent MP4 with `audio-unavailable`
(and the picker's `audioLeftOut` note) where it cannot. It forces "no AAC encoder" in every engine with
`vi.mock('mediabunny')` wrapping `canEncodeAudio` (Mediabunny memoises the real probe, so stubbing
`AudioEncoder.isConfigSupported` would not do). An abort while the output finalises is pinned in
`clip.spec.ts` and `picker.spec.ts` by spying on `Output.prototype.finalize`.

New browser specs: `captions-url.spec.ts` (URL/`URL` captions, a file that is not WebVTT, CORS and 404 failures, passed tracks
and their default), `picker-captions.spec.ts` (passed tracks in the menu, beside HLS renditions, a URL
fetched once, the non-fatal failure and an export that completes with the note), `picker-playlists.spec.ts`, `picker-style.spec.ts`. The global setup's
second-origin server also serves `/captions.vtt` (no CORS), `/captions-cors.vtt` and `/missing-cors.vtt`.

Fixtures stay test-only: the docs (`docs/public/media/reel/flower.mp4`) and the demo
(`apps/demos/reel/public/media/`) have their own copies; nothing outside `test/` may import from it.
Fixtures: `flower.mp4` and `hls/` are copied from video-player (960x540 H.264 + AAC, 5.06s).
`ladder/` (`make-fixture.mjs ladder`) is an HLS master with 320x180 and 1280x720 variants (1s MPEG-TS
segments named `.m2ts`, because the Vite test server compiles `.ts` URLs as TypeScript; media starts at
PTS 10s) and en/fr segmented WebVTT subtitles with `X-TIMESTAMP-MAP=MPEGTS:945000`; `broken.m3u8`
points the small variant at missing segments.
`count-720p.mp4` (12s 1280x720 30fps H.264 + AAC), `rotated-90.mp4`/`rotated-270.mp4` (2s, 640x480
frames with a `tkhd` rotation matrix, displayed 480x640 with red/green/blue/yellow quadrants) and
`flower-opus.mp4` (flower's first 3s, H.264 copied, Opus audio: a source whose audio is not AAC) are
generated by `scripts/make-fixture.mjs [count] [rotated] [opus]`; tests
never run the script. Assertions check outputs (dimensions, duration within 0.15s, codecs, the
browser's own `<video>` accepting the file, caption pixels), never speed.

Picker specs (`test/browser/ui/picker/picker*.spec.ts`) share `test/browser/picker-harness.ts` and query the light DOM; Vue
renders a tick after an event, so they wait on the DOM rather than reading it straight after a
synthetic event. Playwright's WebKit loads the ladder's MPEG-TS natively but its clock never advances,
so preview playback is tested on `hls/flower.m3u8` (fMP4); the ladder's captions are tested through
exports, without playing it. `cleanup()` clears `localStorage`, where the preview player keeps the
viewer's caption, quality and sound choices.
