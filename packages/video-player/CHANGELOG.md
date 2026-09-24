# @munsonlabs/video-player

## 0.2.10

### Patch Changes

- aa7a31e: Custom elements, CSS classes and custom properties now read vendor, package, then part, so `<ml-controls-play-button>` is `<ml-video-play-button>` and `--mlv-accent` is `--ml-video-accent`.
- Updated dependencies [aa7a31e]
  - @munsonlabs/sigil@0.0.3

## 0.2.9

### Patch Changes

- c1f99c0: play() called straight after pause() now starts playback instead of being skipped, so a tap on the scrubber resumes.

## 0.2.8

### Patch Changes

- f1d3692: Resuming a paused ad no longer stops it again, and a tap on the scrubber resumes playback on iOS.

## 0.2.7

### Patch Changes

- 1c974ab: Captions and quality now persist the way mute and volume already did, so turning captions off or picking a resolution carries to the next video and survives a reload. In Vue, headless controls placed inside a player, card or stage now drive it with no `player` prop or `for` id to wire up. `registerPlatform` can take over a URL a built-in platform already claims.

  Fixes include desktop Safari losing its controls in fullscreen, Retry doing nothing after a Vimeo or Dailymotion error, hour-long videos reading `80:05`, and blocked storage taking down a click handler.

  Breaking:

  - `current`, `total` and `vol` are now `currentTime`, `duration` and `currentVolume`
  - `seek()` takes seconds; `seekTo()` is gone
  - quality is addressed by height everywhere, and `currentQualityIndex` is `currentQualityHeight`
  - adapters expose optional `captions`, `quality` and `pip` objects, and `load`/`retry` in place of `setSrc`
  - `useCaptions`, `useQuality` and `usePlaybackRate` are plain functions: `cycleCaptionTrack`, `cycleQuality`, `cyclePlaybackRate` and their label helpers
  - icon names dropped the `mlv-` prefix, so `override('mlv-play', …)` becomes `override('play', …)`

- Updated dependencies [fcc4728]
  - @munsonlabs/sigil@0.0.2

## 0.2.6

### Patch Changes

- b6d5583: The HUD and controls draw their icons through `@munsonlabs/sigil` as the `mlv` library, so a page can replace any of them at runtime with `override('mlv-play', svg)` or swap the whole set by registering its own `mlv` library, without forking the player.
- Updated dependencies [6ef37f1]
  - @munsonlabs/sigil@0.0.1

## 0.2.5

### Patch Changes

- 95e90bd: Embed SDK load failures now surface an error with a working Retry, the player handle gains `play()`, `pause()`, `replay()`, `seekTo()` and `isLoaded`, and the public API is trimmed of internal wiring (playlist bridge props, the `video-state` event, granular registry exports, `MethodKey`) ahead of the first stable release. The `title` prop is renamed `label` (it clashed with `HTMLElement.title` on the custom elements), and `PlaybackAdapter.play()` always returns a promise.

## 0.2.4

### Patch Changes

- 6d79256: Add `loop` and `preload` props to `VideoPlayer`/`VideoCard` (and the matching custom-element attributes).

## 0.2.3

### Patch Changes

- e496bf6: - **Quality selection** works on multi-variant streams. Clicks no longer get swallowed mid-switch, and `qualityLevels` lists one rung per resolution (highest bitrate of each, ascending, audio-only renditions dropped) instead of every manifest variant. Indices are unchanged, so `setQuality` is unaffected.
  - **Player width** no longer jumps when a lazily mounted player replaces its placeholder. Placeholder, player and stage all share the same cap, now `--mlv-max-width` (default `800px`). Override it like any other `--mlv-*` variable, e.g. `--mlv-max-width: none`. Corner-pinned and pip sizes are unaffected.
  - **`sideEffects`** is now declared for `dist/elements/**` and CSS imports instead of the whole package being marked side-effect-free, so bundlers no longer tree-shake custom element registration or styles out of `@munsonlabs/video-player/element`.

## 0.2.2

### Patch Changes

