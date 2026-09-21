---
title: Methods & state
description: The imperative API and reactive state on a template ref.
navigation:
  icon: i-lucide:square-function
---

A template ref on `VideoPlayer`, `VideoCard`, or `VideoStage` exposes the same handle - methods to drive playback, and live state to read:

```vue
<script setup>
import { ref } from 'vue'
const player = ref(null)
</script>

<template>
  <VideoPlayer ref="player" src="..." :controls="false" />
  <button @click="player.togglePlay()">{{ player?.isPlaying ? 'Pause' : 'Play' }}</button>
  <button @click="player.seek(30)">Jump to 0:30</button>
</template>
```

The same handle is available on a DOM reference to the custom-element form, via `defineExpose`:

```js
await document.querySelector('ml-video-card').play()
```

## Methods

| Method                   | Description                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `play()`                 | Start playback; resolves once playing, rejects on an autoplay block or media error                   |
| `pause()`                | Pause                                                                                                |
| `togglePlay()`           | Play/pause                                                                                           |
| `replay()`               | Back to the start and playing - what the HUD button does after `ended`                               |
| `seek(seconds)`          | Seek to an absolute time in seconds, clamped to the duration                                         |
| `toggleMute()`           | Toggle mute                                                                                          |
| `setVolume(level)`       | Set volume, `0`-`1`                                                                                  |
| `toggleFullscreen()`     | Enter/exit fullscreen                                                                                |
| `toggleLoop()`           | Toggle loop - fires `loopchange`                                                                     |
| `setPlaybackRate(rate)`  | Change speed - fires `ratechange`                                                                    |
| `setCaptionTrack(index)` | Select a caption track, or `null` for off - fires `captionchange`                                    |
| `setQuality(height)`     | Select a quality level by height in pixels, nearest wins, or `null` for Auto - fires `qualitychange` |
| `togglePip()`            | Enter/exit Picture-in-Picture - fires `pipchange`                                                    |
| `retry()`                | Re-attempt the current source after an `error`                                                       |

## State

All reactive - read them straight off the ref to drive your own HUD.

| Field                                                                          | Type                                                            | Description                                                                                                 |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `isPlaying` / `hasEnded` / `isError`                                           | `boolean`                                                       | Playback status                                                                                             |
| `isReady` / `isLoaded`                                                         | `boolean`                                                       | Adapter attached / duration known (or live). `loaded` fires when `isLoaded` flips                           |
| `currentTime` / `duration`                                                     | `number`                                                        | Position and duration, in seconds                                                                           |
| `bufferedDisplay`                                                              | `number`                                                        | Percent (0-100) buffered ahead, for a scrubber's buffered fill                                              |
| `isBuffering`                                                                  | `boolean`                                                       | Stalled long enough to warrant a spinner                                                                    |
| `isLive`                                                                       | `boolean`                                                       | Live stream - seeking is hidden                                                                             |
| `isMuted` / `volume`                                                           | `boolean` / `number`                                            | Mute state and volume (0-1)                                                                                 |
| `isAudible`                                                                    | `boolean`                                                       | False when muted **or** volume is dragged to 0 - the single "should this look silent" read                  |
| `isFullscreen` / `isLooping`                                                   | `boolean`                                                       | Fullscreen and loop state                                                                                   |
| `supportsPip` / `isPipActive`                                                  | `boolean`                                                       | PiP availability and state                                                                                  |
| `supportsCaptions` / `captionTracks` / `activeCaptionIndex`                    | `boolean` / `CaptionTrackInfo[]` / `number \| null`             | Caption availability, the track list, and the active index (`null` = off)                                   |
| `supportsQuality` / `qualityLevels` / `currentQualityHeight` / `isAutoQuality` | `boolean` / `QualityLevelInfo[]` / `number \| null` / `boolean` | Quality availability, levels (`{ index, height, bitrate, label }`), and the selected height (`null` = Auto) |
| `supportsPlaybackRate` / `currentPlaybackRate`                                 | `boolean` / `number`                                            | Rate availability and current rate                                                                          |

This is the `PlayerHandle` interface - a headless control's `player` prop accepts anything structurally matching it.

## Per-component differences

- **`VideoCard`** may still be showing its lazy placeholder - any control method mounts the real player first. With a `VideoStage` on the page the card hands playback off entirely: `togglePlay()` selects/toggles this video on the stage, and everything else is a no-op.
- **`VideoStage`** adds `playNext()`, `playPrevious()`, `hasNext`, and `hasPrevious` when `playlist` is set. It can't auto-mount without a video selected, so control methods before that are a no-op.
