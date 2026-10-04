<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { VideoPlayer, type CustomAction, type PlayerHandle } from '@munsonlabs/video-player'

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'
/**
 * This demo's own files, served from its public/ folder.
 */
const media = (name: string) => new URL(`${import.meta.env.BASE_URL}media/${name}`, location.href).href

const src = media('count-720p.mp4')
/**
 * A clip is ten seconds that start two seconds before the moment the viewer is at, held inside the video.
 */
const LENGTH = 10

const player = ref<PlayerHandle>()
const action = shallowRef<CustomAction | null>(null)
const progress = ref<number | null>(null)
const clip = shallowRef<{ url: string; name: string } | null>(null)
const notice = ref('')

onMounted(() => {
  action.value = { icon: scissors, label: 'Clip this', onClick: () => void clipThis() }
})

async function clipThis(): Promise<void> {
  const handle = player.value
  if (!handle || progress.value !== null) return
  handle.pause()
  const start = Math.max(0, Math.min(handle.currentTime - 2, handle.duration - LENGTH))
  const end = Math.min(handle.duration, start + LENGTH)
  progress.value = 0
  notice.value = ''
  try {
    const { createClip } = await import('@munsonlabs/reel')
    const blob = await createClip({
      source: src,
      start,
      end,
      // A 9:16 window at the crop's own resolution, centred; `focus` moves it.
      crop: { aspect: '9:16' },
      onProgress: (fraction) => (progress.value = fraction),
      onWarning: (warning) => (notice.value = warning.message),
    })
    if (clip.value) URL.revokeObjectURL(clip.value.url)
    clip.value = { url: URL.createObjectURL(blob), name: `clock-${start.toFixed(1)}-${end.toFixed(1)}.mp4` }
  } catch (error) {
    // A source that cannot be clipped rejects with a ClipError whose reason is a stable code.
    notice.value = error instanceof Error ? error.message : String(error)
  } finally {
    progress.value = null
  }
}
</script>

<template>
  <article class="article">
    <p class="kicker">Reel demo · Experimental</p>
    <h1>The clock that never stops</h1>
    <p class="standfirst">
      Twelve seconds of a drawn clock, a sweeping marker and a rising tone. Press the scissors in the player (or the button below) to cut a vertical
      clip of the moment you are watching, entirely in your browser.
    </p>

    <VideoPlayer ref="player" :src="src" :action="action" label="The clock that never stops" />

    <div class="toolbar">
      <button type="button" class="clip" :disabled="!action || progress !== null" @click="clipThis">Clip this</button>
      <span v-if="progress !== null" class="note">Exporting… {{ Math.round(progress * 100) }}%</span>
      <span v-else class="note">Reel and Mediabunny load when you press it.</span>
    </div>

    <section v-if="clip" class="result" aria-live="polite">
      <h2>Your clip</h2>
      <p v-if="notice" class="note">{{ notice }}</p>
      <video :src="clip.url" controls playsinline />
      <p>
        <a :href="clip.url" :download="clip.name">Download {{ clip.name }}</a>
      </p>
    </section>

    <h2>How it works</h2>
    <p>
      The player is <code>@munsonlabs/video-player</code>; the scissors are its custom <code>action</code>. Pressing them takes ten seconds around the
      moment you are at and hands them to <code>createClip()</code>: the video is decoded with WebCodecs, cropped to 9:16 and encoded to an MP4 with
      H.264 video and AAC audio, all on this device. Nothing is uploaded. A source that cannot be clipped (an embed, DRM, a file without CORS) rejects
      with a <code>ClipError</code> and its reason shows under the clip.
    </p>
    <p>
      The crop is a 9:16 window planned by <code>planCrop()</code>, centred on a focus point and clamped to the frame, at the window's own resolution
      so nothing is upscaled. Each frame is drawn offset and scaled so the canvas edges cut it, which is correct in every engine.
    </p>
  </article>
</template>

<style>
:root {
  color-scheme: light;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  background: #f6f4ee;
  color: #1f2328;
  --ml-video-accent: #2e9460;
}

body {
  margin: 0;
}

.article {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 120px;
  line-height: 1.6;
}

.kicker {
  margin: 0;
  color: #2e9460;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

h1 {
  margin: 0.2em 0 0.3em;
  font-size: clamp(2rem, 5vw, 3rem);
  line-height: 1.1;
}

.standfirst {
  font-size: 1.15rem;
  color: #4b5560;
}

.source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-weight: 600;
}

.source select {
  font: inherit;
  font-weight: 400;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cfc9b8;
  background: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 16px 0 32px;
}

.clip {
  font: inherit;
  font-weight: 600;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #e2a32e;
  color: #1b1405;
  cursor: pointer;
}

.clip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.note {
  color: #6b7480;
  font-size: 0.9rem;
}

.result video {
  max-height: 420px;
  border-radius: 10px;
  background: #000;
}

code {
  font-size: 0.9em;
  background: #ece8dc;
  padding: 0.1em 0.3em;
  border-radius: 4px;
}
</style>
