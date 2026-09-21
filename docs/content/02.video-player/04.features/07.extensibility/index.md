---
title: Extensibility
description: Custom HUDs, custom actions, composables, and wrapping/exposing a player - the surfaces you build on without forking.
navigation:
  icon: i-lucide:puzzle
---

## A fully custom HUD

Set `controls="false"` for a bare `<video>` with no built-in HUD, then build your own from the 13 [headless controls](/video-player/api/controls) - each a Vue component and an `ml-controls-*` custom element - and the [imperative API](/video-player/api/methods) for anything they don't cover:

```vue
<script setup>
import { ref } from 'vue'
import { VideoPlayer, PlayButton, MuteButton, Scrubber } from '@munsonlabs/video-player'

const itemRef = ref(null)
function seekBy(seconds) {
  itemRef.value?.seek((itemRef.value.currentTime ?? 0) + seconds)
}
</script>

<template>
  <VideoPlayer ref="itemRef" src="..." :controls="false" />

  <PlayButton :player="itemRef" v-slot="{ isPlaying }">{{ isPlaying ? 'Pause' : 'Play' }}</PlayButton>
  <MuteButton :player="itemRef" v-slot="{ isMuted }">{{ isMuted ? 'Unmute' : 'Mute' }}</MuteButton>
  <button @click="seekBy(-10)">« 10s</button>
  <button @click="seekBy(10)">10s »</button>
  <Scrubber :player="itemRef" />
</template>
```

::headless-example
::

Import `@munsonlabs/video-player/style/controls` instead of the full `/style` to skip CSS for a player HUD you never render.

## Custom actions

`action` adds a button to the built-in HUD - a built-in behaviour or your own:

```vue
<VideoCard action="mute" src="..." />
<!-- also 'loop', 'autoplay' (stage auto-advance) -->
<VideoCard :action="{ icon: '<svg .../>', label: 'Save', onClick: save }" src="..." />
```

## Composables

The logic behind the built-in controls is exported, so a custom control can reuse it rather than reimplement it:

| Composable                                                | Returns                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `useScrubber(playerRef)`                                  | `{ scrubbing, displayPercent, previewSeconds, onInput, onChange, onTouchEnd }` - the full pause-on-drag, preview, commit-on-release dance |
| `cycleCaptionTrack(player)` / `captionTrackLabel(player)` | Step through the tracks and back to off, and the active track's label                                                                     |
| `cycleQuality(player)` / `qualityLabel(player)`           | Step down the ladder and back to Auto, and the selected level's label                                                                     |
| `cyclePlaybackRate(player)` / `playbackRateLabel(rate)`   | Step through the rates, and format one for display                                                                                        |

## Wrapping and exposing a player

- [`useForwardedPlayer`](/video-player/api/methods/wrapping#useforwardedplayer) forwards a wrapped `VideoPlayer`'s full handle through your own component's `defineExpose`, with an optional `guard` to intercept calls.
- [`exposePlayerOnElement`](/video-player/api/methods/wrapping#exposeplayeronelement) copies that handle onto a DOM element, so a third party's script or a separately-bundled `<ml-controls-*>` element can drive a plain Vue player.