- ab5abb8: **Breaking:** Rename themeable CSS custom properties from `--mvp-*` to `--mlv-*` (e.g. `--mvp-controls-width` → `--mlv-controls-width`, `--mvp-popup-align` → `--mlv-popup-align`, `--mvp-stage-tuck` → `--mlv-stage-tuck`, `--mvp-radius` → `--mlv-radius`, `--mvp-accent` → `--mlv-accent`). Update any CSS overrides referencing the old names. Also simplifies some internal prop handling.
- ab5abb8: **Breaking:** Rename all custom element prefixes from `muns-` to `ml-` (e.g. `muns-video-player` → `ml-video-player`, `muns-controls-play-button` → `ml-controls-play-button`, `muns-hide-marker` → `ml-hide-marker`). Update any DOM selectors, CSS rules, or `querySelector` calls that reference the old prefix.
- ab5abb8: **Breaking:** Rename the `VideoItem` Vue component to `VideoCard` (file renamed `VideoItem.vue` → `VideoCard.vue`, export and plugin registration updated). Update imports, template usage, and `VideoPlayerPlugin`'s registered component name from `<VideoItem>` to `<VideoCard>`.

## 0.2.1

### Patch Changes

- 7ccdca4: Add `--mvp-controls-width` CSS variable so the controls popup width can be overridden from outside, defaulting to `min(450px, calc(100% - 32px))`. Adjust pinned-player corner dimensions (`70dvw` with a `360px` cap instead of a fixed `360px`) for better small-screen fit, raise the pinned "scroll-to" button's z-index so it sits above ad overlays, and lower the compact-container breakpoint from `300px` to `250px`. On iOS, restore the original content source after a post-roll ad finishes and seek to the end so the normal ended/replay flow works correctly; also log video playback errors to the console for easier debugging.
- 7ccdca4: Fix `current`/`total`/`bufferedDisplay` briefly reflecting the ad creative's own position/duration/buffered range during an ad on iOS, where IMA plays ads through the content's own `<video>` element rather than a separate one. Visibly, a `Transcript`'s active cue would jump to wherever the ad's position mapped onto the content's cue list (and the `Scrubber`/`TimeDisplay` would show equivalently wrong values) for the duration of every ad; everything now stays frozen on the content's real values throughout, resuming automatically once the ad ends.
- 7ccdca4: Add `exposePlayerOnElement(el, player)` to bridge a plain Vue `<VideoPlayer>`/`<VideoItem>`/`<VideoStage>`'s exposed state/methods onto a real DOM element - the same way `defineCustomElement` would - so independent code with no access to your Vue app (a third party's own script, a `<muns-controls-*>` web component from a separate bundle) can drive it via `for="id"`/`querySelector`/`.player =`, the same way it would a genuine custom element.

## 0.2.0

### Minor Changes

