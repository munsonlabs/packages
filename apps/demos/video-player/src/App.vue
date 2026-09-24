<script setup lang="ts">
import { ref } from 'vue'
import { HideMarker } from '@munsonlabs/video-player'
import EventLogPopover from './components/EventLogPopover.vue'
import SettingsPopover from './components/SettingsPopover.vue'
import VideoPanel from './components/VideoPanel.vue'
import PinnedPlayerPanel from './components/PinnedPlayerPanel.vue'
import VariationsPanel from './components/VariationsPanel.vue'
import CustomControlsPanel from './components/CustomControlsPanel.vue'
import TranscriptPanel from './components/TranscriptPanel.vue'
import ExposedPlayerPanel from './components/ExposedPlayerPanel.vue'
import RecyclerReelPage from './components/RecyclerReelPage.vue'
import { videos } from './data/demoVideos'
import { useDemoSettings } from './composables/useDemoSettings'

const { showStage } = useDemoSettings()
const showReelPage = ref(false)
</script>

<template>
  <RecyclerReelPage v-if="showReelPage" @back="showReelPage = false" />

  <div v-else class="app">
    <div class="glow" />

    <header class="hero">
      <div class="header-action-group">
        <div class="header-action header-action--left">
          <EventLogPopover />
        </div>
        <div class="header-action header-action--right">
          <SettingsPopover />
        </div>
      </div>

      <div class="hero__inner">
        <h1 class="hero__title">Showcase</h1>
        <p class="hero__subtitle">YouTube · Vimeo · Dailymotion · Brightcove · JW Player · HLS · plain MP4, one component.</p>
      </div>
    </header>

    <main>
      <VideoPanel heading="Videos" :videos="videos" :show-stage="showStage" />
      <VariationsPanel />
      <PinnedPlayerPanel />
      <!-- <CustomControlsPanel /> -->
      <section class="panel">
        <h2 class="panel__heading"><span class="panel__heading-dot" />Recycler Reel</h2>
        <p class="panel__description">
          A TikTok-style vertical feed, scroll-snapped - but only 3 <code>VideoPlayer</code> instances ever exist in the DOM at once. As you scroll
          past one, its slot's video is swapped for whatever comes next and the scroll position is silently reset, rather than mounting all videos up
          front.
        </p>
        <button class="reel-launch-btn" @click="showReelPage = true">Open Recycler Reel →</button>
      </section>
      <TranscriptPanel />
      <ExposedPlayerPanel />
      <HideMarker class="demo-hide-marker" />
    </main>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --accent: #3b82f6;
  --accent-light: #60a5fa;
  --accent-soft: #93c5fd;
  --surface: rgba(255, 255, 255, 0.04);
  --surface-hover: rgba(255, 255, 255, 0.07);
  --border: rgba(148, 163, 184, 0.16);
  --border-strong: rgba(148, 163, 184, 0.28);
  --text: #f1f5f9;
  --text-dim: #94a3b8;
  --text-faint: #64748b;
}

body {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    sans-serif;
  min-height: 100dvh;
  background: #05070d;
  color: var(--text);
}

.app {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
  padding: 3rem 1.25rem 4rem;
}

.glow {
  position: fixed;
  top: -20%;
  left: 50%;
  translate: -50% 0;
  width: 1200px;
  height: 700px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%);
  pointer-events: none;
  z-index: -1;
}

header {
  position: relative;
}

/*
 * No transform-affecting animation here: header is the ancestor of the popovers, which switch to
 * position: fixed on mobile (see the media query below). A persisted transform from an animation
 * with fill-mode: both creates a containing block for position: fixed descendants, same as the
 * earlier .panel/backdrop-filter bug, confining the popover inside header's box instead of the
 * viewport.
 */
.hero {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-bottom: 3rem;
  position: relative;
}

.hero__inner {
  text-align: center;
}

.hero__eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent-soft);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  padding: 0.3rem 0.9rem;
  margin-bottom: 1rem;
}

.hero__title {
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}

