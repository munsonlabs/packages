<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { VideoPlayer, type PlayerHandle } from '@munsonlabs/video-player'
import { resolveMedia } from './helpers'
import { ThePlan } from './components'

const sources = {
  clock: {
    label: 'The clock (MP4 with captions)',
    src: resolveMedia('count-720p.mp4'),
    title: 'The clock that never stops',
    intro: 'Twelve seconds of a drawn clock, a sweeping marker and a rising tone, with WebVTT captions.',
    captions: resolveMedia('clock.en.vtt'),
  },
  bunny: {
    label: 'Big Buck Bunny (HLS, five variants)',
    src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    title: 'Big Buck Bunny',
    intro: 'Ten minutes of HLS in five variants, 240p to 1080p. The filmstrip reads a small one; the clip reads the smallest that fills it.',
    captions: undefined,
  },
} as const
type SourceId = keyof typeof sources

const requested = new URLSearchParams(location.search).get('source')
const sourceId: SourceId = requested && requested in sources ? (requested as SourceId) : 'clock'
const { src, title, intro, captions } = sources[sourceId]
const tracks = captions ? [{ src: captions, kind: 'captions', srclang: 'en', label: 'English' } as const] : []
const LENGTH = 5
const CROP = { aspect: '9:16' } as const
const origin = { url: location.href.split('#')[0], title, publisher: 'Splice demo', player: 'demo' }
const logo = resolveMedia('logo.svg')
const displayUrl = `acme.news/2026/10/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
const watermark = { text: 'Clipped from acme.news', position: 'bottom' } as const
const withCard = ref(true)
const withLogo = ref(true)
const player = ref<PlayerHandle>()
const strip = ref<HTMLCanvasElement | null>(null)
const THUMBNAILS = 10
const thumbnailTimes: number[] = []
const progress = ref<number | null>(null)
const clip = shallowRef<{ url: string; name: string; link: string; hash: string } | null>(null)
const notice = ref('')
const unavailable = ref('')

let controller: AbortController | null = null

function switchSource(event: Event): void {
  const url = new URL(location.href)
  url.searchParams.set('source', (event.target as HTMLSelectElement).value)
  url.hash = ''
  location.href = url.href
}

onMounted(async () => {
  const { canSplice, createThumbnails } = await import('@munsonlabs/splice')
  const check = await canSplice(src, { crop: CROP })
  const canvas = strip.value
  const ctx = canvas?.getContext('2d')

  if (!check.ok) unavailable.value = check.message
  if (!check.ok || !canvas || !ctx) return

  const tileWidth = canvas.width / THUMBNAILS
  await createThumbnails({
    source: src,
    count: THUMBNAILS,
    onThumbnail: (index, image, time) => {
      thumbnailTimes[index] = time
      ctx.drawImage(image, index * tileWidth, 0, tileWidth, canvas.height)
    },
  })
})

function seekThumbnail(event: MouseEvent): void {
  const canvas = strip.value
  if (!canvas) return

  const box = canvas.getBoundingClientRect()
  const index = Math.min(THUMBNAILS - 1, Math.floor(((event.clientX - box.left) / box.width) * THUMBNAILS))
  const time = thumbnailTimes[index]
  if (time !== undefined) player.value?.seek(time)
}

async function runSplice(): Promise<void> {
  const handle = player.value
  if (!handle || !(handle.duration > 0) || progress.value !== null) return
  handle.pause()
  const start = Math.max(0, Math.min(handle.currentTime, handle.duration - LENGTH))
  const end = Math.min(handle.duration, start + LENGTH)
  progress.value = 0
  notice.value = ''
  controller = new AbortController()

  try {
    const { createClipLink, createSplice } = await import('@munsonlabs/splice')
    const blob = await createSplice({
      source: src,
      start,
      end,
      crop: CROP,
      captions,
      origin,
      endCard: withCard.value ? { logo, displayUrl } : undefined,
      stamp: withLogo.value ? { logo, position: 'top-right' } : undefined,
      watermark,
      signal: controller.signal,
      onProgress: (fraction) => (progress.value = fraction),
      onWarning: (message) => (notice.value = message),
    })
    if (clip.value) URL.revokeObjectURL(clip.value.url)
    const link = createClipLink(origin, start, end)
    const hash = new URL(link).hash
    clip.value = { url: URL.createObjectURL(blob), name: `${sourceId}-${start.toFixed(1)}-${end.toFixed(1)}.mp4`, link, hash }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') notice.value = 'Splice cancelled.'
    else notice.value = error instanceof Error ? error.message : String(error)
  } finally {
    progress.value = null
    controller = null
  }
}

function backToMoment(link: string): void {
  location.hash = new URL(link).hash
}

function cancelSplice(): void {
  controller?.abort()
}
</script>

<template>
  <main>
    <h1>Splice Demo</h1>
    <p>{{ intro }} Press Run Splice to cut five vertical seconds from the moment you are watching, entirely in your browser.</p>

    <label class="source">
      Source
      <select :value="sourceId" @change="switchSource">
        <option v-for="(option, id) in sources" :key="id" :value="id">{{ option.label }}</option>
      </select>
    </label>

    <div class="player">
      <VideoPlayer ref="player" :src="src" :tracks="tracks" :label="title" deep-link="demo" deep-link-end="loop" />
      <canvas ref="strip" class="strip" width="1600" height="90" aria-label="Thumbnails; click to seek" @click="seekThumbnail" />
    </div>

    <div class="toolbar">
      <button v-if="progress === null" :disabled="!!unavailable" @click="runSplice">Run Splice</button>
      <button v-else @click="cancelSplice">Cancel ({{ Math.round(progress * 100) }}%)</button>
      <label><input v-model="withCard" type="checkbox" /> End card</label>
      <label><input v-model="withLogo" type="checkbox" /> Logo on the clip</label>
      <span v-if="unavailable" class="note">Splicing is not available here: {{ unavailable }}</span>
    </div>

    <p class="note" aria-live="polite">{{ notice }}</p>

    <section v-if="clip" class="result" aria-live="polite">
      <h2>Your clip</h2>
      <video :src="clip.url" controls playsinline />
      <p>
        <a :href="clip.url" :download="clip.name">Download {{ clip.name }}</a>
      </p>
      <p class="note">
        Its metadata links back to this moment:
        <a :href="clip.link" @click.prevent="backToMoment(clip.link)">{{ clip.hash }}</a>
      </p>
    </section>

    <h2>How it works</h2>
    <p>
      The player is <code>@munsonlabs/video-player</code>. Run Splice is offered once <code>canSplice()</code> says this browser can splice the file,
      and hands five seconds of it to <code>createSplice()</code>: the video is decoded with WebCodecs, cropped to 9:16, has its captions burned in
      and is encoded to an MP4 with H.264 video and AAC audio, all on this device. Nothing is uploaded. Cancelling aborts it through an
      <code>AbortSignal</code>. With an <code>origin</code>, the clip's MP4 metadata carries the page's title, publisher and a
      <code>#ml-t=</code> link back to the clipped moment. The player has <code>deep-link="demo"</code> on, so following that link seeks to the range
      and loops it. The core API is framework agnostic, built on web standards and Mediabunny. The strip under the player comes from
      <code>createThumbnails()</code>: ten keyframes, each painted as it lands; click one to seek there.
    </p>
    <p>
      With <em>End card</em> on, the clip ends with a silent card faded in over its last frame: the logo, the publisher, the title and the article's
      address. With <em>Logo on the clip</em>, the logo is stamped in the top-right corner of every frame, in a spot TikTok, Reels and Shorts leave
      clear. A band across the bottom of every frame names the site it came from. A logo that can't be loaded is left out with a note, never failing
      the clip.
    </p>

    <ThePlan />
  </main>
</template>

<style scoped>
:global(:root) {
  color-scheme: dark;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}

main {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 120px;
  line-height: 1.6;
}

h2 {
  margin-top: 36px;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.player {
  margin: 20px 0;
}

.strip {
  display: block;
  width: 100%;
  height: 56px;
  margin-top: 8px;
  border-radius: 8px;
  background: #1f2328;
  cursor: pointer;
}

.source {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.note {
  min-height: 1.6em;
  color: #9aa3ad;
  font-size: 0.9rem;
}

.result video {
  display: block;
  max-width: 100%;
  max-height: 420px;
  border-radius: 10px;
  background: #000;
}
</style>
