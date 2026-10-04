<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { VideoPlayer, type CustomAction, type PlayerHandle } from '@munsonlabs/video-player'
import { ReelPicker, setPickerDefaults, type ReelErrorDetail, type ReelExportDetail } from '@munsonlabs/reel/vue'

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'

/** This demo's own files, served from its public/ folder. */
const media = (name: string) => new URL(`${import.meta.env.BASE_URL}media/${name}`, location.href).href

/**
 * What the demo can clip, picked with `?source=` so a reload (or a deep link back to a moment) opens
 * the same one; the clock is the default. Only the clock comes with captions of its own, two WebVTT
 * files, English and French, given by URL to the page's player and the picker alike. The Apple stream
 * brings subtitle renditions in its HLS master playlist, which the picker lists itself; Big Buck Bunny
 * has none.
 */
const sources = {
  clock: {
    label: 'The clock (MP4 with English and French captions)',
    src: media('count-720p.mp4'),
    title: 'The clock that never stops',
    standfirst:
      'Twelve seconds of a drawn clock, a sweeping marker and a rising tone, with captions in two languages, English and French, as WebVTT files.',
    // The same list for the page's player (its `tracks`) and the picker (its `captions`), which fetches them itself.
    tracks: [
      { src: media('clock.en.vtt'), kind: 'captions', srclang: 'en', label: 'English' },
      { src: media('clock.fr.vtt'), kind: 'captions', srclang: 'fr', label: 'Français' },
    ],
  },
  bunny: {
    label: 'Big Buck Bunny (HLS from Mux, five variants, no subtitles)',
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    title: 'Big Buck Bunny',
    standfirst:
      'Ten minutes of HLS in five variants, 240p to 1080p. The filmstrip reads the 240p one; the clip reads the smallest variant that fills it.',
    tracks: [],
  },
  bipbop: {
    label: 'Bip-bop (HLS from Apple, with English subtitles)',
    src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    title: 'Bip-bop',
    standfirst:
      'Apple’s fMP4 test stream. Its master playlist declares an English subtitles rendition, which the picker offers in its Captions menu.',
    tracks: [],
  },
} as const
type SourceId = keyof typeof sources

const requested = new URLSearchParams(location.search).get('source')
// The default is the clock, the one source with captions of its own to burn in.
const sourceId: SourceId = requested && requested in sources ? (requested as SourceId) : 'clock'
const source = sources[sourceId]
const src = source.src
const tracks = [...source.tracks]
const origin = { url: location.href.split('#')[0], title: source.title, publisher: 'Reel demo', player: 'article' }

/** Switching sources reloads the page with `?source=`, keeping any `#ml-t=` deep link out of it. */
function switchSource(event: Event): void {
  const url = new URL(location.href)
  url.searchParams.set('source', (event.target as HTMLSelectElement).value)
  url.hash = ''
  location.href = url.href
}

/**
 * Brand every clip: the logo (served from this demo's public/) is stamped in the top-right corner of
 * the clip, clear of the phone apps' buttons, and heads the end card. The card's call to action is a
 * readable address; a real site would leave it to default to the article's own. The demo lives on
 * localhost, so it stands in a publisher's article address; the deep link still points back here.
 */
