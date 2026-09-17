# @munsonlabs/video-player

A Vue 3 video player supporting YouTube, Vimeo, Dailymotion, Brightcove, JW Player, and plain HTML5 (MP4, HLS, DASH). Includes a sticky stage player, lazy loading, custom actions, IMA ad support, header bidding, captions, adaptive quality selection, headless controls, and web component exports.

## Installation

```bash
npm install @munsonlabs/video-player
```

## Vue Usage

### Basic player

```vue
<script setup>
import { VideoCard } from '@munsonlabs/video-player'
import '@munsonlabs/video-player/style'
</script>

<template>
  <VideoCard
    title="Big Buck Bunny"
    src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
    poster="https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
  />
</template>
```

### Pinning a single player

Set `pin` on a standalone `VideoCard`/`VideoPlayer` (no `VideoStage` involved) to get the same corner-pinning mini-player behaviour `VideoStage` has, scoped to just that one player: once it scrolls out of view while playing, it pins to the given corner instead of auto-pausing, and shrinks back to its inline size once scrolled back into view.

```vue
<VideoCard src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4" pin="bottom-right" />
```

- Only `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'` are supported here (unlike `VideoStage`'s `pin`, there's no `'full-width'` option for a single player).
- Pausing while pinned does **not** unpin it - like a mini-player, it stays put, paused, in the corner until scrolled back into view. A dismiss button and a scroll-to-player button are shown on the pinned box.
- Omit `pin` to disable pinning entirely - the player then just auto-pauses offscreen as usual.
- `HideMarker` (see [Hiding the pinned stage over content](#hiding-the-pinned-stage-over-content)) works the same way here too, since there's only ever one pinned/tucked element on a page at a time.

### Stage player

`VideoStage` is a sticky full-width player that receives videos from `VideoCard` components anywhere on the page via window events. When the stage scrolls out of view it minifies to a pip in the bottom-right corner.

```vue
<script setup>
import { VideoStage, VideoCard } from '@munsonlabs/video-player'
import '@munsonlabs/video-player/style'
</script>

<template>
  <VideoStage @state-change="onStateChange" />
  <VideoCard v-for="video in videos" :key="video.src" v-bind="video" />
</template>
```

### Playlists

Pass `playlist` (a `VideoEntry[]`, the same shape as a `VideoCard`'s props) to let the stage track the currently-playing video's position within it. Position updates automatically when a user clicks a `VideoCard` elsewhere on the page, with nothing extra to keep in sync.

```vue
<VideoStage :playlist="videos" @state-change="onStateChange" />
```

- Auto-advance (playing the next entry on `ended`, no wraparound) is toggled via the controls popup's "Auto" button and remembered in `localStorage` - there's no prop for it.
- A template ref on `VideoStage` exposes `playNext()`, `playPrevious()`, `hasNext`, and `hasPrevious`:

```vue
<VideoStage ref="stage" :playlist="videos" />
<button :disabled="!stage?.hasPrevious" @click="stage.playPrevious()">Previous</button>
<button :disabled="!stage?.hasNext" @click="stage.playNext()">Next</button>
```

### Hiding the pinned stage over content

When `VideoStage` is pinned to a corner (any `pin` other than `'full-width'`), it can sit over content you'd rather it not cover - a footer, a signup form, a comments section. `HideMarker` is a plain sentinel element: place it just before that content, and the stage slides mostly off-screen (leaving a small sliver) for as long as the marker is in the viewport, sliding back once it isn't.

```vue
<script setup>
import { VideoStage, HideMarker } from '@munsonlabs/video-player'
</script>

<template>
  <VideoStage pin="bottom-right" :playlist="videos" />

  <!-- ...page content... -->

  <HideMarker />
  <Footer />
</template>
```

- There's no prop linking `HideMarker` to a specific `VideoStage` - there's only ever one stage on a page, so it always applies to whichever one is mounted.
- The sliver width is a CSS custom property: `--mlv-stage-tuck` (default `32px`), see [theming variables](#theming-the-hud-buttons).
- Place it precisely where you want the stage to tuck away - it renders a 1px-tall invisible `div`, so it triggers briefly as the page scrolls past that exact line.

---

## VideoCard / VideoPlayer Props

| Prop                | Type           | Default  | Description                                                                                                                                                                                                     |
| ------------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src`               | `string`       | -        | **Required.** The video URL or platform-specific URI (the platform is auto-detected from its shape, see [Platform URLs](#platform-urls))                                                                        |
| `title`             | `string`       | `''`     | Video title                                                                                                                                                                                                     |
| `poster`            | `string`       | `''`     | Poster image URL                                                                                                                                                                                                |
| `aspectRatio`       | `string`       | `'16:9'` | e.g. `'16:9'`, `'9:16'`, `'4:3'`                                                                                                                                                                                |
| `autoplay`          | `boolean`      | `false`  | Autoplay on mount, see [Autoplay, mute & volume](#autoplay-mute--volume)                                                                                                                                        |
| `muted`             | `boolean`      | -        | Force a starting mute state - if unset, follows the shared audio preference, see [Autoplay, mute & volume](#autoplay-mute--volume)                                                                              |
| `volume`            | `number`       | -        | Force a starting volume (0-1) - if unset, follows the shared audio preference, see [Autoplay, mute & volume](#autoplay-mute--volume)                                                                            |
| `lazy`              | `boolean`      | `true`   | `VideoCard` only: show the placeholder until clicked                                                                                                                                                            |
| `nativeUi`          | `boolean`      | `false`  | Use the platform's native controls (YouTube, Vimeo, Dailymotion only)                                                                                                                                           |
| `autoStage`         | `boolean`      | `false`  | `VideoCard` only: send this video to the stage on mount                                                                                                                                                         |
| `playbackRate`      | `number`       | `1`      | Initial playback rate                                                                                                                                                                                           |
| `loop`              | `boolean`      | `false`  | Start with looping on - reactive, so flipping it later is the same as calling `toggleLoop()`                                                                                                                    |
| `preload`           | `PreloadMode`  | -        | `'none' \| 'metadata' \| 'auto'` - the native `<video preload>` attribute. `'none'` defers loading for MP4 and HLS alike (hls.js is held back until the first play), not DASH; other values leave HLS as normal |
| `adTagUrl`          | `string`       | `''`     | VAST or VMAP ad tag URL                                                                                                                                                                                         |
| `adMacroParams`     | `object`       | -        | Fills `{macro}` tokens on whichever ad tag URL ends up in use, see [Ads](#ads-ima--vast--vmap)                                                                                                                  |
| `headerBidding`     | `object`       | -        | Runs a Prebid.js auction before the ad plays, see [Header bidding](#header-bidding-prebidjs)                                                                                                                    |
| `tracks`            | `array`        | -        | WebVTT caption/subtitle tracks, see [Captions](#captions-webvtt)                                                                                                                                                |
| `payload`           | `object`       | `{}`     | Arbitrary data attached to every `state-change` event                                                                                                                                                           |
| `action`            | `PlayerAction` | `null`   | Button shown in the player HUD, see [Actions](#actions)                                                                                                                                                         |
| `disableTapCapture` | `boolean`      | `false`  | Disables the full-video tap-to-reveal-controls overlay (tap/click still reaches embed platform UI underneath, e.g. YouTube's own)                                                                               |
| `controls`          | `boolean`      | `true`   | Set `false` to render a bare `<video>` with no built-in HUD - drive playback with your own UI instead, see [Headless Controls](#headless-controls)                                                              |
| `playInView`        | `boolean`      | `false`  | Auto-play once at least half the player is visible, auto-pause once it isn't - e.g. for a scroll-snap feed, see [Autoplay, mute & volume](#autoplay-mute--volume)                                               |
| `pin`               | `PinCorner`    | -        | Pins the player to this screen corner once it scrolls out of view while playing, instead of auto-pausing - see [Pinning a single player](#pinning-a-single-player)                                              |

### Autoplay, mute & volume

Unless a video sets `muted`/`volume` explicitly, every player on the page shares one persisted audio preference (`localStorage`) - a newly-mounted player starts at whatever level the viewer last chose anywhere else. **Autoplay without a user gesture always starts muted** (browser policy, not a library choice). A real user gesture (clicking a lazy placeholder, `video-toggle`) follows the shared preference immediately. `VideoStage`'s playlist skip/auto-advance carries the outgoing video's own mute/volume state forward, not the shared preference. An explicit `muted`/`volume` always wins.

### Platform URLs

The platform is detected automatically from the shape of `src`; there's no separate prop to set it.

| Platform      | URL format                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `youtube`     | `https://www.youtube.com/watch?v=VIDEO_ID`                                                               |
| `vimeo`       | `https://vimeo.com/VIDEO_ID`                                                                             |
| `dailymotion` | `https://www.dailymotion.com/video/VIDEO_ID`                                                             |
| `brightcove`  | `https://players.brightcove.net/ACCOUNT_ID/PLAYER_ID_EMBED/index.html?videoId=VIDEO_ID`\*                |
| `jwplayer`    | `https://cdn.jwplayer.com/videos/...` · `https://cdn.jwplayer.com/manifests/...` · `jwplayer://MEDIA_ID` |
| `html5`       | Any direct MP4 / HLS / DASH URL                                                                          |

\* `PLAYER_ID_EMBED` is one path segment: `{PLAYER_ID}_{EMBED_NAME}` (e.g. `abc123_default` for the account's default player), which is exactly the URL Brightcove Studio's "Publish" panel gives you for an embed.

### Adding a custom platform

`registerPlatform` teaches the player about a platform beyond the six above, without forking the package:

```ts
import { registerPlatform } from '@munsonlabs/video-player'

registerPlatform({
  key: 'acme',
  test: (url) => url.includes('acme.tv'),
  embed: true, // true: the platform has its own SDK/iframe; false: it resolves to a plain playable file
  createAdapter: (videoEl, options) => createAcmeAdapter(videoEl, options),
})
```

Call it once, before mounting any player that might see the new URL - resolution reads the registry fresh every time, so ordering (not caching) is the only thing that matters.

- **`embed: true`** - the platform owns its own player (YouTube, Twitch, Vimeo). `createAdapter` returns a full `PlaybackAdapter`: `play`/`pause`/`currentTime`/captions/quality/PiP/fullscreen/`on`/`off`/`dispose`, translating SDK events into the common set.
- **`embed: false`** - the platform hosts a file/manifest behind an opaque URL. `resolveSource` (optional) returns `{ src, type?, poster?, adTagUrl? }`; the native path handles playback.

This works identically from the [web component bundles](#web-component-usage) - see [Registering a platform from a web component](#registering-a-platform-from-a-web-component) for the `?defer` import mode that sidesteps a timing subtlety with statically-declared tags.

---

## Headless Controls

Unstyled control primitives for building your own HUD instead of the built-in one (set `:controls="false"` on the player) - each is published both as a Vue component and as a `ml-controls-*` custom element from the exact same source:

Building a custom HUD out of these and never rendering `VideoPlayer`'s own built-in controls? Import `@munsonlabs/video-player/style/controls` instead of the full `/style` bundle to skip the built-in HUD/popup CSS - see [Web Component Usage](#web-component-usage) for the full breakdown of the three style bundles.

```ts
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
  Transcript,
} from '@munsonlabs/video-player'
```

Every control takes a `player` prop pointing at the same object `VideoPlayer`/`VideoCard`/`VideoStage` expose via a template ref:

```vue
<script setup>
import { ref } from 'vue'
import { VideoPlayer, PlayButton, MuteButton, Scrubber } from '@munsonlabs/video-player'
const player = ref(null)
</script>

<template>
  <VideoPlayer ref="player" src="..." :controls="false" />
  <PlayButton :player="player" />
  <MuteButton :player="player" />
  <Scrubber :player="player" />
</template>
```

Or, `<label for>`-style, skip the ref and point at an element id instead:

```vue
<VideoPlayer id="my-player" src="..." :controls="false" />
<PlayButton for="my-player" />
```

`player` and `for` are both optional - if both are given, `player` wins. Each button's own CSS uses `:where()` (zero specificity), so a single class you add always wins, and most expose their state via a scoped slot for full custom markup (e.g. `PlayButton`'s `#default="{ isPlaying }"`). See [Web Component Usage](#web-component-usage) for using these as raw custom elements (`<ml-controls-play-button>` etc.) outside Vue.

### The player handle

A template ref on `VideoPlayer`/`VideoCard`/`VideoStage` (or the `player` injected into a headless control) exposes the `PlayerHandle` type. The commonly used part:

| Member                                             | Notes                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `play()` / `pause()` / `togglePlay()`              | `play()` returns a promise that resolves once playing and rejects on an autoplay block/error |
| `replay()`                                         | Seeks to 0 and plays; what the HUD button does after `ended`                                 |
| `seekTo(seconds)` / `seek(percent)`                | Seconds for transcripts, chapters, deep links; percent for scrubbers                         |
| `isLoaded` / `isReady` / `isPlaying`               | `isLoaded` means the duration is known; `isReady` only means the adapter is attached         |
| `hasEnded` / `isError` / `retry()`                 | `retry()` reloads the current source after an error                                          |
| `current` / `total` / `isLive`                     | Seconds                                                                                      |
| `isMuted` / `vol` / `toggleMute()` / `setVolume()` | Volume is 0-1                                                                                |

### Transcript

`Transcript` renders a clickable transcript for the linked player: pass `cues` as `{ time, end?, text }[]` (times in seconds), clicking a cue seeks to its timestamp (starting playback first if paused), and the cue at the playhead is highlighted and kept scrolled into view:

```vue
<VideoPlayer id="my-player" src="..." />
<Transcript
  for="my-player"
  :cues="[
    { time: 0, text: 'Welcome back to the show.' },
    { time: 12, text: 'Today we look at the new release.' },
    { time: 47, end: 60, text: 'Here is the demo.' },
  ]"
/>
```

- Works on **every** platform (YouTube/Vimeo/Dailymotion included) - only needs current time and `seek`.
- `end` is optional: when set, nothing is highlighted between that cue's `end` and the next cue's start.
- Auto-scroll pauses while the pointer is over the list. A scoped slot customises each cue's markup: `#default="{ cue, index, isActive, formatTime }"`.
- As a custom element (`<ml-controls-transcript>`), pass cues as an inline JSON string attribute: `cues='[{"time":0,"text":"..."}]'`.

### Building your own wrapper component

`useForwardedPlayer` is what `VideoCard`/`VideoStage` themselves use to forward a template-ref'd `VideoPlayer`'s controls/state onto their own `defineExpose` - the same mechanism is available for building a custom wrapper component of your own:

```vue
<script setup>
import { useForwardedPlayer } from '@munsonlabs/video-player'
const { playerRef, forwarded } = useForwardedPlayer()

defineExpose(forwarded)
</script>

<template>
  <VideoPlayer ref="playerRef" v-bind="$attrs" />
</template>
```

`useForwardedPlayer` owns the ref itself - bind `playerRef` on the wrapped `VideoPlayer`, and spread (or pass) `forwarded` into your own `defineExpose`, so callers holding a ref to your wrapper get the same `PlayerHandle` API `VideoPlayer` exposes (methods return promises there, since the optional `guard` callback that runs before each call may be async).

Because it's wired up via `defineExpose`, this works the same way whether your wrapper is used as a Vue component (a template ref) or as a custom element ([Web Component Usage](#web-component-usage)) - Vue copies `defineExpose`d properties onto the element itself.

### Exposing a plain Vue player to independent, non-Vue code

A plain `<VideoPlayer>`/`<VideoCard>`/`<VideoStage>` used the normal Vue way doesn't expose its API onto the DOM - its state lives on the Vue component instance, reachable only via a template ref inside your own app. `exposePlayerOnElement` bridges that gap for code with no access to your Vue app (a third party's own script, a `<ml-controls-*>` custom element from a separate bundle):

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { VideoPlayer, exposePlayerOnElement } from '@munsonlabs/video-player'

const playerRef = ref(null)
const wrapperEl = ref(null)
onMounted(() => exposePlayerOnElement(wrapperEl.value, playerRef.value))
</script>

<template>
  <div id="my-player" ref="wrapperEl">
    <VideoPlayer ref="playerRef" src="..." />
  </div>
</template>
```

```html
<!-- a completely separate script/bundle, e.g. a third party's own -->
<script type="module">
  import '@munsonlabs/video-player/element/controls'
</script>
<ml-controls-transcript for="my-player" cues='[{"time":0,"text":"..."}]'></ml-controls-transcript>
```

State fields are copied as live getters (not a one-time snapshot) and methods directly. `el` doesn't need to be the player's own root element - a wrapper `<div>` works the same.

---

## Events

### `state-change`

Emitted by `VideoCard`, `VideoPlayer`, and `VideoStage`. Every event includes `currentTime`, `duration`, `src`, and `payload` (arbitrary user data).

| Event                            | When it fires                                                                                        | Extra fields                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `loaded`                         | Duration is known (or the stream is detected as live); `isLoaded` flips true                         | —                                                          |
| `play`                           | Playback starts or resumes                                                                           | —                                                          |
| `pause`                          | Playback pauses                                                                                      | —                                                          |
| `ended`                          | Playback reaches the end                                                                             | —                                                          |
| `seeked`                         | Seek completes                                                                                       | —                                                          |
| `error`                          | Source fails to load/play; player shows a "Retry" button                                             | `error: { code, message }`                                 |
| `adstart`                        | Ad begins playing                                                                                    | —                                                          |
| `adend`                          | Ad finishes                                                                                          | —                                                          |
| `volumechange`                   | Volume or mute state changes                                                                         | `isMuted`                                                  |
| `ratechange`                     | Playback rate changes                                                                                | `playbackRate`                                             |
| `captionchange`                  | Active caption track changes (fires on `setCaptionTrack()` and ABR-driven changes, but not at mount) | `captionIndex` (null = off)                                |
| `qualitychange`                  | Active quality level changes (fires on `setQuality()` and ABR-driven changes, but not at mount)      | `qualityIndex` (null = Auto)                               |
| `pipchange`                      | PiP entered or exited (from player button or browser floating window)                                | `isPipActive`                                              |
| `loopchange`                     | Loop toggled (not before playback starts)                                                            | `isLooping`                                                |
| `firstQuartile`                  | Playback crosses 25% of duration                                                                     | —                                                          |
| `midpoint`                       | Playback crosses 50% of duration                                                                     | —                                                          |
| `thirdQuartile`                  | Playback crosses 75% of duration                                                                     | —                                                          |
| `controlsopen` / `controlsclose` | Expanded controls popup mounts/unmounts                                                              | `element` (popup root node; on close, a detached snapshot) |
| `stageopen` / `stageclose`       | Stage mounts its inner player / tears it down (stage only)                                           | —                                                          |
| `bufferstart` / `bufferend`      | Buffering begins (after stall delay) / resolves                                                      | —                                                          |
| `timeupdate`                     | Regular time update during playback                                                                  | —                                                          |
| `tap`                            | Full-video tap-to-reveal overlay is tapped; only signal for `controls: false` consumers              | —                                                          |

`firstQuartile`/`midpoint`/`thirdQuartile` reset and fire again on loop restart. `captionchange`/`qualitychange` never fire before playback starts.

---

## Actions

The `action` prop adds a button to the player HUD. Pass a built-in string or a custom action object.

### Built-in actions

```vue
<VideoCard action="mute" ... />
<VideoCard action="loop" ... />
<VideoCard action="autoplay" ... />
```

`action="autoplay"` toggles [auto-advance](#playlists) and only makes sense when rendered inside a `VideoStage` with a `playlist` set: it reads and flips the same `autoAdvance` state as the controls popup's built-in "Auto" button, just as a HUD button instead.

### Custom action

Pass an object with `icon` (SVG string), `label`, and `onClick`:

```vue
<VideoCard :action="{ icon: '<svg .../>', label: 'Save', onClick: () => console.log('saved') }" ... />
```

---

## Ads (IMA / VAST / VMAP)

**Step by step:**

1. Get a VAST or VMAP ad tag URL. For testing, use [Google's public IMA sample tags](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags); for production, this comes from your ad server (Google Ad Manager): ask whoever manages ad ops for the tag, or build it yourself if you already know the ad unit path.
2. Pass it as `adTagUrl` on `VideoCard`/`VideoPlayer`. That's it for a basic pre-roll/VMAP schedule: the Google IMA SDK is loaded automatically on demand, nothing else to configure.
3. Confirm it's working: watch for `adstart`/`adend` on the `state-change` event, or check the Network tab for a request to `pubads.g.doubleclick.net` (or wherever your ad server lives) when the video plays.
4. Only if your ad tag is a **macro template** (contains literal `{tokenName}` placeholders, as Brightcove's auto-discovered ad tags usually do, see below) do you need `adMacroParams` too. Otherwise skip it entirely.

```vue
<VideoCard src="https://..." ad-tag-url="https://pubads.g.doubleclick.net/..." />
```

Ads are not supported on YouTube, Vimeo, or Dailymotion.

Some platforms (currently Brightcove) auto-discover their own ad tag URL: the platform's own wins if you don't pass `adTagUrl` yourself. Brightcove's ad tag URLs are typically macro templates (e.g. `...&iu={adUnit}&vid={referenceId}&cust_params={customParameters}`), not ready-to-use URLs. `adMacroParams` fills these in on **whichever** ad tag URL ends up in use, prop-supplied or auto-discovered:

```vue
<VideoCard src="https://players.brightcove.net/..." :ad-tag-params="{ adUnit: 'network/section', referenceId: videoId, rdid: deviceId }" />
```

Name each key exactly after the macro it fills (`vid={referenceId}` means the key is `referenceId`, not `vid`). A key with no matching `{macro}` is a no-op.

### Header bidding (Prebid.js)

**Step by step:**

1. Confirm your organisation already runs Prebid.js somewhere on the page (`window.pbjs` in the console). If not, this isn't something to set up from this package.
2. Get a Prebid **video ad unit** config from ad ops (with `code`, `mediaTypes.video`, and `bids`) and the GAM ad unit path (`iu`).
3. Pass both as `headerBidding: { adUnit, params: { iu: '...' } }`, alongside a plain `adTagUrl`/`adMacroParams` as fallback. Never rely on `headerBidding` alone.
4. Verify: run `pbjs.getBidResponsesForAdUnitCode('your-ad-unit-code')` in the console after playing.

The auction runs **in the background** and is never awaited: it can't block mounting, playback, or controls. Its result is only used if ready by the time the ad is requested (first play); otherwise the plain ad tag is used. Every failure mode (no `pbjs`, timeout, no bid, `buildVideoUrl()` throwing) fails open:

```vue
<VideoCard
  src="https://players.brightcove.net/..."
  :header-bidding="{
    adUnit: {
      code: 'video-preroll',
      mediaTypes: { video: { context: 'instream', playerSize: [640, 480] } },
      bids: [{ bidder: 'appnexus', params: { placementId: 123456 } }],
    },
    params: { iu: '/network/adunit' },
    timeoutMs: 1000,
  }"
/>
```

`adUnit` is a standard Prebid video ad unit. `params` is passed through to `buildVideoUrl()` (GAM ad tag params). `timeoutMs` (default `1000`) bounds the auction. Every failure mode fails open to whatever `adTagUrl`/`adMacroParams` would have resolved to.

### Ad overlay UI

While an ad is playing, a small overlay shows an "Ad" badge with a countdown to the ad's end, a dedicated pause/resume button, and a mute button that controls the ad creative's own independent audio (separate from the content video's volume/mute state: muting the player has no effect on ad audio, and vice versa).

### Ad visibility behaviour

An ad pauses itself whenever the tab is hidden or the window loses focus, and exits Picture-in-Picture if active (skipped on iOS, where the ad renders into the same `<video>` element PiP mirrors). The player ignores `timeupdate`/`durationchange`/`progress` events while an ad is active, so `current`/`total`/`bufferedDisplay` stay on the content's values throughout. On iOS, after a post-roll ad finishes the player restores the original content source and seeks to the end, since the IMA SDK may not restore it.

---

## Captions (WebVTT)

Only meaningful for the native `<video>` path (plain MP4/HLS): captions are unsupported on YouTube, Vimeo, and Dailymotion, which render their own captions inside their iframe instead if the source video has them. Brightcove and JW Player get real support for free, since both resolve to an actual `<video>`/HLS source under the hood.

There are two ways a caption track ends up available, and you don't have to pick: the player supports both at once.

- **HLS streams that already declare subtitle renditions in their own manifest** get picked up automatically by hls.js/Safari's native HLS, with no `tracks` prop needed at all. A "Captions" option just appears in the controls menu once the manifest has parsed.
- **Everything else** (a plain MP4, or an HLS stream with no subtitle rendition of its own) needs WebVTT tracks supplied explicitly via `tracks`:

```vue
<VideoCard
  src="https://.../video.mp4"
  :tracks="[
    { src: '/captions/en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
    { src: '/captions/fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
  ]"
/>
```

`src` must be a WebVTT file URL (`<track>` only understands VTT, not SRT). Each entry renders as a native `<track>` element: the browser fetches and parses the file itself. `default: true` has the browser show that track immediately with no extra wiring.

Clicking "Captions" in the controls menu cycles Off → first track → next track → ... → Off. Programmatically, a template ref on `VideoPlayer` exposes `setCaptionTrack(index)` (`null` turns captions off); see [Events](#state-change) for the `captionchange` event this fires.

---

## Video Quality (HLS / DASH)

Adaptive HLS and DASH streams automatically expose a "Quality" option in the controls menu once hls.js/dash.js (or Safari's native HLS) has parsed the manifest's resolution variants: there's no prop to set and nothing to configure. Clicking it cycles Auto → highest → ... → lowest → Auto; Auto leaves the streaming engine's adaptive bitrate algorithm in control.

This only applies to HLS and DASH: plain MP4/HTML5 sources have no variant levels, and it's unsupported on YouTube, Vimeo, and Dailymotion. Brightcove and JW Player get it for free, same reasoning as captions above.

**Safari plays HLS natively** (see [Peer Dependencies](#peer-dependencies)), and native HLS has no manual quality-override hook: the Quality option simply won't appear there.

Programmatically, a template ref on `VideoPlayer` exposes `setQuality(index)` (`null` re-enables Auto); see [Events](#state-change) for the `qualitychange` event this fires.

---

## Picture-in-Picture

A Picture-in-Picture button appears in the controls automatically wherever the browser supports it (`document.pictureInPictureEnabled`), nothing to configure. It stays in sync whether PiP is toggled from the player's own button or the browser's floating window is closed directly.

Only supported on the native `<video>` path (plain MP4/HLS): YouTube, Vimeo, and Dailymotion are unsupported here since their iframe content isn't a real `<video>` element this package controls directly. Brightcove and JW Player get it for free, same reasoning as captions/quality above.

Programmatically, a template ref on `VideoPlayer` exposes `togglePip()`; see [Events](#state-change) for the `pipchange` event this fires.

---

## Theming the HUD buttons

Set the variables on any ancestor of the player (e.g. a wrapper `<div>` or `:root`) to restyle all three buttons at once:

```css
.my-video-wrapper {
  --mlv-btn-bg: #e11d48;
  --mlv-btn-color: #fff;
}
```

Icons use `fill="currentColor"`, so `--mlv-btn-color` recolours the icon along with `--mlv-btn-bg` for the background. Hover state is a `filter: brightness()` lift on top of `--mlv-btn-bg`, so it works for both the default translucent look and a solid theme colour.

### Full controls popup

| Variable               | Default                         | Description                                                                              |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `--mlv-controls-width` | `min(450px, calc(100% - 32px))` | Controls popup width                                                                     |
| `--mlv-popup-align`    | `center`                        | Horizontal alignment of the popup (`center` or `flex-end` to dock at the bottom)         |
| `--mlv-btn-bg`         | (frosted glass)                 | Background of action, play/pause, and show-controls buttons                              |
| `--mlv-btn-color`      | (frosted glass)                 | Icon/text colour of the same buttons                                                     |
| `--mlv-stage-tuck`     | `32px`                          | Width of the sliver left visible when `HideMarker` tucks the pinned stage off-screen     |
| `--mlv-radius`         | `12px`                          | Border-radius of the pinned corner box                                                   |
| `--mlv-accent`         | —                               | Active-state highlight colour for the loop/autoplay toggle buttons in the controls popup |

Real fullscreen always docks the popup to the bottom regardless of `--mlv-popup-align`.

### Fullscreen controls

Outside fullscreen, the full controls bar only appears after clicking "show controls" and stays open until dismissed. In real fullscreen it auto-shows on activity and auto-hides after inactivity, like a standard native player.

---

## Web Component Usage

Import an element bundle to register components as native custom elements. These render into the light DOM (not shadow roots), so styling has nowhere encapsulated to live. Vue is an external dependency.

Three bundles are available: pick exactly one, since importing more than one double-registers any tag they share and throws:

- `@munsonlabs/video-player/element`: everything (player + all headless controls). Auto-injects its own CSS.
- `@munsonlabs/video-player/element/core`: just `<ml-video-player>`/`<ml-video-stage>`/`<ml-video-card>`/`<ml-video-placeholder>`. Import `@munsonlabs/video-player/style/core` yourself.
- `@munsonlabs/video-player/element/controls`: just the `<ml-controls-*>` primitives. Import `@munsonlabs/video-player/style/controls` alongside it.

`/element` and `/element/core` dynamically `import()` platform adapter code only when a URL for that platform mounts (from a sibling `chunks/` directory); self-hosting either bundle means deploying `chunks/` alongside it.

### From a CDN, with no build step

```html
<!--
  Vue's esm-bundler build expects its compile-time feature flags to be substituted by a
  bundler. Nothing does that on a CDN, and `VueElement._mount` reads this one before Vue
  can self-default it — so without this line every element registers, appears in the DOM,
  and renders nothing, with the ReferenceError buried in `connectedCallback`.

  It must be its own script: `import` is hoisted, so an assignment inside the module
  below would run after the bundle had already mounted.
-->
<script>
  globalThis.__VUE_PROD_DEVTOOLS__ = false
</script>

<script type="importmap">
  {
    "imports": {
      "@munsonlabs/video-player/element": "https://esm.sh/@munsonlabs/video-player/element"
    }
  }
</script>

<script type="module">
  import '@munsonlabs/video-player/element'
</script>

<ml-video-card
  src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
  title="Big Buck Bunny"
  poster="https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
></ml-video-card>
```

esm.sh rewrites every bare specifier in the bundle to its own URLs — `vue`, and the `hls.js`
and `dashjs` that an HLS or DASH source pulls in on demand — so that one global is the entire
setup. The import map above only aliases the package name for readability; dropping it and
importing the full esm.sh URL directly works just as well.

### With a bundler

None of the above applies — your bundler substitutes Vue's feature flags at build time, so
`import '@munsonlabs/video-player/element'` is all you need.

### Supplying your own Vue instead

If you already have Vue on the page, or want to control which build is used, mark it external
and map it yourself. Vue's `esm-browser` builds have the flags already substituted, so no
global is needed:

```html
<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.runtime.esm-browser.prod.js",
      "@munsonlabs/video-player/element": "https://esm.sh/@munsonlabs/video-player/element?external=vue"
    }
  }
</script>
```

Without `?external=vue`, esm.sh resolves Vue itself and a bare `vue` import map entry is
never consulted — it has already rewritten the specifier to its own URL.

`?external=vue` externalises **only** Vue. `hls.js` and `dashjs` stay resolved by esm.sh, so
nothing else changes here.

### Self-hosting, or loading raw files

Serving `dist/` yourself — or loading raw file paths from unpkg/jsdelivr rather than esm.sh —
gives you the bundle byte for byte, with every bare specifier intact. Nothing rewrites them, so
map all three yourself:

```html
<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.runtime.esm-browser.prod.js",
      "hls.js": "https://cdn.jsdelivr.net/npm/hls.js@1/+esm",
      "dashjs": "https://cdn.jsdelivr.net/npm/dashjs@4/+esm"
    }
  }
</script>
```

`hls.js` and `dashjs` are each loaded on demand via a dynamic `import()` when an `.m3u8` or
`.mpd` source mounts, so omitting them fails at that moment rather than at load — skip them
only if you are certain neither format will ever play.

Platform adapter chunks are relative paths, not bare specifiers, so they need no entry — just
deploy `chunks/` alongside the bundle.

### Available elements

Core (in `/element` and `/element/core`):

| Element                  | Vue equivalent       |
| ------------------------ | -------------------- |
| `<ml-video-card>`        | `<VideoCard>`        |
| `<ml-video-stage>`       | `<VideoStage>`       |
| `<ml-video-player>`      | `<VideoPlayer>`      |
| `<ml-video-placeholder>` | `<VideoPlaceholder>` |
| `<ml-hide-marker>`       | `<HideMarker>`       |

Controls (in `/element` and `/element/controls`), see [Headless Controls](#headless-controls) for what each does:

| Element                              | Vue equivalent         |
| ------------------------------------ | ---------------------- |
| `<ml-controls-play-button>`          | `<PlayButton>`         |
| `<ml-controls-mute-button>`          | `<MuteButton>`         |
| `<ml-controls-fullscreen-button>`    | `<FullscreenButton>`   |
| `<ml-controls-loop-button>`          | `<LoopButton>`         |
| `<ml-controls-pip-button>`           | `<PipButton>`          |
| `<ml-controls-captions-button>`      | `<CaptionsButton>`     |
| `<ml-controls-quality-button>`       | `<QualityButton>`      |
| `<ml-controls-playback-rate-button>` | `<PlaybackRateButton>` |
| `<ml-controls-buffering>`            | `<Buffering>`          |
| `<ml-controls-scrubber>`             | `<Scrubber>`           |
| `<ml-controls-volume-slider>`        | `<VolumeSlider>`       |
| `<ml-controls-time-display>`         | `<TimeDisplay>`        |
| `<ml-controls-transcript>`           | `<Transcript>`         |

### Passing objects as web component attributes

Boolean and string props map directly to HTML attributes. Object props (`payload`) can be passed as inline JSON strings:

```html
<ml-video-card src="https://..." ad-tag-url="https://..." payload='{"articleId":"123"}'></ml-video-card>
```

For `action` (which contains a function), set it via JavaScript:

```js
const player = document.querySelector('ml-video-card')
player.action = { icon: '<svg.../>', label: 'Save', onClick: () => {} }
```

### Listening to events

```js
const player = document.querySelector('ml-video-card')
player.addEventListener('state-change', (e) => {
  console.log(e.detail)
})
```

### Calling player methods

`<ml-video-card>`/`<ml-video-stage>` expose the same forwarded API a Vue template ref would (see [Building your own wrapper component](#building-your-own-wrapper-component)) - methods and state land directly on the element itself:

```js
const player = document.querySelector('ml-video-card')
await player.play() // resolves once playing, rejects on an autoplay block or media error
player.seekTo(30)
console.log(player.isPlaying, player.isLoaded)
```

### Registering a platform from a web component

[`registerPlatform`](#adding-a-custom-platform) is exported from `/element` and `/element/core` too:

```html
<script type="module">
  import { registerPlatform } from 'https://esm.sh/@munsonlabs/video-player/element/core'
  registerPlatform({ key: 'acme', test: (url) => url.includes('acme.tv'), embed: true, createAdapter: createAcmeAdapter })

  const player = document.createElement('ml-video-player')
  player.setAttribute('src', 'https://acme.tv/watch/123')
  document.body.append(player)
</script>
```

**Timing note:** importing `/element`/`/element/core` calls `customElements.define()`, which synchronously upgrades any matching tag already in the DOM. A statically-declared `<ml-video-player>` gets upgraded before your `registerPlatform` call on the next line. Creating the tag from script, after registering, as above sidesteps this.

If your tags are statically declared, load `/element/core` with a **`?defer`** query instead: it skips the automatic `customElements.define()`, so you register your platform first and then call the exported `defineElements()` yourself:

```html
<script type="module">
  import { registerPlatform, defineElements } from 'https://esm.sh/@munsonlabs/video-player/element/core?defer'
  registerPlatform({ key: 'acme', test: (url) => url.includes('acme.tv'), embed: true, createAdapter: createAcmeAdapter })
  defineElements()
</script>

<ml-video-player src="https://acme.tv/watch/123"></ml-video-player>
```

`?defer` is read from the `/element/core` module's own URL. `defineElements()` is idempotent: it only defines whichever tags aren't already registered.

---

## Peer Dependencies

| Package  | Version                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue`    | `>=3` (Vue usage only)                                                                                                                                                                   |
| `hls.js` | `^1.6.16`, optional, only needed for HLS (`.m3u8`) playback via native `<video>`; see [Web Component Usage](#web-component-usage) for the import map entry if you're not using a bundler |
| `dashjs` | `^4.7.4`, optional, only needed for DASH (`.mpd`) playback via native `<video>`; see [Web Component Usage](#web-component-usage) for the import map entry if you're not using a bundler  |
