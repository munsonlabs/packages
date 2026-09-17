# @munsonlabs/video-player — Agent Guide

## Package purpose

`@munsonlabs/video-player` is a standalone Vue 3 video player with no shared code or dependency on any other package — its only internal dependency is `@munsonlabs/shipkit` for build tooling. It plays plain MP4/HLS/DASH, YouTube, Vimeo, Dailymotion, Brightcove, and JW Player sources behind one API, with Google IMA ad support and Prebid.js header bidding.

## Public API

```ts
import { VideoPlayer, VideoStage, VideoCard, VideoPlaceholder, VideoPlayerPlugin, resolvePlatform, registerPlatform } from '@munsonlabs/video-player'
import {
  PlayButton,
  MuteButton,
  FullscreenButton,
  LoopButton,
  PipButton,
  CaptionsButton,
  QualityButton,
  PlaybackRateButton,
  Buffering,
  Scrubber,
  VolumeSlider,
  TimeDisplay,
} from '@munsonlabs/video-player'
import { useForwardedPlayer } from '@munsonlabs/video-player'
import type {
  PlayerProps,
  StateChangeEvent,
  StateChangeType,
  VideoEntry,
  HeaderBiddingConfig,
  CaptionTrackDef,
  ForwardedPlayer,
  PlayerMethodKey,
  UseForwardedPlayerReturn,
} from '@munsonlabs/video-player'
import '@munsonlabs/video-player/style'
```

