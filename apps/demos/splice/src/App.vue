<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { VideoPlayer, type CustomAction, type PlayerHandle } from '@munsonlabs/video-player'
import { SpliceEditor, type EditorErrorDetail, type EditorExportDetail } from '@munsonlabs/splice/vue'
import { resolveMedia } from './helpers'
import { ThePlan } from './components'

const scissors =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg>'

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

const origin = { url: location.href.split('#')[0], title, publisher: 'Splice demo', player: 'demo' }
const logo = resolveMedia('logo.svg')
const endCard = { logo, displayUrl: `acme.news/2026/10/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` }
const stamp = { logo, position: 'top-right' } as const
const watermark = { text: 'Clipped from acme.news', position: 'bottom' } as const

const player = ref<PlayerHandle>()
const action = shallowRef<CustomAction | null>(null)
const open = ref(false)
const unavailable = ref('')
const notice = ref('')
const clip = shallowRef<{ link: string; hash: string } | null>(null)

function switchSource(event: Event): void {
  const url = new URL(location.href)
  url.searchParams.set('source', (event.target as HTMLSelectElement).value)
  url.hash = ''
  location.href = url.href
}

onMounted(async () => {
  const { canSplice } = await import('@munsonlabs/splice')
  const check = await canSplice(src, { crop: { aspect: '9:16' } })
  if (check.ok) action.value = { icon: scissors, label: 'Clip this', onClick: () => (open.value = true) }
  else unavailable.value = check.message
})

function onError(detail: EditorErrorDetail): void {
  notice.value = detail.message
}

function onExport(detail: EditorExportDetail): void {
  notice.value = ''
  clip.value = detail.link ? { link: detail.link, hash: new URL(detail.link).hash } : null
}

function backToMoment(link: string): void {
  open.value = false
  location.hash = new URL(link).hash
}
</script>

<template>
  <main>
    <h1>Splice Demo</h1>
    <p>{{ intro }} Press the scissors in the player (or the button below) to cut a vertical clip of any moment, entirely in your browser.</p>

    <label class="source">
      Source
      <select :value="sourceId" @change="switchSource">
        <option v-for="(option, id) in sources" :key="id" :value="id">{{ option.label }}</option>
      </select>
    </label>

    <div class="player">
      <VideoPlayer ref="player" :src="src" :tracks="tracks" :label="title" :action="action" deep-link="demo" deep-link-end="loop" />
    </div>

    <div class="toolbar">
      <button :disabled="!action || open" @click="open = true">Clip this</button>
      <span v-if="unavailable" class="note">Splicing is not available here: {{ unavailable }}</span>
    </div>

    <SpliceEditor
      v-model:open="open"
      :player="player"
      :source="src"
      :origin="origin"
      :end-card="endCard"
      :stamp="stamp"
      :watermark="watermark"
      @export="onExport"
      @error="onError"
    />

    <p class="note" aria-live="polite">{{ notice }}</p>
    <p v-if="clip" class="note">
      The clip's metadata links back to this moment:
      <a :href="clip.link" @click.prevent="backToMoment(clip.link)">{{ clip.hash }}</a>
    </p>

    <h2>How it works</h2>
    <p>
      The player is <code>@munsonlabs/video-player</code>; the scissors are its custom <code>action</code>, offered once <code>canSplice()</code> says
      this browser can splice the file. They open <code>&lt;SpliceEditor&gt;</code> under the player, which takes the player over as its preview: the
      clip loops, a 9:16 window shows what the clip keeps (drag it to reframe), and the timeline's filmstrip comes from
      <code>createThumbnails()</code>. Export hands it all to <code>createSplice()</code>: decoded with WebCodecs, cropped, with the captions on show
      burned in, and encoded to an MP4 with H.264 video and AAC audio, all on this device. Nothing is uploaded.
    </p>
    <p>
      The clip ends with a silent end card faded in over its last frame (the logo, the publisher, the title and the article's address), the logo is
      stamped in the top-right corner of every frame, where TikTok, Reels and Shorts leave space, and a band across the bottom of every frame names
      the site it came from. With an <code>origin</code>, the clip's MP4 metadata carries a <code>#ml-t=</code> link back to the clipped moment; the
      player has <code>deep-link="demo"</code> on, so following it seeks to the range and loops it.
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
</style>
