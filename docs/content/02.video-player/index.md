---
title: Video Player
navigation:
  icon: i-lucide:play-circle
description: A standalone Vue 3 video player - native/HLS/DASH, YouTube/Vimeo/Dailymotion/Brightcove/JW Player embeds, IMA ads, and Prebid header bidding, behind one API.
---

`@munsonlabs/video-player` plays MP4/HLS/DASH, YouTube, Vimeo, Dailymotion, Brightcove, and JW Player behind one component API, with Google IMA ads and Prebid.js header bidding. Standalone - it shares no code with anything else in this repo.

## Ways to use it

| Form | What you get |
| --- | --- |
| Vue 3 | `VideoPlayer`, `VideoCard`, `VideoStage`, `VideoPlaceholder`, 13 headless controls - or `app.use(VideoPlayerPlugin)` for all of them |
| Web components | The same source as `<ml-video-*>` and `<ml-controls-*>` elements, for any framework or none |
| No-build / CDN | Import the `/element` bundle via an import map and drop tags into HTML |

Three bundles - `/element` (everything), `/element/core` (player tags), `/element/controls` (controls only) - each with a matching `/style*` entry point, so you ship only the CSS you render.

## Docs

| Page | Description |
| --- | --- |
| [Getting started](/video-player/getting-started) | Install, mount a video, read the `state-change` stream |
| [API reference](/video-player/api) | [Components](/video-player/api/components) · [props](/video-player/api/props) · [methods & state](/video-player/api/methods) · [events](/video-player/api/events) · [headless controls](/video-player/api/controls) |
| [Platforms](/video-player/features/platforms) | Every source it plays, and how detection works |
| [Playback](/video-player/features/playback) | Autoplay & audio, scroll-snap feeds, pinning, stage & playlists, transcripts |
| [Captions & quality](/video-player/features/captions-and-quality) | WebVTT tracks, HLS subtitle renditions, adaptive quality |
| [Ads](/video-player/features/ads) | IMA (VAST/VMAP), Prebid header bidding, ad macros |
| [Extensibility](/video-player/features/extensibility) | Custom HUDs, custom platforms, forwarding, theming |