- a39769d: `VideoStage`'s `state-change` event now fires `stageopen`/`stageclose` whenever it mounts or tears down a player, alongside the existing `controlsopen`/`controlsclose` types - a coarser signal than play/pause for "does the stage have a video loaded at all".
- a39769d: Add a `Transcript` headless control (`<ml-controls-transcript>`): pass `cues` as `{ time, end?, text }[]` (or an inline JSON string attribute on the custom element), clicking a cue seeks the linked player to that timestamp (starting playback if paused), and the cue at the playhead is highlighted and kept scrolled into view while playback progresses. Works on every platform, embeds included, since it only needs the current time and `seek`.
- a39769d: Add `registerPlatform` (plus the lower-level `registerMatcher`/`registerEmbedAdapter`/`registerSourceResolver`) so a consumer can teach the player about a new video platform - either an embed-type one with its own SDK/iframe, or a source-type one that resolves to a plain playable file - without forking the package. Works identically from the plain Vue components and the web component bundles (`/element`, `/element/core`).
- a39769d: Add a `pinPosition` prop to `VideoPlayer`/`VideoItem` so a standalone player (no `VideoStage` involved) can pin itself to a screen corner as a mini-player once scrolled out of view while playing, instead of just auto-pausing - the same corner-pinning behaviour `VideoStage` already has, scoped to a single player. Pausing while pinned doesn't unpin it, and a dismiss/scroll-to-player button pair is shown on the pinned box. See the README's "Pinning a single player" section for the full behaviour.
- a39769d: **Breaking:** removed the `window.mvp` global fallback for `registerPlatform`/`registerMatcher`/`registerEmbedAdapter`/`registerSourceResolver`, previously exposed for the rare case of two independently-bundled copies of this package sharing one page. If you relied on `window.mvp` instead of importing these functions directly, switch to the module imports. Also narrows `index.ts`'s exports: `PlayerContext`/`HudContext`/`PlaylistContext` are now type-only exports rather than `export *`, which may have re-exported their (internal, undocumented) injection-key values.
- a39769d: Add an opt-in `?defer` mode for the web component bundle: loading `element/core` via an import map entry whose target URL carries a `?defer` query param skips the automatic `customElements.define()` calls, exposing a `defineElements()` export the consumer calls once `registerPlatform` has run. Fixes a race where `customElements.define()` upgrades a matching tag already in static markup before a same-tick `registerPlatform()` call can register its platform. The default (eager) behaviour is unchanged.
- a39769d: **Breaking for custom adapters:** renamed `PlaybackAdapter`'s `featuresPlaybackRate`/`featuresCaptions`/`featuresQuality`/`featuresPip` to `supportsPlaybackRate`/`supportsCaptions`/`supportsQuality`/`supportsPip`, matching the `supports*`/`is*` naming already used everywhere else on the player-facing side. If you've implemented a custom adapter via `registerEmbedAdapter`/`registerPlatform`, rename these four methods on your adapter to match.
- a39769d: Code-split the five built-in platform adapters (YouTube/Vimeo/Dailymotion/JW Player/Brightcove): each now loads via a dynamic import the first time that platform's URLs actually mount, instead of shipping unconditionally in the main bundle. `index.mjs`/`core.mjs` each shrink by ~5KB gzip for a consumer who never plays a given platform's URLs. `/element` and `/element/core` now depend on a sibling `chunks/` directory - a directory-serving CDN (unpkg/jsdelivr/esm.sh) needs no special handling, but self-hosting either bundle means deploying `chunks/` alongside it.
- a39769d: Add a shared, persisted mute/volume preference and a new `volume` prop: any player now starts at whatever mute/volume level the viewer last chose on any other player, instead of always resetting to full volume/unmuted. Purely a fallback - an explicit `muted`/`volume` (on a prop or a playlist `VideoEntry`) always wins, so nothing changes if you already set either. Autoplay-ish playback with no user gesture behind it still starts muted regardless (a browser policy, not a preference), and `VideoStage`'s playlist skip/auto-advance carries the outgoing video's own state forward rather than the shared preference. See the README's "Autoplay, mute & volume" section for the full behaviour.

### Patch Changes