.hero__title-accent {
  background: linear-gradient(120deg, var(--accent-light), var(--accent-soft));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.hero__subtitle {
  color: var(--text-dim);
  max-width: 90%;
  margin: 0.6rem auto 0 auto;
  font-size: 0.95rem;
}

/* Invisible to layout on desktop — its two children keep positioning themselves against header
   (the nearest positioned ancestor), completely unaffected by this wrapper existing. Only takes
   over as a real flex row on mobile (see the media query below), so the group can be kept
   close together there instead of pinned to opposite screen edges. */
.header-action-group {
  display: contents;
}

.header-action {
  position: absolute;
  top: 0;
}
.header-action--left {
  left: 0;
}
.header-action--right {
  right: 0;
}

.popover-wrap {
  position: relative;
}

/* Fixed height, not content-driven — otherwise the badge (18px tall) makes the button a couple of
   pixels taller than it is with no events logged yet, since it's the tallest inline-flex child. */
.popover-btn {
  position: relative;
  z-index: 12;
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  gap: 0.45rem;
  background: var(--surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 1rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}
.popover-btn:hover {
  border-color: var(--border-strong);
  color: var(--text);
  background: var(--surface-hover);
}
.popover-btn--active {
  border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  color: var(--accent-soft);
}

.popover-btn__icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.popover-btn__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent-soft);
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(3, 6, 12, 0.6);
  backdrop-filter: blur(2px);
}

/*
 * Centered as a fixed-position modal (not anchored to the trigger button's edge) on every screen
 * size, for consistency between desktop and mobile and because there's simply more to show now
 * (Settings' groups, Events' Events/Prebid tabs) than a small anchored dropdown comfortably fits.
 */
.popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem;
  background: #0c111d;
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.02) inset;
  width: calc(100vw - 2rem);
  max-width: 460px;
  max-height: calc(100dvh - 3rem);
  overflow-y: auto;
}

.popover--wide {
  max-width: 640px;
}

.popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.log-tabs {
  display: flex;
  gap: 0.3rem;
}

.log-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  color: var(--text-faint);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.log-tab:hover {
  color: var(--text);
}
.log-tab--active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--accent-soft);
}

.log-tab__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 35%, transparent);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.settings-group + .settings-group {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.popover-group__heading {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-faint);
  padding: 0 0.5rem 0.3rem;
}

main {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: transparent;
  border: none;
  border-radius: 8px;
  padding: 0.4rem 0.5rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}
.toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.toggle--active {
  color: var(--accent-soft);
}

.toggle--cycle {
  justify-content: space-between;
}

.toggle__value {
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.toggle__track {
  position: relative;
  width: 32px;
  height: 18px;
  background: #334155;
  border-radius: 9px;
  flex-shrink: 0;
  transition: background 0.2s;
}
.toggle--active .toggle__track {
  background: var(--accent);
}

.toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.toggle--active .toggle__thumb {
  transform: translateX(14px);
}

.theme {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.theme__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem 0.2rem;
}

.theme__reset {
  background: transparent;
  border: none;
  color: var(--text-faint);
  font-size: 0.75rem;
  cursor: pointer;
}
.theme__reset:hover {
  color: var(--text);
}

.theme__row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.25rem 0.5rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 8px;
}
.theme__row:hover {
  background: var(--surface-hover);
}

.theme__swatch {
  width: 32px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}
.theme__swatch::-webkit-color-swatch-wrapper {
  padding: 1px;
}
.theme__swatch::-webkit-color-swatch {
  border: none;
  border-radius: 3px;
}

.theme__range {
  width: 32px;
  flex-shrink: 0;
  accent-color: var(--accent);
}

/*
 * No backdrop-filter and no transform-affecting animation directly on .panel: either one creates
 * a new containing block for position: fixed descendants (VideoStage's pinned/minified corner-pip
 * mode relies on position: fixed relative to the viewport), which traps it inside .panel's box
 * instead of floating over the page. The glass background/blur lives on ::before (a paint sibling,
 * not an ancestor) instead.
 */
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel__heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin-bottom: 1rem;
}

.panel__description {
  margin: -0.5rem 0 1.25rem;
  color: var(--text-dim);
  font-size: 0.85rem;
  line-height: 1.5;
}

