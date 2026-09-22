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
    src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
    poster="https://img.youtube.com/vi/aqz-KE-bpKQ/0.jpg"
  />
</template>
```

`VideoPlayer`, `VideoStage`, headless controls, and web component (`ml-video-*`) exports are also available - see the docs for the full component list.

## Docs

Full guides for props, events, ads, captions, quality, theming, headless controls, and web component usage: **https://munsonlabs.github.io/packages/video-player/getting-started/introduction**
