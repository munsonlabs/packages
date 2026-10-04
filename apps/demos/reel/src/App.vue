<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { VideoPlayer, type CustomAction, type PlayerHandle } from '@munsonlabs/video-player'
import type { CaptionTrackInfo, PlaylistCache } from '@munsonlabs/reel'

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'
/**
 * This demo's own files, served from its public/ folder.
 */
const media = (name: string) => new URL(`${import.meta.env.BASE_URL}media/${name}`, location.href).href

/**
 * What the demo can clip, picked with `?source=` so a reload (or a deep link back to a moment) opens
 * the same one; the clock is the default. Only the clock comes with captions of its own, two WebVTT
 * files, English and French, given by URL to the page's player and the clip alike. The Apple stream
 * brings subtitle renditions in its HLS master playlist, which reel lists itself; Big Buck Bunny has
 * none.
 */
const sources = {
  clock: {
    label: 'The clock (MP4 with English and French captions)',
    src: media('count-720p.mp4'),
    title: 'The clock that never stops',
    standfirst:
      'Twelve seconds of a drawn clock, a sweeping marker and a rising tone, with captions in two languages, English and French, as WebVTT files.',
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
    standfirst: 'Apple’s fMP4 test stream. Its master playlist declares an English subtitles rendition, which reel lists and can burn in.',
    tracks: [],
  },
} as const
type SourceId = keyof typeof sources

const requested = new URLSearchParams(location.search).get('source')
const sourceId: SourceId = requested && requested in sources ? (requested as SourceId) : 'clock'
const source = sources[sourceId]
const src = source.src
const tracks = [...source.tracks]
const LENGTH = 10
const origin = { url: location.href.split('#')[0], title: source.title, publisher: 'Reel demo', player: 'article' }
const logo = `${import.meta.env.BASE_URL}logo.svg`
const displayUrl = `acme.news/2026/10/${source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

/**
 * Switching sources reloads the page with `?source=`, keeping any `#ml-t=` deep link out of it.
 */
function switchSource(event: Event): void {
  const url = new URL(location.href)
  url.searchParams.set('source', (event.target as HTMLSelectElement).value)
  url.hash = ''
  location.href = url.href
}

const withCard = ref(true)
const withLogo = ref(true)
const player = ref<PlayerHandle>()
const strip = ref<HTMLCanvasElement | null>(null)
const TILES = 10
const tileTimes: number[] = []
const action = shallowRef<CustomAction | null>(null)
const unavailable = ref('')
const progress = ref<number | null>(null)
/**
 * The caption tracks reel found: the passed WebVTT files (`passed:<n>`) and, for an HLS stream, the
 * subtitle renditions in its master playlist (`hls:<n>`).
 */
const captionTracks = shallowRef<CaptionTrackInfo[]>([])
const captions = ref('')
const clip = shallowRef<{ url: string; name: string; link: string; hash: string } | null>(null)
const notice = ref('')
/**
 * One playlist cache for everything this page asks reel about the source, so an HLS master playlist is
 * read once, not once per call.
 */
let playlists: PlaylistCache | null = null

onMounted(async () => {
  const { canClip, createPlaylistCache, createStoryboard, listCaptionTracks } = await import('@munsonlabs/reel')
  playlists = createPlaylistCache()
  const check = await canClip(src, { cache: playlists })
  if (!check.ok) {
    unavailable.value = check.message
    return
  }
  action.value = { icon: scissors, label: 'Clip this', onClick: () => void clipThis() }
  captionTracks.value = await listCaptionTracks(src, { tracks, cache: playlists })
  captions.value = captionTracks.value.find((track) => track.default)?.id ?? captionTracks.value[0]?.id ?? ''
  const canvas = strip.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const tile = canvas.width / TILES
  await createStoryboard({
    source: src,
    interval: check.info.duration / TILES,
    tileWidth: 160,
    columns: TILES,
    cache: playlists,
    onTile: (index, image, time) => {
      tileTimes[index] = time
      ctx.drawImage(image, index * tile, 0, tile, canvas.height)
    },
  })
})