| Export                                                                                                                                                                          | Description                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VideoPlayer`                                                                                                                                                                   | The player itself — one video, full built-in controls                                                                                                                        |
| `VideoCard`                                                                                                                                                                     | Lazy-mountable single video (renders a poster/placeholder until it enters view or is clicked)                                                                                |
| `VideoStage`                                                                                                                                                                    | Pinned/minified playlist stage — plays one video at a time from a `VideoEntry[]` playlist                                                                                    |
| `VideoPlaceholder`                                                                                                                                                              | Poster/loading placeholder used internally by `VideoCard`; also drives `playInView` activation while lazy                                                                    |
| `VideoPlayerPlugin`                                                                                                                                                             | Vue plugin — `app.use(VideoPlayerPlugin)` registers all components (core + controls) globally                                                                                |
| `registerPlatform()`                                                                                                                                                            | Teaches the player a new platform (URL matcher + embed adapter or source resolver) without forking — see README's "Adding a custom platform"                                 |
| `PlayButton`/`MuteButton`/`FullscreenButton`/`LoopButton`/`PipButton`/`CaptionsButton`/`QualityButton`/`PlaybackRateButton`/`Buffering`/`Scrubber`/`VolumeSlider`/`TimeDisplay` | Headless control primitives for building a custom HUD (`:controls="false"`) — each takes a `player` or `for` prop, see README's Headless Controls section                    |
| `useForwardedPlayer()`                                                                                                                                                          | Curated forward of a template-ref'd `VideoPlayer`'s controls/state for a wrapper component's own `defineExpose` — the same mechanism `VideoCard`/`VideoStage` use internally |
| `resolvePlatform(url)`                                                                                                                                                          | `getPlatform` plus `embed: true/false` in one lookup                                                                                                                         |
| `HideMarker`                                                                                                                                                                    | Slotless sentinel — while it's in the viewport, a pinned `VideoStage` tucks off to a sliver instead of covering it, see README's "Hiding the pinned stage over content"      |

### Custom elements (`./element`, `./element/core`, `./element/controls`)

`src/elements/index.ts` (combined), `core.ts` (`ml-video-player`/`-stage`/`-item`/`-placeholder` plus `ml-hide-marker` — grouped here rather than with `controls.ts` because it depends on `VideoStage`'s registry state, which wouldn't be shared across a separate bundle), and `controls.ts` (just the 12 headless controls, tagged `ml-controls-*` — e.g. `ml-controls-play-button`, `ml-controls-mute-button`) are three independent `vp pack` builds (see `vite.config.ts`'s `elementEntry()` factory), each outputting to `dist/elements/<name>.{mjs,d.mts}`. Only the combined `./element` auto-injects its CSS; `./element/core` and `./element/controls` leave that to the consumer (see CSS entry points below). `elements/index.ts` composes `core.ts`+`controls.ts` (import + `export *`) rather than duplicating their `defineCustomElement`/`customElements.define` calls.

Custom-element instances expose the same `defineExpose`d API a Vue template ref would (Vue copies `defineExpose` properties onto the element itself) — e.g. `document.querySelector('ml-video-card').togglePlay()` works identically to a Vue ref.

`core.ts`'s `customElements.define()` calls run synchronously at module top level. `customElements.define()` synchronously upgrades any matching tag already sitting in the DOM as part of that same call — deferring these to a microtask was tried and reverted: Vue decides whether to set `:playlist`/`:tracks`/etc. on a dynamically-rendered `<ml-video-stage>`/`<ml-video-card>` as a real DOM property or a stringified attribute by checking whether the property already exists on the element (`key in el`), which is only true once the tag is upgraded — deferring `define()` made every array/object prop lose its type on the very first render (see `usePlaylist.ts`'s `playlist.value.findIndex` breaking with `TypeError: e.value.findIndex is not a function`). One consequence of staying synchronous: a `registerPlatform()` call needs to run _before_ a matching custom element tag is upgraded — fine for a tag created from script after registering, but a _statically-declared_ tag already sitting in the DOM when `core.ts` is imported gets upgraded (and resolves its adapter) before a `registerPlatform()` call on the next line of the same script has a chance to run (see README's "Registering a platform from a web component").

### CSS entry points (`./style`, `./style/core`, `./style/controls`)

Three independent, non-overlapping stylesheets, each a `vp pack` build (`elementEntry('core', 'core.css')` / `elementEntry('controls', 'controls.css')` in `vite.config.ts`) that doubles as both the un-embedded CSS export and the source `inlineCss` embeds into the matching `./element/*` bundle:

- `./style` → `dist/style.css` — everything; only this one is auto-injected by importing `./element`.
- `./style/core` → `dist/elements/core.css` — just the core player's own styles (`ppbtn.css` + component `<style>` blocks reachable from `VideoPlayer`/`VideoStage`/`VideoCard`/`VideoPlaceholder`).
- `./style/controls` → `dist/elements/controls.css` — just the 12 headless controls' own styles.

Pick exactly one per page; importing more than one `./element*` bundle together double-registers any custom element tag they share and throws. A Vue-only consumer using the headless controls without the built-in HUD typically wants `./style/controls` instead of the full `./style`, to skip CSS for a HUD they never render.

### Themeable CSS variables

The player exposes several CSS custom properties for layout overrides:

| Variable               | Default                         | Used by                    | Description                                                                          |
| ---------------------- | ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `--mlv-controls-width` | `min(450px, calc(100% - 32px))` | `ControlsPopup.vue`        | Controls popup width — override to widen or narrow the popup                         |
| `--mlv-popup-align`    | `center`                        | `PlayerOverlay.vue`        | Horizontal alignment of the controls popup                                           |
| `--mlv-stage-tuck`     | `32px`                          | `pinnedCorner.css`         | Width of the sliver left visible when `HideMarker` tucks the pinned stage off-screen |
| `--mlv-radius`         | `12px`                          | `pinnedCorner.css`         | Border-radius of the pinned corner box                                               |
| `--mlv-accent`         | —                               | Controls popup "More" menu | Active-state highlight color for loop/autoplay toggle buttons                        |

## Composable core

`src/composables/player/usePlayer.ts` owns all playback state and exposes a single `fire(type, extras)` that emits the `state-change` event — `src/types/player.ts` has the full `StateChangeType` union and `StateChangeEvent` shape. Sub-composables each own one concern and call back into `fire`:

| Composable              | Concern                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useBuffering`          | Debounced `waiting`→`isBuffering` spinner state; fires `bufferstart`/`bufferend`                                                                                                                                                                                                                                  |
| `useFullscreen`         | Fullscreen enter/exit, including iOS's native fullscreen quirks; shares one document-level listener pair (`documentEventRegistry.ts`) across every mounted player                                                                                                                                                 |
| `useQuartileEvents`     | Fires `firstQuartile`/`midpoint`/`thirdQuartile` as playback crosses 25/50/75% of duration                                                                                                                                                                                                                        |
| `usePositionMemory`     | Persists/restores playback position across mounts (not for live streams)                                                                                                                                                                                                                                          |
| `usePlayerEvents`       | Wires native adapter events (`play`/`pause`/`ended`/`error`/`timeupdate`/etc.) to `fire` + local refs                                                                                                                                                                                                             |
| `usePlayerControls`     | Exposes the imperative API: `togglePlay`, `seek`, `setVolume`, `setQuality`, `setCaptionTrack`, etc.                                                                                                                                                                                                              |
| `useAdSetup`            | Google IMA ad setup/lifecycle for the native `<video>` path; shares one document-level listener pair (`documentEventRegistry.ts`) for tab-hidden ad-pausing. On iOS, restores the original content source after a post-roll ad finishes (IMA plays ads through the same `<video>` element and may not restore it) |
| `useAutoPauseOffscreen` | Pauses playback once the player scrolls (mostly) out of view — always on                                                                                                                                                                                                                                          |
| `useAutoPlayInView`     | Opt-in (`playInView`) auto-play once (mostly) in view; both this and `useAutoPauseOffscreen` share one `IntersectionObserver` per shell via `viewportObserver.ts`, which also debounces "last one to cross the threshold wins" when several players are visible at once                                           |
| `useForwardedPlayer`    | See Public API above — lives at `src/composables/useForwardedPlayer.ts`, not under `player/`                                                                                                                                                                                                                      |
| `stageRegistry`         | `hasStage` (mount count, read by `VideoCard` to know whether to hand off to a stage) and `isStageTucked` (shared ref `HideMarker` sets and `VideoStage` reads directly) — lives at `src/composables/registries/stageRegistry.ts`, not under `player/`                                                             |

## Adapters

`src/adapters/` normalizes every source behind one `PlaybackAdapter` interface (`src/types/playback.ts`), so `usePlayer.ts` never branches on source type directly:

- **`native/`** — plain `<video>`, hls.js (HLS), dash.js (DASH). Quality levels (`getQualityLevels(): { index, height, bitrate, label }[]`) come from here.
- **`embeds/`** — YouTube, Vimeo, Dailymotion. Each wraps the platform's own iframe SDK behind the same adapter interface (`embedShared.ts` has common iframe-reveal logic and a shared tracked-`setTimeout` scheduler; Vimeo/Dailymotion are built on its `createStatefulEmbedAdapter()` factory — mirrored playback state, play queueing while connect runs, and the shared getter/setter tail — each supplying its own `connect()` plus thin SDK delegates).
- **`sources/`** — Brightcove and JW Player aren't separate adapters; `adapters/index.ts`'s `resolvePlatform(url)`/`resolvePlatform(url)` matcher resolves their URLs down to a native or embed source first.
- **`ads/`** — Google IMA (`ads.ts`, loads the SDK via the shared `loadScript()` utility) for the native `<video>` path, plus `prebid.ts` for header-bidding ad-tag resolution (calls `pbjs.adServers.gam.buildVideoUrl()`, falls back to the plain ad tag on no-fill). On iOS, IMA plays ad creatives through the same `<video>` element as content (there is no separate ad video element); after a post-roll finishes the SDK may not restore the original content source, so `ads.ts` tracks `originalSrc` and a `postRollPending` flag (set when content had already ended when the ad started) — on `CONTENT_RESUME_REQUESTED` it restores the saved source and seeks to the end to clear the browser's internal "ended" flag, letting the normal ended/replay flow take over.

`adapters/index.ts`'s `matchers` array is the single source of truth for URL → platform resolution — no longer closed: `registerMatcher`/`registerEmbedAdapter`/`registerSourceResolver` (and `registerPlatform`, which calls the right two of those in one go) push onto it and the `embedAdapters`/`sourceResolvers` records at runtime. `usePlayer.ts` resolves a player's adapter exactly once, in `onMounted` — not a reactive `watch` on `props.src` — so a `registerPlatform()` call only needs to land before that component mounts, not before the library loads; an already-mounted player never re-resolves on its own (see `VideoStage.vue`'s `:key="current.src"`, which forces a full remount — the actual mechanism a playlist swap uses to pick up newly-registered platforms). `resolvePlatform(url)` scans `matchers` once and returns both the platform key and embed-ness (`getPlatform(url)` is the public, key-only wrapper); it also infers MIME type from extension (`.m3u8` → HLS, `.mpd` → DASH, `.mp4` → `video/mp4`) for sources without an explicit type or registered resolver.

The types describing this contract (`Matcher`, `EmbedAdapterFactory`, `SourceResolver`, `ResolvedSource`, `PlatformConfig`) live in `src/types/playback.ts` alongside `PlaybackAdapter`, not in `adapters/index.ts` itself — that file just imports and re-exports them, keeping "what shape must external code conform to" separate from "the actual matching/dispatch logic."

## Events (`state-change`)

Emitted by `VideoCard`, `VideoPlayer`, and `VideoStage`. Full `StateChangeType` union (`src/types/player.ts`): `play`, `pause`, `ended`, `seeked`, `error`, `adstart`, `adend`, `volumechange`, `ratechange`, `captionchange`, `qualitychange`, `pipchange`, `loopchange`, `firstQuartile`, `midpoint`, `thirdQuartile`, `controlsopen`, `controlsclose`, `bufferstart`, `bufferend`, `timeupdate`, `tap`. `tap` fires from the tap-to-reveal-controls overlay regardless of `controls` — the only signal a `controls: false` consumer gets for "the user tapped the video". See `README.md`'s Events section for the full field-by-field breakdown of `StateChangeEvent` and per-type notes (e.g. `captionchange`/`qualitychange` never fire before playback has started).

## Testing

Tests live in `test/`, mirroring `src/`. Run with `npm run test` (`vp test`) from this package. Both `@/` (→ `src/`) and `@test/` (→ `test/`) path aliases are available (from the shared shipkit Vite config) — no relative imports needed in either.

## Build

```bash
npm run build       # vp pack
npm run dev          # AUTO_ENTRIES=1 vp pack --watch
npm run test         # vp test
npm run check        # vp check — lint + format + typecheck
```
