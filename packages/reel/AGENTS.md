# @munsonlabs/reel — Agent Guide

## Package purpose

Experimental, unpublished. Makes short clips in the browser: trim a source, crop it to an aspect
ratio, export MP4 (H.264 + AAC), all with WebCodecs on the device. It
exists to answer whether a "clip this" feature for `@munsonlabs/video-player` is feasible. Its main
runtime dependency is `mediabunny` (demux, decode/encode plumbing, mux), kept external in the build.
The entry is framework-free.

## Public API

```ts
import { createClip, canClip, support, ClipError, planCrop, planOutput, parseAspect } from '@munsonlabs/reel'
import type { ClipOptions, ClipSource, CanClipResult, ClipBlocker, OutputPlan, Support } from '@munsonlabs/reel'
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
                    CanvasSource), beside a composable Conversion for audio only
    crop.ts         parseAspect(), planCrop() (window + even output size), even()
    support.ts      support(), canClip(), inspect() (opens, checks the primary video track decodes),
                    planOutput() (H.264 or nothing; the audio: copy, encode, none or unavailable)
  sources/
    source.ts       resolveSource() (<video>/URL/Blob → Blob | absolute URL, blockers), openInput(), readError()
  types/            every public type, documented; `index.ts` re-exports them all (the core's `export type *`)
    clip.ts         ClipOptions, crop, OutputPlan, ClipWarning, ClipBlocker, CanClipResult, Support
    sources.ts      ClipSource, SourceInfo
    vite-env.d.ts   vite/client
  utils/
    errors.ts       ClipError { reason }
scripts/make-fixture.mjs   regenerates the generated fixtures in Playwright Chromium (no ffmpeg needed)
test/               unit specs (happy-dom), mirroring src/: clip/ (crop), sources/ (source)
test/browser/       real-browser specs in Chromium, WebKit and Firefox, sorted by the same areas: clip/;
                    the shared helpers.ts and media/ (the fixtures) stay at its root
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
  asserts zero open frames after a clip and an abort.
- **The video is reel's, the audio is Mediabunny's.** Audio stays a composable
  `Conversion` so copying AAC keeps working. Both write into one `Output`; on any failure both are
  cancelled and settled before the input is disposed.
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
- **Source tags never reach the clip.** `tags` is always set, to `{}`.
- **Output is MP4 with H.264 and AAC, only** (`planOutput`). No H.264 encoder at the clip's size is
  `no-video-encoder`. AAC audio is copied (no encoder needed); other audio is encoded as AAC where
  `canEncodeAudio('aac')` says so, else the clip is silent and warns `'audio-unavailable'`
  (`target: 'audio'`). Firefox has
  no AAC encoder, which is fine for AAC sources (copied) and silent for anything else there. No WebM,
  VP9/VP8/AV1 or Opus output; input formats are Mediabunny's and unchanged.

## Testing

`vp test` runs the unit project (happy-dom) and the browser project. Shipkit's browser project has
Chromium and WebKit; `vite.config.ts` appends Firefox. Install browsers once with
`vp exec playwright install chromium webkit firefox`. Browser specs log `REEL_*` lines (support matrix,
timings, plans); run with `--reporter=verbose` to see them.

WebKit runs after Chromium and Firefox, not beside them (its own `sequence.groupOrder` in `vite.config.ts`).
All three encode H.264 with macOS's hardware encoder, which the machine shares; with every engine exporting
at once it runs short, and then Chromium's `VideoEncoder` fails with "Encoding error." while WebKit's takes
frames and never outputs or errors, hanging the spec until its timeout. CPU load alone does not do this.
WebKit alone retries a failed spec twice (`retry: 2` on its instance): that stall, and native MPEG-TS HLS
reporting "Media failed to decode" now and then in Playwright's WebKit, are its environment, not reel.
Chromium and Firefox never retry, so a real bug fails there at once.
Headed (the default without `CI`), vitest runs one file per engine at a time; headless (`CI=1`) runs
up to one fewer than the CPU count per engine.

Fixtures: `flower.mp4` is copied from video-player (960x540 H.264 + AAC, 5.06s).
`count-720p.mp4` (12s 1280x720 30fps H.264 + AAC) and `rotated-90.mp4`/`rotated-270.mp4` (2s, 640x480
frames with a `tkhd` rotation matrix, displayed 480x640 with red/green/blue/yellow quadrants) are
generated by `scripts/make-fixture.mjs [count] [rotated]`; tests
never run the script. Assertions check outputs (dimensions, duration within 0.15s, codecs, the
browser's own `<video>` accepting the file), never speed.