.ml-video-hide-marker.demo-hide-marker {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 3rem;
  justify-content: center;
  border: 2px dashed var(--border-strong);
  border-radius: 8px;
  color: var(--text-faint);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.ml-video-hide-marker.demo-hide-marker::before {
  content: 'HideMarker — stage tucks away while this is in view';
}

.reel-launch-btn {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.65rem 1.4rem;
  cursor: pointer;
  transition: filter 0.15s;
}
.reel-launch-btn:hover {
  filter: brightness(1.1);
}

.panel__heading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent);
  flex-shrink: 0;
}
.panel__heading-dot--ad {
  background: #fb923c;
  box-shadow: 0 0 10px color-mix(in srgb, #fb923c 70%, transparent);
}
.panel__heading-dot--prebid {
  background: #a78bfa;
  box-shadow: 0 0 10px color-mix(in srgb, #a78bfa 70%, transparent);
}
.panel__heading-dot--captions {
  background: #2dd4bf;
  box-shadow: 0 0 10px color-mix(in srgb, #2dd4bf 70%, transparent);
}
.panel__heading-dot--quality {
  background: #f472b6;
  box-shadow: 0 0 10px color-mix(in srgb, #f472b6 70%, transparent);
}

.playlist__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  align-items: flex-start;
  margin-top: 1.25rem;
}
.playlist__grid--compact {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.video-card {
  overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.25);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.video-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
}

.log__type--save {
  color: #f472b6;
}
.log__type--unsave {
  color: var(--text-dim);
}

.log {
  background: #05070d;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.log__chrome {
  display: flex;
  gap: 6px;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border);
}
.log__chrome span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--border-strong);
}

.log__body {
  padding: 0.75rem;
  height: 220px;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.log__empty {
  color: var(--text-faint);
  padding: 2px 0;
}

.log__entry {
  display: flex;
  gap: 0.75rem;
  padding: 3px 6px;
  border-radius: 5px;
}
.log__entry:nth-child(odd) {
  background: rgba(255, 255, 255, 0.02);
}

.log__time {
  color: var(--text-faint);
  flex-shrink: 0;
}
.log__type {
  font-weight: 700;
  flex-shrink: 0;
  min-width: 72px;
}
.log__type--play {
  color: #4ade80;
}
.log__type--pause {
  color: #facc15;
}
.log__type--ended {
  color: #f87171;
}
.log__type--seeked {
  color: #60a5fa;
}
.log__type--error {
  color: #f87171;
}
.log__type--adstart {
  color: #fb923c;
}
.log__type--adend {
  color: #a78bfa;
}
.log__type--volumechange {
  color: var(--text-dim);
}
.log__type--ratechange {
  color: var(--text-dim);
}
.log__type--captionchange {
  color: #2dd4bf;
}
.log__type--qualitychange {
  color: #f472b6;
}
.log__type--log {
  color: var(--text-dim);
}
.log__type--info {
  color: #60a5fa;
}
.log__type--warn {
  color: #facc15;
}
.log__entry--prebid {
  flex-wrap: wrap;
}
.log__entry--prebid .log__src {
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  flex: 1;
}
.log__data {
  color: var(--text-faint);
  flex-shrink: 0;
  min-width: 80px;
  font-variant-numeric: tabular-nums;
}
.log__src {
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 6px;
  vertical-align: middle;
  color: #fff;
}

.badge--youtube {
  background: #ff0000;
}
.badge--vimeo {
  background: #1ab7ea;
}
.badge--dailymotion {
  background: #0066dc;
}
.badge--jwplayer {
  background: #e5701a;
}
.badge--brightcove {
  background: #3d9970;
}
.badge--html5 {
  background: #e44d26;
}

@media (max-width: 640px) {
  /*
   * .header-action is position: absolute so Events/Settings can sit at the top-left/top-right of
   * the centered hero text on desktop without affecting layout flow. On narrow screens the hero
   * title wraps to 2-3 lines and grows tall enough to collide with them, so drop out of the
   * overlay entirely: title first, then Events and Settings together as a tight row below it
   * (not stacked on top of each other, not pinned to opposite screen edges).
   */
  .hero {
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .hero__inner {
    order: -1;
  }

  .header-action-group {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
  }

  .header-action {
    position: static;
  }

  .popover-btn {
    height: 2.6rem;
    padding: 0 1.1rem;
  }

  .toggle {
    padding: 0.6rem 0.5rem;
    font-size: 0.9rem;
  }

  .log__entry {
    flex-wrap: wrap;
  }
}
</style>