setPickerDefaults({
  logo: `${import.meta.env.BASE_URL}logo.svg`,
  stamp: { position: 'top-right' },
  displayUrl: `acme.news/2026/10/${source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
})

const player = ref<PlayerHandle>()
const action = shallowRef<CustomAction | null>(null)
const unavailable = ref('')
const open = ref(false)
const clip = shallowRef<{ url: string; link: string | null; hash: string; name: string } | null>(null)
const notice = ref('')

/** Offer "Clip this" only when this browser can clip this source; otherwise say why. */
onMounted(async () => {
  const { canClip } = await import('@munsonlabs/reel')
  const check = await canClip(src)
  if (check.ok) {
    action.value = { icon: scissors, label: 'Clip this', onClick: openPicker }
  } else {
    unavailable.value = check.message
  }
})

function openPicker(): void {
  open.value = true
}

/**
 * Non-fatal problems arrive as error events with fatal: false: a logo that would not load, thumbnails
 * that could not be made, a preview the player could not play, captions that would not load, sound
 * this browser cannot write as AAC.
 */
function onError(detail: ReelErrorDetail): void {
  notice.value = detail.fatal ? '' : detail.message
}

function onExport(detail: ReelExportDetail): void {
  if (clip.value) URL.revokeObjectURL(clip.value.url)
  clip.value = {
    url: URL.createObjectURL(detail.blob),
    link: detail.link,
    hash: detail.link ? new URL(detail.link).hash : '',
    name: `${sourceId}-${detail.start}-${detail.end}.mp4`,
  }
}

/** Following the clip's own link back: the player answers the hash change and seeks. */
function backToMoment(link: string): void {
  location.hash = new URL(link, location.href).hash
}
</script>

<template>
  <article class="article">
    <p class="kicker">Reel demo · Experimental</p>
    <h1>{{ source.title }}</h1>
    <p class="standfirst">
      {{ source.standfirst }} Press the scissors in the player (or the button below) to cut a vertical clip of any moment, with captions and an end
      card, entirely in your browser.
    </p>

    <label class="source">
      Video
      <select :value="sourceId" @change="switchSource">
        <option v-for="(entry, id) in sources" :key="id" :value="id">{{ entry.label }}</option>
      </select>
    </label>

    <VideoPlayer ref="player" :src="src" :tracks="tracks" :action="action" :label="source.title" deep-link="article" deep-link-end="loop" />
    <ReelPicker v-model:open="open" :player="player" :source="src" :origin="origin" @export="onExport" @error="onError" />

    <div class="toolbar">
      <button type="button" class="clip" :disabled="!action" @click="openPicker">Clip this</button>
      <span v-if="unavailable" class="note">Clipping is not available here: {{ unavailable }}</span>
      <span v-else class="note">Reel and Mediabunny load when the picker opens.</span>
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
      The player is <code>@munsonlabs/video-player</code> with <code>deep-link</code> on, so a link ending in
      <code>#ml-t=4,9&amp;ml-player=article</code> opens this page scrolled to it, at 0:04, looping the clipped range. The scissors are its custom
      <code>action</code>, offered only after <code>canClip()</code> says yes.
    </p>
    <p>
      The editor is reel's <code>ReelPicker</code>, inline under the player it clips: the player itself is the preview. Opening pauses it on the
      moment, loops the range you pick through the player's <code>setClipRange()</code>, which jumps back within about a frame of the end, and draws
      the 9:16 window over the picture; drag the window to reframe. The filmstrip's playhead moves with every frame, and clicking inside the
      highlighted range jumps the player there. Everything happens on this device with WebCodecs: the clip is decoded, cropped to the window,
      captioned, stamped with the logo in a corner the phone apps leave clear, given an end card with the address to visit, and encoded to MP4. After
      exporting, <em>Copy caption with link</em> puts a ready-to-post caption, the title and the link back to the moment, on the clipboard.
    </p>
    <p>
      The clock's captions are two WebVTT files served next to this page, <code>media/clock.en.vtt</code> and <code>media/clock.fr.vtt</code>, the
      player's own <code>tracks</code>. The captions you have on in the player are the ones burned in: reel reads their cues straight from the
      player's <code>&lt;video&gt;</code>, no second fetch, and draws them inside the crop window exactly as the clip will have them, with its own
      painter laid out at the clip's size: white bold text on a dark box near the bottom, a longer caption (the clock's fifth) wrapping onto more
      lines, never losing a word. Turn captions off in the player and the clip has none.
    </p>
    <p>
      With an HLS source the player plays it (hls.js where the browser has no HLS of its own, natively in Safari), its subtitle renditions become the
      player's caption tracks and reel matches the one on show to the stream's, fetching only the WebVTT segments the clip needs. The filmstrip is
      built from keyframes of the smallest variant that fills a thumbnail and the export reads the smallest variant that covers the clip. One opening
      reads the stream's playlists once, shared by the check, the filmstrip, the caption list and the export. The player's quality setting changes
      playback only; the clip is always cut from the source.
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