function seekTile(event: MouseEvent): void {
  const canvas = strip.value
  if (!canvas) return
  const box = canvas.getBoundingClientRect()
  const index = Math.min(TILES - 1, Math.floor(((event.clientX - box.left) / box.width) * TILES))
  const time = tileTimes[index]
  if (time !== undefined) player.value?.seek(time)
}

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
      // A track id from listCaptionTracks: a passed file, or an HLS rendition of which only the overlapping segments are fetched.
      captions: captions.value ? { track: captions.value, tracks } : undefined,
      origin,
      endCard: withCard.value ? { logo, displayUrl } : undefined,
      stamp: withLogo.value ? { logo, position: 'top-right' } : undefined,
      cache: playlists ?? undefined,
      onProgress: (fraction) => (progress.value = fraction),
      onWarning: (warning) => (notice.value = warning.message),
    })
    const link = clipLink(origin, start, end)
    if (clip.value) URL.revokeObjectURL(clip.value.url)
    clip.value = { url: URL.createObjectURL(blob), name: `${sourceId}-${start.toFixed(1)}-${end.toFixed(1)}.mp4`, link, hash: new URL(link).hash }
  } catch (error) {
    notice.value = error instanceof Error ? error.message : String(error)
  } finally {
    progress.value = null
  }
}

function backToMoment(link: string): void {
  location.hash = new URL(link, location.href).hash
}
</script>

<template>
  <article class="article">
    <p class="kicker">Reel demo · Experimental</p>
    <h1>{{ source.title }}</h1>
    <p class="standfirst">
      {{ source.standfirst }} Press the scissors in the player (or the button below) to cut a vertical clip of the moment you are watching, with
      captions and an end card, entirely in your browser.
    </p>

    <label class="source">
      Video
      <select :value="sourceId" @change="switchSource">
        <option v-for="(entry, id) in sources" :key="id" :value="id">{{ entry.label }}</option>
      </select>
    </label>

    <VideoPlayer ref="player" :src="src" :tracks="tracks" :action="action" :label="source.title" deep-link="article" deep-link-end="loop" />
    <canvas ref="strip" class="strip" width="1600" height="90" aria-label="Thumbnails; click to seek" @click="seekTile" />

    <div class="toolbar">
      <button type="button" class="clip" :disabled="!action || progress !== null" @click="clipThis">Clip this</button>
      <label class="source">
        Burn in
        <select v-model="captions">
          <option v-for="track in captionTracks" :key="track.id" :value="track.id">{{ track.label }}</option>
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
      The player is <code>@munsonlabs/video-player</code> with <code>deep-link="article"</code> on, so a link ending in
      <code>#ml-t=4,9&amp;ml-player=article</code> opens this page scrolled to it, at 0:04, looping the clipped range. The scissors are its custom
      <code>action</code>, offered only after <code>canClip()</code> says yes. Pressing them takes ten seconds around the moment you are at and hands
      them to <code>createClip()</code>: decoded with WebCodecs, cropped to 9:16, captioned, stamped, given an end card and encoded to MP4, all on
      this device.
    </p>
    <p>
      The clock's captions are two WebVTT files given by URL as one list to the page's player and to reel, which lists them beside any subtitle
      renditions an HLS master playlist declares (Apple's stream has an English one). The chosen track is burned in; for an HLS rendition only the
      WebVTT segments the clip overlaps are fetched.
    </p>
    <p>
      With an HLS source the player plays it (hls.js where the browser has no HLS of its own, natively in Safari), while the filmstrip is built from
      keyframes of the smallest variant that fills a thumbnail and the export reads the smallest variant that covers the clip. One
      <code>createPlaylistCache()</code> is shared by the check, the filmstrip, the caption list and the export, so the stream's playlists are read
      once.
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

.strip {
  display: block;
  width: 100%;
  height: 56px;
  margin: 8px 0 0;
  border-radius: 8px;
  background: #1f2328;
  cursor: pointer;
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
