<script setup lang="ts">
import type { Component } from 'vue'

type Entry = Record<string, unknown>

const STORAGE_KEY = 'ml-video-docs:try-your-own'

const AD_PRESETS = [
  {
    label: 'VAST - linear pre-roll',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
  },
  {
    label: 'VAST - skippable pre-roll',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dskippablelinear&correlator=',
  },
  {
    label: 'VMAP - pre/mid/post-roll',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpremidpost&cmsid=496&vid=short_onecue&correlator=',
  },
  {
    label: 'VMAP - 3-ad pod',
    url: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator=',
  },
]

const VIDEO_PRESETS = [
  { label: 'MP4 - Big Buck Bunny', src: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4' },
  { label: 'WebM - Big Buck Bunny', src: 'https://test-videos.co.uk/vids/bigbuckbunny/webm/vp9/1080/Big_Buck_Bunny_1080_10s_1MB.webm' },
  { label: 'HLS - Mux test stream', src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  {
    label: 'HLS - bipbop (captions + quality)',
    src: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  },
  { label: 'DASH - Big Buck Bunny (180p to 2160p)', src: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd' },
  { label: 'YouTube', src: 'https://www.youtube.com/watch?v=UnktCDi-BVs' },
  { label: 'Vimeo', src: 'https://vimeo.com/347119375' },
  { label: 'Dailymotion', src: 'https://www.dailymotion.com/video/x84sh87' },
  { label: 'JW Player - Big Buck Bunny', src: 'https://cdn.jwplayer.com/manifests/J8iBKS1l.m3u8' },
]

const HB_EXAMPLE = {
  adUnit: {
    code: 'video-instream-demo',
    mediaTypes: {
      video: { context: 'instream', playerSize: [640, 480], mimes: ['video/mp4'], protocols: [1, 2, 3, 4, 5, 6, 7, 8], playbackmethod: [2], skip: 1 },
    },
    bids: [{ bidder: 'appnexus', params: { placementId: 13232361 } }],
  },
  iu: '/21775744923/external/single_ad_samples',
  timeoutMs: 2000,
}

const VideoCard = shallowRef<Component | null>(null)
const failed = ref(false)

const src = ref('')
const title = ref('')
const poster = ref('')
const adTagUrl = ref('')
const paramRows = ref<{ key: string; value: string }[]>([{ key: '', value: '' }])
const hbEnabled = ref(false)
const adUnitJson = ref('')
const gamIu = ref('')
const timeoutMs = ref(1000)
const error = ref('')
const entries = ref<Entry[]>([])

onMounted(async () => {
  try {
    entries.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    entries.value = []
  }
  try {
    const mod = await import('@munsonlabs/video-player')
    await import('@munsonlabs/video-player/style')
    VideoCard.value = mod.VideoCard as Component
  } catch {
    failed.value = true
  }
})

watch(
  entries,
  (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
      /* private mode, blocked storage - the list just won't survive a reload */
    }
  },
  { deep: true },
)

function loadHbExample(): void {
  hbEnabled.value = true
  adUnitJson.value = JSON.stringify(HB_EXAMPLE.adUnit, null, 2)
  gamIu.value = HB_EXAMPLE.iu
  timeoutMs.value = HB_EXAMPLE.timeoutMs
}

function submit(): void {
  error.value = ''
  if (!src.value.trim()) {
    error.value = 'Video URL is required.'
    return
  }

  const entry: Entry = { src: src.value.trim(), label: title.value.trim() || src.value.trim() }
  if (poster.value.trim()) entry.poster = poster.value.trim()
  if (adTagUrl.value.trim()) entry.adTagUrl = adTagUrl.value.trim()

  const macros = paramRows.value.filter((r) => r.key.trim())
  if (macros.length) entry.adMacroParams = Object.fromEntries(macros.map((r) => [r.key.trim(), r.value]))

  if (hbEnabled.value) {
    if (!adUnitJson.value.trim()) {
      error.value = 'Header bidding is on but no ad unit JSON was given.'
      return
    }
    let adUnit
    try {
      adUnit = JSON.parse(adUnitJson.value)
    } catch {
      error.value = 'Ad unit JSON is not valid JSON - check for trailing commas or unquoted keys.'
      return
    }
    if (!adUnit.code || !adUnit.mediaTypes || !Array.isArray(adUnit.bids)) {
      error.value = 'Ad unit JSON needs "code", "mediaTypes" and a "bids" array - the same object you would pass to pbjs.addAdUnits().'
      return
    }
    entry.headerBidding = {
      adUnit,
      params: gamIu.value.trim() ? { iu: gamIu.value.trim() } : undefined,
      timeoutMs: timeoutMs.value || undefined,
    }
  }

  entries.value = [entry, ...entries.value]
}
</script>

<template>
  <ClientOnly>
    <div class="tyo">
      <form class="tyo__form" @submit.prevent="submit">
        <label class="tyo__field">
          <span class="tyo__label">
            Video URL <span class="tyo__req">*</span>
            <select class="tyo__preset" @change="src = ($event.target as HTMLSelectElement).value">
              <option value="" disabled selected>Or pick an example…</option>
              <option v-for="p in VIDEO_PRESETS" :key="p.label" :value="p.src">{{ p.label }}</option>
            </select>
          </span>
          <input v-model="src" class="tyo__input" type="text" placeholder="https://…" required />
        </label>

        <div class="tyo__row">
          <label class="tyo__field">
            <span class="tyo__label">Title</span>
            <input v-model="title" class="tyo__input" type="text" placeholder="(optional)" />
          </label>
          <label class="tyo__field">
            <span class="tyo__label">Poster URL</span>
            <input v-model="poster" class="tyo__input" type="text" placeholder="(optional)" />
          </label>
        </div>

        <label class="tyo__field">
          <span class="tyo__label">
            Ad tag URL (VAST / VMAP)
            <select class="tyo__preset" @change="adTagUrl = ($event.target as HTMLSelectElement).value">
              <option value="" disabled selected>Or pick an example…</option>
              <option v-for="p in AD_PRESETS" :key="p.label" :value="p.url">{{ p.label }}</option>
            </select>
          </span>
          <input v-model="adTagUrl" class="tyo__input" type="text" placeholder="https://pubads.g.doubleclick.net/…" />
        </label>

        <div class="tyo__field">
          <span class="tyo__label">Ad macro params <em class="tyo__hint">fills {macro} tokens in the tag above</em></span>
          <div v-for="(row, i) in paramRows" :key="i" class="tyo__params">
            <input v-model="row.key" class="tyo__input" type="text" placeholder="key" />
            <input v-model="row.value" class="tyo__input" type="text" placeholder="value" />
            <button type="button" class="tyo__icon-btn" aria-label="Remove param" @click="paramRows = paramRows.filter((_, j) => j !== i)">×</button>
          </div>
          <button type="button" class="tyo__link-btn" @click="paramRows.push({ key: '', value: '' })">+ Add param</button>
        </div>

        <div class="tyo__row tyo__row--inline">
          <label class="tyo__check">
            <input v-model="hbEnabled" type="checkbox" />
            Header bidding (Prebid.js)
          </label>
          <button type="button" class="tyo__link-btn" @click="loadHbExample">Load example</button>
        </div>

        <template v-if="hbEnabled">
          <label class="tyo__field">
            <span class="tyo__label">Ad unit JSON <em class="tyo__hint">the object you would pass to pbjs.addAdUnits()</em></span>
            <textarea
              v-model="adUnitJson"
              class="tyo__input tyo__textarea"
              rows="6"
              placeholder='{"code":"video-preroll","mediaTypes":{…},"bids":[…]}'
            />
          </label>
          <div class="tyo__row">
            <label class="tyo__field">
              <span class="tyo__label">GAM ad unit path (iu)</span>
              <input v-model="gamIu" class="tyo__input" type="text" placeholder="/network/adunit" />
            </label>
            <label class="tyo__field">
              <span class="tyo__label">Auction timeout (ms)</span>
              <input v-model.number="timeoutMs" class="tyo__input" type="number" min="0" step="100" />
            </label>
          </div>
        </template>

        <p v-if="error" class="tyo__error">{{ error }}</p>

        <div class="tyo__actions">
          <button type="submit" class="tyo__submit">Play it</button>
          <button v-if="entries.length" type="button" class="tyo__link-btn" @click="entries = []">Clear all</button>
        </div>
      </form>

      <p v-if="failed" class="tyo__error">Could not load <code>@munsonlabs/video-player</code> from the workspace build.</p>

      <div v-if="entries.length && VideoCard" class="tyo__results">
        <div v-for="(entry, i) in entries" :key="`${entry.src}-${i}`" class="tyo__result">
          <button class="tyo__remove" aria-label="Remove video" @click="entries = entries.filter((_, j) => j !== i)">×</button>
          <component :is="VideoCard" v-bind="entry" />
        </div>
      </div>
    </div>

    <template #fallback>
      <p class="tyo__loading">Loading the playground…</p>
    </template>
  </ClientOnly>
</template>

<style scoped>
.tyo {
  margin: 1.5rem 0;
}

.tyo__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 8px);
}