- a39769d: Fix a video sent to `VideoStage` via `autoStage` sometimes autoplaying immediately even without `autoplay` set, almost exclusively on YouTube - a duplicate select event for an already-current video (e.g. a second `VideoItem` rendering the same entry elsewhere on the page) was mistaken for a real user re-click and toggled playback. Also hardens the YouTube adapter's own `autoplay` player var so playback is always driven through this package's own play queue rather than the IFrame API's own unreliable autoplay behaviour.
- a39769d: Fix a handful of bugs: a custom element's `playbackRate`/`nativeUi` state was permanently unreachable through those same-named exposed properties due to a prop/`defineExpose()` naming collision (renamed to `currentPlaybackRate`/`isNativeUi`); `payload` set as a JSON string attribute on a custom element (e.g. `<ml-video-item payload='{"a":1}'>`) now parses correctly instead of arriving as a literal string; the initial-muted formula had drifted across native vs. embed adapters, so a `playWhenInView`-only video could show as muted in local state while actually playing unmuted; `pickBestSource`'s sort comparator was invalid (ignored its second argument, never returned `0`), which could yield unstable source ordering; a CSS rule for embed tap-capture passthrough (YouTube's share icon, Dailymotion's unmute prompt) had shipped fully commented out; and `VideoPlayer`'s curated `defineExpose` built a one-time snapshot instead of a live reactive object, so exposed state (`isPlaying`, `isMuted`, `isBuffering`, ...) froze at whatever it was when the component mounted and never updated - breaking any headless control reading state off a template ref.
- a39769d: Mark the package `sideEffects: false` so bundlers can tree-shake unused headless controls (and whatever adapter/ad code they'd otherwise pull in) for a consumer who only imports a subset - e.g. the documented `for="id"` headless-controls-only pattern against an externally-created player.
- a39769d: Animate `VideoStage`'s minify/unminify jump and `ControlsPopup`'s panel swap with a plain CSS FLIP transition instead of `document.startViewTransition()` - works in every browser and avoids the full-page-snapshot flashing View Transitions can cause on iOS Safari. Also raised the stage's viewport-intersection threshold tolerance to stop pin/unpin flapping on fast scrolls.
- a39769d: Code-split the IMA ads/header-bidding module: `ads.ts`/`prebid.ts` now load via a dynamic import once a player is confirmed to have `adTagUrl`/`headerBidding` set, instead of shipping unconditionally - saves ~1KB gzip off `index.mjs`/`core.mjs` for a consumer who never sets either.

## 0.1.6

### Patch Changes

- 5bd5f41: Add `HideMarker`, a sentinel component that tucks a corner-pinned `VideoStage` mostly off-screen (leaving a small sliver) while it's in the viewport, so it doesn't cover content lower on the page - sliding back once the marker scrolls out of view. Dual-published as a Vue component and a `ml-hide-marker` custom element.

## 0.1.5

### Patch Changes

- 5da85b3: - Extract headless control primitives (PlayButton, MuteButton, Scrubber, etc.) into standalone components, each dual-published as a Vue component and a `ml-controls-*` custom element.
  - Add `useForwardedPlayer` for building your own wrapper components - the same mechanism `VideoItem`/`VideoStage` use internally to forward `VideoPlayer`'s controls/state through themselves via `defineExpose`. Works identically via a Vue template ref or a custom-element DOM reference.
  - Add `playWhenInView` (auto-play/pause based on viewport visibility, with a debounced "last one wins" priority when multiple players are visible at once) and a public `timeupdate` event; `playWhenInView` now also works with `VideoItem`'s default `lazy` placeholder.
  - Fire a `tap` event from the tap-to-reveal-controls overlay so a headless (`controls: false`) consumer can show/hide their own UI in response.
  - Keep ad controls (pause/mute/countdown) available even when `controls: false`.
  - Split the web-component bundle into `./element/core` and `./element/controls`, each with its own CSS bundle (`./style/core`, `./style/controls`), alongside the existing combined `./element`/`./style`.

## 0.1.4

### Patch Changes

- d53d3ab: Namespace custom element tags with a `ml-` prefix to avoid colliding with other libraries' custom elements — `<video-item>` → `<ml-video-item>`, `<video-player>` → `<ml-video-player>`, `<video-stage>` → `<ml-video-stage>`, `<video-placeholder>` → `<ml-video-placeholder>`. The Vue component names (`VideoItem`, `VideoPlayer`, `VideoStage`, `VideoPlaceholder`) are unaffected.
- d53d3ab: Fixes the web component bundle's self-injected CSS. It previously located `dist/style.css` via a URL relative to its own `import.meta.url`, which esm.sh breaks by serving the module from a synthetic per-target directory with no CSS sibling — the stylesheet silently never applied. The CSS is now embedded directly into the JS at build time and injected as a `<style>` tag, so it works the same regardless of which CDN serves it.

## 0.1.3

### Patch Changes

- b7ac8ac: Adds DASH (`.mpd`) playback support via an optional `dashjs` peer dependency, following the same dynamic-import pattern as the existing `hls.js` integration: `.mpd` sources are auto-detected and routed to a new dash.js-backed adapter path. Manual quality switching now works for both HLS and DASH through a shared `QualityEngineAdapter` interface — DASH quality changes pass `replace: true` to dash.js's `setQualityFor()` so they take effect immediately instead of only affecting segments requested after whatever's already pre-buffered.
- 29333d1: Adds `bufferstart`/`bufferend` `state-change` events, fired whenever the player stalls on `waiting` for longer than the buffering-spinner delay and when `playing`/`canplay`/`ended` resolves it. Useful for tracking rebuffer count/ratio.

## 0.1.2

### Patch Changes

- ccc9f88: Adds captions (WebVTT track selection), manual HLS quality selection, and Picture-in-Picture support, each exposed through the controls menu, a template-ref method (`setCaptionTrack()`, `setQuality()`, `togglePip()`), and a corresponding `state-change` event (`captionchange`, `qualitychange`, `pipchange`). Also adds a `loopchange` event for `toggleLoop()`, and makes `qualitychange`/`captionchange` fire reliably on every call rather than only when the underlying adapter happened to confirm the change.

  Fixes several playback issues:

  - Ads now pause when the tab is hidden or the window loses focus, and exit Picture-in-Picture when an ad starts (skipped on iOS, where the ad renders into the same `<video>` element PiP already mirrors).
  - Pausing an ad's own controls while still inside iOS's native YouTube fullscreen no longer closes fullscreen outright — only backing out of it does.
  - Dismissing and reselecting a pinned/minified playlist video no longer gets stuck unpinned, and auto-advancing to the next playlist entry now carries over the current mute state.

  Web component usage (`@munsonlabs/video-player/element`) no longer requires a separate stylesheet import — the element bundle now links its own CSS automatically, since it renders into the light DOM with nowhere else for styles to live.

## 0.1.1

### Patch Changes

- 177617c: Fixes a bug where a slow, hung, or misbehaving Prebid.js header-bidding auction could permanently break player controls (play/pause silently doing nothing) by blocking the rest of mount from ever completing. `headerBidding` now resolves entirely in the background — mounting, playback, and controls never wait on it — and its result is only used if it's ready by the time the ad is actually requested (on first play); otherwise the plain `adTagUrl`/`adTagParams` result is used, exactly as if `headerBidding` weren't set. Also documents step-by-step setup for both plain ads and header bidding in the README, and fills in a couple of previously-undocumented details (`disableTapCapture` prop, `extractAdTagUrl`'s handling of custom-named Brightcove ad plugins).
- 177617c: Adds a `headerBidding` prop to run a Prebid.js video auction before an ad plays, using the winning bid's own merged ad tag URL (via `pbjs.adServers.gam.buildVideoUrl()`) instead of `adTagUrl`/`adTagParams`. This expects the consumer's own already-configured `window.pbjs` — the player doesn't load or bundle Prebid.js itself, since real deployments are custom builds specific to whichever bidder adapters a publisher uses, and most already load one for their other ad slots. Fails open at every step (missing `pbjs`, an auction timeout, no bid won, or `buildVideoUrl()` throwing) by falling back to whatever `adTagUrl`/`adTagParams` would have resolved to, so a header-bidding hiccup never blocks ad playback.
- 839c902: Fixes HLS playback failing on Chrome (and other non-Safari browsers) where `canPlayType` returned a false positive for HLS mime types, causing the player to skip loading `hls.js` and hand the stream to the native `<video>` element, which then couldn't play it. Native HLS is now only used when the browser is actually detected as Safari.

## 0.1.0

### Minor Changes

- 883d1f9: Adds an `adTagParams` prop (`Record<string, string>`) that merges query params onto whichever ad tag URL ends up in use — an explicit `adTagUrl` prop, or, if that's unset, one auto-discovered from the platform (e.g. Brightcove's player config). This lets callers pass contextual/programmatic ad-targeting values (device IDs, `cust_params`, publisher-provided IDs, etc.) without needing to know or duplicate where the base ad tag URL comes from.

## 0.0.12

### Patch Changes

- 8af6838: Fixes several HLS playback issues in the native adapter: falls back to plain `<video>` playback instead of throwing when `hls.js` resolves to something other than the real module (e.g. a missing/stubbed import map entry); adds hls.js's recommended fatal-error recovery (retrying network errors, recovering media errors, and surfacing anything else — like a persistent 403 on the manifest — as a normal player error instead of leaving hls.js to retry and abort silently in the background); and, most importantly, now prefers the browser's native HLS support (Safari on macOS/iOS) over hls.js's MSE path whenever it's available, since Safari passes hls.js's `isSupported()` check but has real gaps in its MSE implementation (notably around encrypted/fMP4 streams) that don't affect its native HLS playback.

## 0.0.11

### Patch Changes

- bffa974: Adds playlist support to `VideoStage`: pass a `playlist` array to enable `playNext()`/`playPrevious()` and automatic auto-advance on `ended`, remembered in `localStorage` with zero consumer wiring. The controls popup gains a skip-to-next button and an "Auto" toggle whenever a playlist is set, and a new `action="autoplay"` value lets a HUD button toggle the same setting. Secondary controls (playback speed, loop, autoplay toggle, custom action) have moved out of the controls popup's main row into a new "More" menu to reduce clutter, and the HUD's mute/loop/autoplay action buttons now show a themeable active state via `--mvp-accent`.

  Also: fixes a YouTube iOS fullscreen exit race where the clone player's overlay could tear down before it was ever shown; switches viewport-height units to `dvh` so layouts account for mobile Safari's dynamic toolbar; migrates Brightcove URLs to the platform's real embed URL format (`https://players.brightcove.net/...`) instead of a custom `brightcove://` scheme; removes the dead `platform`, `techOptions`, and `imaOptions` props along with the unused `supportsFullScreen()` adapter method; and slightly enlarges the pinned corner stage player (300px → 360px).

## 0.0.10

### Patch Changes

- 2eda47d: Reduce install and bundle size by loading third-party SDKs on demand instead of bundling them: `hls.js` is now an optional peer dependency loaded via dynamic import only when an HLS (`.m3u8`) source is set, and the Vimeo Player SDK is now loaded from Vimeo's own CDN script (matching the existing YouTube/Dailymotion/IMA pattern) instead of bundling the `@vimeo/player` npm package. Also documents the `hls.js` import map entry needed for HLS playback via the web component build, and fixes several stale README references to `video.js`/`videojs-ima`.

## 0.0.9

### Patch Changes

- b870223: Drop the video.js/videojs-ima dependency in favour of talking to the Google IMA SDK directly, and remove focus mode to simplify the overlay and controls. Add an ad overlay (an "Ad" badge with countdown, an independent mute toggle for the ad creative's own audio, and a resume button when an ad is paused), VMAP ad tag and cue point support, iOS fullscreen handling during ad playback, `controlsopen`/`controlsclose` state-change events, a configurable `--mvp-popup-align` CSS variable for the controls popup position, ambient auto-show/hide controls in real fullscreen (matching standard native/YouTube-style players), a scroll-to-player button on the minified stage, and close-on-outside-click for the controls popup.

## 0.0.8

### Patch Changes

- c408e44: Make control bar compactness respond to a CSS container query on the player's own rendered width (`@container player-shell`), in addition to the existing stage-pinned trigger — so a narrow standalone `VideoPlayer` (not just a minified `VideoStage`) automatically hides the seek bar, playback-rate, loop, and fullscreen buttons.

## 0.0.7

### Patch Changes

- 8673677: Fix YouTube adapter to mute videos when autoplay is enabled, and replace CSS nesting syntax in VideoStage with flat selectors for broader build system compatibility.

## 0.0.6

### Patch Changes

- 152c9af: Fix video loading placeholder showing a native grey box with play icon on Android, a flash of an undersized poster on iOS, and a black flash between the lazy-load placeholder and the player by rendering the poster natively and as a CSS background from first paint.
- 819bb82: Reorganise composables into `player/` and `overlay/` subdirectories, add overlay composables for visibility, playback rate, and seek preview, move focus mode state management into the composable with injection-based propagation, and add CSS variable theming with focus-aware stage chrome that hides the shadow and dismiss button.

## 0.0.5

### Patch Changes

- 319536d: Add configurable pin positions for the minified stage player, make HUD controls scale responsively with player size, fix iOS volume control and position-memory clearing, and fix Dailymotion ads leaving the poster and play button stuck on screen.

## 0.0.4

### Patch Changes

- 5bf442b: Fix iOS fullscreen for Vimeo and Dailymotion, correct focus mode sizing and seek bar behavior after replay, and add a disableTapCapture option to let clicks reach the underlying platform UI.

## 0.0.3

### Patch Changes

- 6ca9e3b: Add focus mode feature with controls adjustment and state events

## 0.0.2

### Patch Changes

- c31cfae: Add a retry button to the video player's error state and quartile progress events (firstQuartile/midpoint/thirdQuartile) to the state-change emitter for analytics integrations.

## 0.0.1

### Patch Changes

- d153922: Add platform adapters as video.js techs for embed-based video playback
