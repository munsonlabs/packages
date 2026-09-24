# @munsonlabs/video-player — Agent Guide

## Package purpose

`@munsonlabs/video-player` is a standalone Vue 3 video player. It depends on `@munsonlabs/sigil` at runtime for icon rendering (bundled in, see `vite.config.ts`'s `alwaysBundle`, so it is not a published dependency) and on `@munsonlabs/shipkit` for build tooling. It plays plain MP4/HLS/DASH, YouTube, Vimeo, Dailymotion, Brightcove, and JW Player sources behind one API, with Google IMA ad support and Prebid.js header bidding.

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

| Export                                                                                                                                                                                       | Description                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VideoPlayer`                                                                                                                                                                                | The player itself — one video, full built-in controls                                                                                                                                                                                                                                   |
| `VideoCard`                                                                                                                                                                                  | Lazy-mountable single video (renders a poster/placeholder until it enters view or is clicked)                                                                                                                                                                                           |
| `VideoStage`                                                                                                                                                                                 | Pinned/minified playlist stage — plays one video at a time from a `VideoEntry[]` playlist                                                                                                                                                                                               |
| `VideoPlaceholder`                                                                                                                                                                           | Poster/loading placeholder used internally by `VideoCard`; also drives `playInView` activation while lazy                                                                                                                                                                               |
| `VideoPlayerPlugin`                                                                                                                                                                          | Vue plugin — `app.use(VideoPlayerPlugin)` registers all components (core + controls) globally                                                                                                                                                                                           |
| `registerPlatform()`                                                                                                                                                                         | Teaches the player a new platform (URL matcher + embed adapter or source resolver) without forking — see the docs site's Platforms page                                                                                                                                                 |
| `PlayButton`/`MuteButton`/`FullscreenButton`/`LoopButton`/`PipButton`/`CaptionsButton`/`QualityButton`/`PlaybackRateButton`/`Buffering`/`Scrubber`/`VolumeSlider`/`TimeDisplay`/`Transcript` | Headless control primitives for building a custom HUD (`:controls="false"`). Each resolves its player in this order: a `player` prop, then a `for` element id, then the enclosing `<VideoPlayer>` via context — so a control nested in the player's default slot needs no wiring at all |
| `useForwardedPlayer()`                                                                                                                                                                       | Curated forward of a template-ref'd `VideoPlayer`'s controls/state for a wrapper component's own `defineExpose` — the same mechanism `VideoCard`/`VideoStage` use internally                                                                                                            |
| `resolvePlatform(url)`                                                                                                                                                                       | The platform key plus `embed: true/false` in one lookup                                                                                                                                                                                                                                 |
| `HideMarker`                                                                                                                                                                                 | Slotless sentinel — while it's in the viewport, a pinned `VideoStage` tucks off to a sliver instead of covering it, see the docs site's Components page                                                                                                                                 |

### Custom elements (`./element`, `./element/core`, `./element/controls`)

`src/elements/index.ts` (combined), `core.ts` (`ml-video-player`/`-stage`/`-item`/`-placeholder` plus `ml-video-hide-marker` — grouped here rather than with `controls.ts` because it depends on `VideoStage`'s registry state, which wouldn't be shared across a separate bundle), and `controls.ts` (just the 13 headless controls, tagged `ml-video-*` — e.g. `ml-video-play-button`, `ml-video-mute-button`) are three independent `vp pack` builds (see `vite.config.ts`'s `elementEntry()` factory), each outputting to `dist/elements/<name>.{mjs,d.mts}`. Only the combined `./element` auto-injects its CSS; `./element/core` and `./element/controls` leave that to the consumer (see CSS entry points below). `elements/index.ts` composes `core.ts`+`controls.ts` (import + `export *`) rather than duplicating their `defineCustomElement`/`customElements.define` calls.

Custom-element instances expose the same `defineExpose`d API a Vue template ref would (Vue copies `defineExpose` properties onto the element itself) — e.g. `document.querySelector('ml-video-card').togglePlay()` works identically to a Vue ref.

`core.ts`'s `customElements.define()` calls run synchronously at module top level. `customElements.define()` synchronously upgrades any matching tag already sitting in the DOM as part of that same call — deferring these to a microtask was tried and reverted: Vue decides whether to set `:playlist`/`:tracks`/etc. on a dynamically-rendered `<ml-video-stage>`/`<ml-video-card>` as a real DOM property or a stringified attribute by checking whether the property already exists on the element (`key in el`), which is only true once the tag is upgraded — deferring `define()` made every array/object prop lose its type on the very first render (see `usePlaylist.ts`'s `playlist.value.findIndex` breaking with `TypeError: e.value.findIndex is not a function`). One consequence of staying synchronous: a `registerPlatform()` call needs to run _before_ a matching custom element tag is upgraded — fine for a tag created from script after registering, but a _statically-declared_ tag already sitting in the DOM when `core.ts` is imported gets upgraded (and resolves its adapter) before a `registerPlatform()` call on the next line of the same script has a chance to run (see the docs site's Platforms page).

### CSS entry points (`./style`, `./style/core`, `./style/controls`)

Three independent, non-overlapping stylesheets, each a `vp pack` build (`elementEntry('core', 'core.css')` / `elementEntry('controls', 'controls.css')` in `vite.config.ts`) that doubles as both the un-embedded CSS export and the source `inlineCss` embeds into the matching `./element/*` bundle:

- `./style` → `dist/style.css` — everything; only this one is auto-injected by importing `./element`.
- `./style/core` → `dist/elements/core.css` — just the core player's own styles (the sheets under `src/styles/` plus the scoped `<style>` blocks reachable from `VideoPlayer`/`VideoStage`/`VideoCard`/`VideoPlaceholder`).
- `./style/controls` → `dist/elements/controls.css` — just the 13 headless controls' own styles, plus the shared `controlButton.css` every control button uses.

Pick exactly one per page; importing more than one `./element*` bundle together double-registers any custom element tag they share and throws. A Vue-only consumer using the headless controls without the built-in HUD typically wants `./style/controls` instead of the full `./style`, to skip CSS for a HUD they never render.

### Where the CSS lives

`src/styles/` holds every stylesheet that cannot be scoped, each imported as a side-effect from the component that draws it: `hud.css` (the `controls__*` family the popup, more-menu, volume panel and HUD buttons share), `playerSurface.css` (the video element plus each embed SDK's and IMA's own markup), `playPauseButton.css` (`.ppbtn`), `controlButton.css` (every headless control button) and `pinnedCorner.css` (the pinned/tucked corner box). A component keeps a `<style scoped>` block only for markup it actually renders itself.

### Themeable CSS variables

The player exposes several CSS custom properties for layout overrides:

| Variable                    | Default                         | Used by                    | Description                                                                          |
| --------------------------- | ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `--ml-video-controls-width` | `min(450px, calc(100% - 32px))` | `ControlsPopup.vue`        | Controls popup width — override to widen or narrow the popup                         |
| `--ml-video-popup-align`    | `center`                        | `PlayerOverlay.vue`        | Horizontal alignment of the controls popup                                           |
| `--ml-video-stage-tuck`     | `32px`                          | `pinnedCorner.css`         | Width of the sliver left visible when `HideMarker` tucks the pinned stage off-screen |
| `--ml-video-radius`         | `12px`                          | `pinnedCorner.css`         | Border-radius of the pinned corner box                                               |
| `--ml-video-accent`         | `#3b82f6`                       | HUD, more menu, transcript | Accent for sliders, active toggles, more-menu rows and the transcript's active cue   |

## Naming the player surface

Three names on the exposed handle avoid a collision rather than being terse for its own sake: `currentPlaybackRate`, `currentVolume` and `isNativeUi` all shadow a prop of the same name if named plainly, because Vue puts a custom element's props on the element itself as DOM properties. The rest say what they mean: `currentTime`, `duration`, `isMuted`. Quality speaks in **heights in pixels** everywhere — the prop, `setQuality()`, `currentQualityHeight` and the `qualitychange` event — since the ladder keeps one variant per height, which makes heights unique; the engine's own level index never leaves the adapter. `seek()` takes seconds.

## Layout

`src/ui/` holds the whole Vue layer - everything that renders or drives a player - and inside it
directories are features, not kinds, so a component sits next to the composables only it uses.
Everything outside `ui/` is what the layer is built on: playback backends, persistence, cross-instance
singletons, types, helpers and the build entries.

| Directory      | Holds                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ui/player/`   | `VideoPlayer.vue` and everything that makes one player work: state, controls, events, adapter mount, `features/`, `viewport/` |
| `ui/stage/`    | `VideoStage.vue`, `VideoCard.vue`, `VideoPlaceholder.vue`, `HideMarker.vue`, the playlist and the window-event bus            |
| `ui/controls/` | The 13 headless controls and the composables only they use (`useResolvedPlayer`, `useScrubber`, `useSpokenCues`)              |
| `ui/overlay/`  | The built-in HUD `VideoPlayer` renders, plus `useHud` and its visibility and action helpers                                   |
| `ui/pinned/`   | The two player shells, the pinned corner controls, and the pin decision/box composables                                       |
| `ui/shared/`   | `Icon.vue`, `Spinner.vue`, `useElementCompact` - used across the features above, owned by none                                |
| `ui/styles/`   | The stylesheets that cannot be scoped                                                                                         |
| `adapters/`    | Every source behind one `PlaybackAdapter` (see below), plus the emitter, script loader and source helpers only they use       |
| `preferences/` | Viewer choices that outlive one player, and the guarded storage they share                                                    |
| `registries/`  | Module singletons shared by every instance: pause handlers, document listeners, stage presence                                |
| `utils/`       | The genuinely cross-layer helpers and nothing else: time, platform, aspect ratio, shell lookup, FLIP, player actions, expose  |
| `types/`       | `player.ts` and `playback.ts`; `types/vendor/` holds the ambient SDK shims                                                    |
| `elements/`    | The custom-element build entries                                                                                              |

`test/` mirrors this exactly.

## Viewer preferences that outlive one player

`src/preferences/` is the whole of it: mute and volume, auto-advance, playback position, captions and
quality, each persisting through its `storage.ts`, which nothing outside that directory imports. Captions are stored as a language rather than a track index, since
indices are per-video, and `null` from `getCaptionPreference()` means "never chosen", which is what
lets a `<track default>` stand on a first visit. The preference is re-asserted wherever the active
track is observed, not once at attach: the browser applies `default` after the tracks register, so a
single early pass would run before there was anything to correct. It cannot fight the viewer, because
their own changes go through `setCaptionTrack`, which updates the very preference being enforced.

Quality follows the same split through `createPlayerControls`: `setQuality` is the viewer and records,
`applyQuality` is the `quality` prop or a stored preference being restored and does not. A prop wins
over a stored preference and leaves no trace of its own, so a host pinning a resolution never decides
anything on the viewer's behalf.

## Where a constant lives

`src/constants.ts` holds only what more than one module needs: the two stage event names, the two fullscreen-pending event names, the shell class, the MIME types, the default aspect ratio, the playback rates, the pause threshold and one SDK sync delay. Everything else lives as a module-level `const` in its single consumer, so a timing or a storage key sits next to the code that reads it rather than in a grab bag thirty files away. The old `MVP_` prefix is gone; it predated the `ml-video-` convention the CSS uses.

## What `use` means here

A `use*` name is a promise that the function must be called during `setup()`, because it reads reactive state or registers a lifecycle hook. Anything that merely takes state and hands back functions is a `create*` factory, and anything with no Vue involvement at all is a plain module under `src/utils/` or `src/registries/`. So `usePlayer` and `useFullscreen` are composables, while `createPlayerControls`, `createPlayerEvents`, `createAdSetup`, `createKeyboardShortcuts` and `createQuartileEvents` are not, and the emitter, the three registries and `exposePlayerOnElement` live outside `composables/` entirely.

## Composable core

`src/composables/player/usePlayer.ts` owns all playback state and exposes a single `fire(type, extras)` that emits the `state-change` event — `src/types/player.ts` has the full `StateChangeType` union and `StateChangeEvent` shape. Sub-composables each own one concern and call back into `fire`:

| Composable              | Concern                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useBuffering`          | Debounced `waiting`→`isBuffering` spinner state; fires `bufferstart`/`bufferend`                                                                                                                                                                                                                                                                                              |
| `useFullscreen`         | Fullscreen enter/exit, including iOS's native fullscreen quirks; shares one document-level listener pair (`src/registries/documentEventRegistry.ts`) across every mounted player                                                                                                                                                                                              |
| `createQuartileEvents`  | Fires `firstQuartile`/`midpoint`/`thirdQuartile` as playback crosses 25/50/75% of duration                                                                                                                                                                                                                                                                                    |
| `usePositionMemory`     | Persists/restores playback position across mounts (not for live streams)                                                                                                                                                                                                                                                                                                      |
| `createPlayerEvents`    | Wires native adapter events (`play`/`pause`/`ended`/`error`/`timeupdate`/etc.) to `fire` + local refs                                                                                                                                                                                                                                                                         |
| `createPlayerControls`  | Exposes the imperative API: `togglePlay`, `seek`, `setVolume`, `setQuality`, `setCaptionTrack`, etc.                                                                                                                                                                                                                                                                          |
| `createAdSetup`         | Google IMA ad setup/lifecycle for the native `<video>` path; shares one document-level listener pair (`src/registries/documentEventRegistry.ts`) for tab-hidden ad-pausing. On iOS, restores the original content source after a post-roll ad finishes (IMA plays ads through the same `<video>` element and may not restore it)                                              |
| `useAutoPauseOffscreen` | Pauses playback once the player scrolls (mostly) out of view — always on                                                                                                                                                                                                                                                                                                      |
| `useAutoPlayInView`     | Opt-in (`playInView`) auto-play once (mostly) in view; both this and `useAutoPauseOffscreen` share one `IntersectionObserver` per shell via `viewportObserver.ts`, which also debounces "last one to cross the threshold wins" when several players are visible at once                                                                                                       |
| `usePinnedBox`          | The pinned corner box's reserved space, tuck state, unpin and scroll-back, shared by `VideoPlayer`'s pin shell and `VideoStage`. Each caller keeps its own pin decision **and** its own animation policy: the stage must not animate a player mounting into an already-scrolled-away stage, since a FLIP parks the box off-screen long enough for auto-pause to stop playback |
| `useForwardedPlayer`    | See Public API above — lives at `src/player/useForwardedPlayer.ts`                                                                                                                                                                                                                                                                                                            |
| `stageRegistry`         | `hasStage` (mount count, read by `VideoCard` to know whether to hand off to a stage) and `isStageTucked` (shared ref `HideMarker` sets and `VideoStage` reads directly) — lives at `src/registries/stageRegistry.ts`                                                                                                                                                          |

## Adapters

`src/adapters/` normalizes every source behind one `PlaybackAdapter` interface (`src/types/playback.ts`), so `usePlayer.ts` never branches on source type directly. Captions, quality and Picture-in-Picture are **optional capability objects** (`captions`/`quality`/`pip`) rather than `supportsX()` methods: presence is support, so an embed omits what it has no SDK for instead of stubbing it out. `supportsPlaybackRate()` stays a method — YouTube only knows the answer after its own ready callback. `reveal?(videoEl)` is likewise optional and implemented only by embeds. Event names are the `PlaybackEvent` union, not a bare string. Source handling is split into `load(src, type?)` (swap) and `retry()` (re-attempt the current one), which used to be a single `setSrc` meaning different things per adapter:

- **`native/`** — plain `<video>`, hls.js (HLS), dash.js (DASH). Quality levels (`quality.levels(): { index, height, bitrate, label }[]`) come from here.
- **`embeds/`** — YouTube, Vimeo, Dailymotion. Each wraps the platform's own iframe SDK behind the same adapter interface (`embedShared.ts` has common iframe-reveal logic and a shared tracked-`setTimeout` scheduler; Vimeo/Dailymotion are built on its `createStatefulEmbedAdapter()` factory — mirrored playback state, play queueing while connect runs, and the shared getter/setter tail — each supplying its own `connect()` plus thin SDK delegates).
- **`sources/`** — Brightcove and JW Player aren't separate adapters; `adapters/index.ts`'s `resolvePlatform(url)`/`resolvePlatform(url)` matcher resolves their URLs down to a native or embed source first.
- **`ads/`** — Google IMA (`ads.ts`, loads the SDK via the shared `loadScript()` utility) for the native `<video>` path, plus `prebid.ts` for header-bidding ad-tag resolution (calls `pbjs.adServers.gam.buildVideoUrl()`, falls back to the plain ad tag on no-fill). On iOS, IMA plays ad creatives through the same `<video>` element as content (there is no separate ad video element); after a post-roll finishes the SDK may not restore the original content source, so `ads.ts` tracks `originalSrc` and a `postRollPending` flag (set when content had already ended when the ad started) — on `CONTENT_RESUME_REQUESTED` it restores the saved source and seeks to the end to clear the browser's internal "ended" flag, letting the normal ended/replay flow take over.

`adapters/index.ts`'s `matchers` array is the single source of truth for URL → platform resolution — no longer closed: `registerPlatform` is the one public extension point (`registerMatcher`/`registerEmbedAdapter`/`registerSourceResolver` back it and are not exported from the package entry). A consumer registration is **unshifted** so it can override a built-in, which pushing onto the end could never do; the built-ins seed the list and the `embedAdapters`/`sourceResolvers` records at runtime. `usePlayer.ts` resolves a player's adapter exactly once, in `onMounted` — not a reactive `watch` on `props.src` — so a `registerPlatform()` call only needs to land before that component mounts, not before the library loads; an already-mounted player never re-resolves on its own (see `VideoStage.vue`'s `:key="current.src"`, which forces a full remount — the actual mechanism a playlist swap uses to pick up newly-registered platforms). `resolvePlatform(url)` scans `matchers` once and returns both the platform key and embed-ness; it also infers MIME type from extension (`.m3u8` → HLS, `.mpd` → DASH, `.mp4` → `video/mp4`) for sources without an explicit type or registered resolver.

The types describing this contract (`Matcher`, `EmbedAdapterFactory`, `SourceResolver`, `ResolvedSource`, `PlatformConfig`) live in `src/types/playback.ts` alongside `PlaybackAdapter`, not in `adapters/index.ts` itself — that file just imports and re-exports them, keeping "what shape must external code conform to" separate from "the actual matching/dispatch logic."

## Events (`state-change`)

Emitted by `VideoCard`, `VideoPlayer`, and `VideoStage` (`stageopen`/`stageclose` come only from `VideoStage`). Full `StateChangeType` union (`src/types/player.ts`): `loaded`, `play`, `pause`, `ended`, `seeked`, `error`, `adstart`, `adend`, `volumechange`, `ratechange`, `captionchange`, `qualitychange`, `pipchange`, `loopchange`, `firstQuartile`, `midpoint`, `thirdQuartile`, `controlsopen`, `controlsclose`, `stageopen`, `stageclose`, `bufferstart`, `bufferend`, `timeupdate`, `tap`. `tap` fires from the tap-to-reveal-controls overlay regardless of `controls` — the only signal a `controls: false` consumer gets for "the user tapped the video". See the docs site's Events page for the full field-by-field breakdown of `StateChangeEvent` and per-type notes (e.g. `captionchange`/`qualitychange` never fire before playback has started).

## Testing

Two vitest projects, both run by `npm run test` (`vp test`): the jsdom unit suite in `test/` (mirroring `src/`, mocked adapters) and the real-browser suite in `test/browser/` (Chromium and WebKit via Playwright, real media from `test/browser/media`, every prop variation listed in `test/browser/catalogue.ts`). `--browser.name=chromium|webkit` narrows the browser project to one engine. Both `@/` (→ `src/`) and `@test/` (→ `test/`) aliases are available.

### Adding a browser test

A browser test belongs in `test/browser/` only if it needs a real `<video>`; anything that would pass against a mocked adapter is a unit test. Start from `test/browser/catalogue.ts` (add or pick the entry whose props you are testing; the demo's Variations panel renders the same list), mount it with `mountPlayer`/`mountCard`/`mountStage` from `test/browser/harness.ts`, and assert through the returned `player` handle and the `sink` of state-change events, reading the `<video>` element only for what the handle cannot see. Wait on events or `waitFor`, never on timers.

Iterate on one file, one engine, in watch mode, from this directory:

```bash
vp test --project browser --browser.name=chromium --watch test/browser/playback/auto-advance.spec.ts
vp test --project browser --browser.name=chromium --browser.headless=false test/browser/playback/auto-advance.spec.ts   # watch it happen
vp test --project browser --browser.name=webkit test/browser/playback/auto-advance.spec.ts                                # the Safari engine
vp test                                                                                                                  # everything, before committing
```

From the repo root the same run is `vp run @munsonlabs/video-player#test -- --project browser --browser.name=chromium`; `--watch` and file filters only behave well from the package directory. Browsers install once with `npx playwright install chromium webkit`.

## Build

```bash
npm run build       # vp pack
npm run dev          # AUTO_ENTRIES=1 vp pack --watch
npm run test         # vp test
npm run check        # vp check — lint + format + typecheck
```