.tyo__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.tyo__row--inline {
  grid-template-columns: auto auto;
  justify-content: flex-start;
  align-items: center;
}

.tyo__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tyo__label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ui-text-muted);
}

.tyo__req {
  color: var(--ui-error, #f87171);
}

.tyo__hint {
  font-weight: 400;
  font-style: normal;
  color: var(--ui-text-dimmed, var(--ui-text-muted));
}

.tyo__input,
.tyo__preset {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 6px);
  padding: 0.5rem 0.65rem;
  color: var(--ui-text);
  font-size: 0.875rem;
  font-family: inherit;
  width: 100%;
}

.tyo__preset {
  width: auto;
  max-width: 100%;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.tyo__input:focus,
.tyo__preset:focus {
  outline: none;
  border-color: var(--ui-primary);
}

.tyo__textarea {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.8rem;
  resize: vertical;
}

.tyo__params {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tyo__check {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
  cursor: pointer;
}

.tyo__icon-btn {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius, 6px);
  color: var(--ui-text-muted);
  cursor: pointer;
  line-height: 1;
}

.tyo__link-btn {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  color: var(--ui-primary);
  font-size: 0.8rem;
  cursor: pointer;
}

.tyo__link-btn:hover {
  text-decoration: underline;
}

.tyo__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tyo__submit {
  background: var(--ui-primary);
  border: none;
  border-radius: var(--ui-radius, 6px);
  color: var(--ui-bg);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.55rem 1.25rem;
  cursor: pointer;
}

.tyo__submit:hover {
  filter: brightness(1.08);
}

.tyo__error {
  color: var(--ui-error, #f87171);
  font-size: 0.85rem;
}

.tyo__loading {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

.tyo__results {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.tyo__result {
  position: relative;
}

.tyo__remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5;
  width: 1.75rem;
  height: 1.75rem;
  background: rgb(0 0 0 / 0.55);
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  color: #fff;
  line-height: 1;
  cursor: pointer;
}

@media (max-width: 640px) {
  .tyo__row,
  .tyo__row--inline {
    grid-template-columns: 1fr;
  }
}
</style>
