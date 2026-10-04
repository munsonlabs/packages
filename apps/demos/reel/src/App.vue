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
const tracks = [
  { src: media('clock.en.vtt'), kind: 'captions', srclang: 'en', label: 'English' },
  { src: media('clock.fr.vtt'), kind: 'captions', srclang: 'fr', label: 'Français' },
] as const
const LENGTH = 10
/**
 * Where a clip comes from: this page, so the link reel writes into the clip comes back to the player
 * named `article`, at the moment that was clipped.
 */
const origin = { url: location.href.split('#')[0], title: 'The clock that never stops', publisher: 'Reel demo', player: 'article' }

/**
 * Brand every clip: the logo (served from this demo's public/) is stamped in the top-right corner of
 * the clip, clear of the phone apps' buttons, and heads the end card. The card's call to action is a
 * readable address; the demo lives on localhost, so it stands in a publisher's article address.
 */
const logo = `${import.meta.env.BASE_URL}logo.svg`
const displayUrl = 'acme.news/2026/10/the-clock-that-never-stops'
const withCard = ref(true)
const withLogo = ref(true)

const player = ref<PlayerHandle>()
const action = shallowRef<CustomAction | null>(null)
const unavailable = ref('')
const progress = ref<number | null>(null)
const captions = ref<string>(tracks[0].src)
const clip = shallowRef<{ url: string; name: string; link: string; hash: string } | null>(null)
const notice = ref('')

onMounted(async () => {
  const { canClip } = await import('@munsonlabs/reel')
  const check = await canClip(src)
  if (check.ok) {
    action.value = { icon: scissors, label: 'Clip this', onClick: () => void clipThis() }
  } else {
    unavailable.value = check.message
  }
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
    const { clipLink, createClip } = await import('@munsonlabs/reel')
    const blob = await createClip({
      source: src,
      start,
      end,
      crop: { aspect: '9:16' },
      captions: captions.value ? { cues: captions.value } : undefined,
      // The origin goes into the MP4's metadata: title, publisher and the deep link back to this moment.
      origin,
      endCard: withCard.value ? { logo, displayUrl } : undefined,
      stamp: withLogo.value ? { logo, position: 'top-right' } : undefined,
      onProgress: (fraction) => (progress.value = fraction),
      onWarning: (warning) => (notice.value = warning.message),
    })
    const link = clipLink(origin, start, end)
    if (clip.value) URL.revokeObjectURL(clip.value.url)
    clip.value = { url: URL.createObjectURL(blob), name: `clock-${start.toFixed(1)}-${end.toFixed(1)}.mp4`, link, hash: new URL(link).hash }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : String(error)
  } finally {
    progress.value = null
  }
}

/**
 * Following the clip's own link back: the player answers the hash change and seeks.
 */
function backToMoment(link: string): void {
  location.hash = new URL(link, location.href).hash
}
</script>

<template>
  <article class="article">
    <p class="kicker">Reel demo · Experimental</p>
    <h1>The clock that never stops</h1>
    <p class="standfirst">
      Twelve seconds of a drawn clock, a sweeping marker and a rising tone, with captions in two languages, English and French, as WebVTT files. Press
      the scissors in the player (or the button below) to cut a vertical clip of the moment you are watching, entirely in your browser.
    </p>

    <VideoPlayer
      ref="player"
      :src="src"
      :tracks="[...tracks]"
      :action="action"
      label="The clock that never stops"
      deep-link="article"
      deep-link-end="loop"
    />

    <div class="toolbar">
      <button type="button" class="clip" :disabled="!action || progress !== null" @click="clipThis">Clip this</button>
      <label class="source">
        Burn in
        <select v-model="captions">
          <option v-for="track in tracks" :key="track.src" :value="track.src">{{ track.label }}</option>
          <option value="">No captions</option>
        </select>
      </label>
      <label class="source"><input v-model="withCard" type="checkbox" /> End card</label>
      <label class="source"><input v-model="withLogo" type="checkbox" /> Logo on the clip</label>
      <span v-if="unavailable" class="note">Clipping is not available here: {{ unavailable }}</span>
      <span v-else-if="progress !== null" class="note">Exporting… {{ Math.round(progress * 100) }}%</span>
    </div>

    <section v-if="clip" class="result" aria-live="polite">
      <h2>Your clip</h2>
      <p v-if="notice" class="note">{{ notice }}</p>
      <video :src="clip.url" controls playsinline />
      <p>
        <a :href="clip.url" :download="clip.name">Download {{ clip.name }}</a>
        <template v-if="clip.link">
          · <a :href="clip.link" @click.prevent="backToMoment(clip.link)">Back to this moment</a>
          <code>{{ clip.hash }}</code>
        </template>
      </p>
    </section>

    <h2>How it works</h2>
    <p>
      The player is <code>@munsonlabs/video-player</code>; the scissors are its custom <code>action</code>, offered only after
      <code>canClip()</code> says this browser can clip this file. Pressing them takes ten seconds around the moment you are at and hands them to
      <code>createClip()</code>: the video is decoded with WebCodecs, cropped to 9:16 and encoded to an MP4 with H.264 video and AAC audio, all on
      this device. Nothing is uploaded.
    </p>
    <p>
      The clock's captions are two WebVTT files served next to this page, <code>media/clock.en.vtt</code> and <code>media/clock.fr.vtt</code>. The
      page's player shows them as its tracks; the clip gets the chosen file's URL as <code>captions.cues</code>, and reel fetches it and burns the
      cues inside the range into the picture: white bold text on a dark box near the bottom, a longer caption (the clock's fifth) wrapping onto more
      lines, never losing a word. A caption file that will not load leaves the clip without captions and says so, rather than failing it.
    </p>
    <p>
      The player has <code>deep-link="article"</code> on, so a link ending in <code>#ml-t=4,9&amp;ml-player=article</code> opens this page scrolled to
      it, at 0:04, looping the clipped range. That is the link <code>clipLink()</code> builds and <code>createClip()</code> writes into the clip's
      metadata, with the title and publisher from <code>origin</code>, so a clip always points back at its moment.
    </p>
    <p>
      With <em>End card</em> on, the clip ends with a silent card faded in over its last frame: the logo, the publisher, the headline and the
      article's address in large type. With <em>Logo on the clip</em>, the same logo is stamped in the top-right corner of every frame, in a spot
      TikTok, Reels and Shorts leave clear. A logo that cannot be loaded is left out with a note, never failing the clip.
    </p>
    <p>Try a link: <a href="#ml-t=4,9" @click.prevent="backToMoment(`${origin.url}#ml-t=4,9&ml-player=article`)">0:04 to 0:09</a>.</p>
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
