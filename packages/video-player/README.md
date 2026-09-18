# @munsonlabs/video-player

A Vue 3 video player supporting YouTube, Vimeo, Dailymotion, Brightcove, JW Player, and plain HTML5 (MP4, HLS, DASH). Includes a sticky stage player, lazy loading, custom actions, IMA ad support, header bidding, captions, adaptive quality selection, headless controls, and web component exports.

## Installation

```bash
npm install @munsonlabs/video-player
```

## Usage

```vue
<script setup>
import { VideoCard } from '@munsonlabs/video-player'
import '@munsonlabs/video-player/style'
</script>

<template>
  <VideoCard
    label="Big Buck Bunny"
    src="https://cdn.jwplayer.com/videos/O5chtspP-4VHSaSK0.mp4"
    poster="https://m.media-amazon.com/images/S/pv-target-images/fb7afef01282cdc2d846b2343f9f3d7a785b7133729776f1aa0da6501a2e1f7b.jpg"
  />
</template>
```

`VideoPlayer`, `VideoStage`, headless controls, and web component (`ml-video-*`) exports are also available - see the docs for the full component list.

## Docs

Full guides for props, events, ads, captions, quality, theming, headless controls, and web component usage: **https://munsonlabs.github.io/packages/video-player/getting-started/introduction**
