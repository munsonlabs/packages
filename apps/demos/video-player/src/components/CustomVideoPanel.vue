<script setup lang="ts">
import { ref, computed } from 'vue'
import { VideoCard } from '@munsonlabs/video-player'
import type { VideoEntry, StateChangeEvent, HeaderBiddingAdUnit, CaptionTrackDef } from '@munsonlabs/video-player'
import { useDemoSettings } from '../composables/useDemoSettings'
import { useCustomVideos } from '../composables/useCustomVideos'
import { useEventLog } from '../composables/useEventLog'
import { videos, adVideos, prebidVideos, captionVideos, qualityVideos } from '../data/demoVideos'

interface ParamRow {
  key: string
  value: string
}

const { webComponents, lazy, nativeUi, disableTapCapture } = useDemoSettings()
const { customVideos, addCustomVideo, removeCustomVideo } = useCustomVideos()
const { addLog } = useEventLog()

// Example sources pulled straight from the showcase's own demo data, so picking one here is
// equivalent to (and stays in sync with) the dedicated Ad/Prebid/Captions/Quality panels this
// form replaces — no separate example URLs to maintain in two places.
const videoPresets = [...videos, ...qualityVideos, ...captionVideos]
const adPresets = adVideos.filter((v): v is VideoEntry & { adTagUrl: string } => !!v.adTagUrl)
const headerBiddingPreset = prebidVideos[0]?.headerBidding

const videoSrc = ref('')
const title = ref('')
const poster = ref('')
const tracks = ref<CaptionTrackDef[] | undefined>(undefined)
const adTagUrl = ref('')
const paramRows = ref<ParamRow[]>([{ key: '', value: '' }])

const headerBiddingEnabled = ref(false)
const adUnitJson = ref('')
const gamIu = ref('')
const timeoutMs = ref(1000)

const error = ref('')

function applyVideoPreset(e: Event): void {
  const index = Number((e.target as HTMLSelectElement).value)
  const preset = videoPresets[index]
  if (!preset) return
  videoSrc.value = preset.src
  title.value = preset.title ?? ''
  poster.value = preset.poster ?? ''
  tracks.value = preset.tracks
}

function applyAdPreset(e: Event): void {
  const index = Number((e.target as HTMLSelectElement).value)
  const preset = adPresets[index]
  if (!preset) return
  adTagUrl.value = preset.adTagUrl
}

function applyHeaderBiddingPreset(): void {
  if (!headerBiddingPreset) return
  headerBiddingEnabled.value = true
  adUnitJson.value = JSON.stringify(headerBiddingPreset.adUnit, null, 2)
  gamIu.value = headerBiddingPreset.params?.iu ?? ''
  timeoutMs.value = headerBiddingPreset.timeoutMs ?? 1000
}

function addParamRow(): void {
  paramRows.value.push({ key: '', value: '' })
}

function removeParamRow(index: number): void {
  paramRows.value = paramRows.value.filter((_, i) => i !== index)
}

const adTagParamsPreview = computed(() => {
  const entries = paramRows.value.filter((row) => row.key.trim())
  return entries.length ? Object.fromEntries(entries.map((row) => [row.key.trim(), row.value])) : undefined
})

function parseAdUnit(): HeaderBiddingAdUnit | null {
  if (!adUnitJson.value.trim()) {
    error.value = 'Header bidding is enabled but no ad unit JSON was provided.'
    return null
  }
  try {
    const parsed = JSON.parse(adUnitJson.value)
    if (!parsed.code || !parsed.mediaTypes || !Array.isArray(parsed.bids)) {
      error.value = 'Ad unit JSON must have "code", "mediaTypes", and a "bids" array (the same object you\'d pass to pbjs.addAdUnits()).'
      return null
    }
    return parsed as HeaderBiddingAdUnit
  } catch {
    error.value = 'Ad unit JSON is not valid JSON — check for trailing commas or unquoted keys.'
    return null
  }
}

function onSubmit(): void {
  error.value = ''
  if (!videoSrc.value.trim()) {
    error.value = 'Video URL is required.'
    return
  }

  const entry: VideoEntry = {
    src: videoSrc.value.trim(),
    title: title.value.trim() || videoSrc.value.trim(),
    poster: poster.value.trim() || undefined,
  }

  if (adTagUrl.value.trim()) entry.adTagUrl = adTagUrl.value.trim()
  if (adTagParamsPreview.value) entry.adMacroParams = adTagParamsPreview.value
  if (tracks.value?.length) entry.tracks = tracks.value

  if (headerBiddingEnabled.value) {
    const adUnit = parseAdUnit()
    if (!adUnit) return
    entry.headerBidding = {
      adUnit,
      params: gamIu.value.trim() ? { iu: gamIu.value.trim() } : undefined,
      timeoutMs: timeoutMs.value || undefined,
    }
  }

  addCustomVideo(entry)
}

function onStateChange(e: StateChangeEvent | CustomEvent): void {
  addLog(e instanceof CustomEvent ? e.detail[0] : e)
}
</script>

<template>
  <section class="panel">
    <h2 class="panel__heading"><span class="panel__heading-dot" />Try Your Own</h2>
    <p class="panel__description">
      Paste a video URL (and optionally a poster, VAST/VMAP ad tag, ad macro params, or a Prebid header bidding config) to preview it with this
      player, without editing any code — or pick one of the examples from each dropdown below. Entries persist locally in this browser.
    </p>

    <form class="custom-form" @submit.prevent="onSubmit">
      <label class="field">
        <span class="field__label">
          Video URL <span class="field__required">*</span>
          <select class="field__preset" @change="applyVideoPreset">
            <option value="" disabled selected>Or pick an example…</option>
            <option v-for="(preset, i) in videoPresets" :key="i" :value="i">{{ preset.title }}</option>
          </select>
        </span>
        <input v-model="videoSrc" class="field__input" type="text" placeholder="https://..." required @input="tracks = undefined" />
      </label>

      <div class="field-row">
        <label class="field">
          <span class="field__label">Title</span>
          <input v-model="title" class="field__input" type="text" placeholder="(optional)" />
        </label>
        <label class="field">
          <span class="field__label">Poster URL</span>
          <input v-model="poster" class="field__input" type="text" placeholder="(optional)" />
        </label>
      </div>

      <label class="field">
        <span class="field__label">
          Ad Tag URL (VAST / VMAP)
          <select class="field__preset" @change="applyAdPreset">
            <option value="" disabled selected>Or pick an example…</option>
            <option v-for="(preset, i) in adPresets" :key="i" :value="i">{{ preset.title }}</option>
          </select>
        </span>
        <input v-model="adTagUrl" class="field__input" type="text" placeholder="https://pubads.g.doubleclick.net/..." />
      </label>

      <div class="field">
        <span class="field__label">Ad Macro Params <span class="field__hint">fills {macro} tokens in the ad tag URL above</span></span>
        <div v-for="(row, i) in paramRows" :key="i" class="param-row">
          <input v-model="row.key" class="field__input" type="text" placeholder="key" />
          <input v-model="row.value" class="field__input" type="text" placeholder="value" />
          <button type="button" class="param-row__remove" aria-label="Remove param" @click="removeParamRow(i)">×</button>
        </div>
        <button type="button" class="field__add" @click="addParamRow">+ Add param</button>
      </div>

      <div class="field-row field-row--align">
        <label class="toggle" :class="{ 'toggle--active': headerBiddingEnabled }" @click.prevent="headerBiddingEnabled = !headerBiddingEnabled">
          <span class="toggle__track"><span class="toggle__thumb" /></span>
          Header bidding (Prebid.js)
        </label>
        <button v-if="headerBiddingPreset" type="button" class="field__add" @click="applyHeaderBiddingPreset">Load example</button>
      </div>

      <template v-if="headerBiddingEnabled">
        <label class="field">
          <span class="field__label">Ad unit JSON <span class="field__hint">the object you'd pass to pbjs.addAdUnits()</span></span>
          <textarea
            v-model="adUnitJson"
            class="field__input field__textarea"
            rows="6"
            placeholder='{"code":"video-preroll","mediaTypes":{"video":{"context":"instream","playerSize":[640,480]}},"bids":[{"bidder":"appnexus","params":{"placementId":123456}}]}'
          />
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field__label">GAM ad unit path (iu)</span>
            <input v-model="gamIu" class="field__input" type="text" placeholder="/network/adunit" />
          </label>
          <label class="field">
            <span class="field__label">Auction timeout (ms)</span>
            <input v-model.number="timeoutMs" class="field__input" type="number" min="0" step="100" />
          </label>
        </div>
      </template>

      <p v-if="error" class="field__error">{{ error }}</p>

      <button type="submit" class="custom-form__submit">Preview</button>
    </form>

    <div v-if="customVideos.length" class="playlist__grid">
      <div v-for="(video, i) in customVideos" :key="`${video.src}-${i}`" class="video-card custom-video-card">
        <button class="custom-video-card__remove" aria-label="Remove video" @click="removeCustomVideo(i)">×</button>
        <component
          :is="webComponents ? 'ml-video-card' : VideoCard"
          v-bind="video"
          :lazy="lazy"
          :native-ui="nativeUi"
          :disable-tap-capture="disableTapCapture"
          @state-change="onStateChange"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.custom-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-row--align {
  grid-template-columns: auto auto;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field__label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
}

.field__preset {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--accent-soft);
  font-size: 0.75rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  max-width: 100%;
}
.field__preset:hover {
  border-color: var(--border-strong);
  color: var(--text);
}
.field__preset option {
  color: initial;
}

.field__required {
  color: #fb923c;
}

.field__hint {
  font-weight: 400;
  color: var(--text-faint);
  margin-left: 0.35rem;
}

.field__input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: var(--text);
  font-size: 0.9rem;
  font-family: inherit;
}
.field__input:focus {
  outline: none;
  border-color: var(--accent);
}

.field__textarea {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.8rem;
  resize: vertical;
}

.field__add {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: var(--accent-soft);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0;
}
.field__add:hover {
  text-decoration: underline;
}

.field__error {
  color: #f87171;
  font-size: 0.85rem;
}

.param-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.param-row .field__input {
  flex: 1 1 40%;
  min-width: 6rem;
}

.param-row__remove {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-dim);
  width: 2.1rem;
  height: 2.1rem;
  flex-shrink: 0;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
.param-row__remove:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.custom-form__submit {
  align-self: flex-start;
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
.custom-form__submit:hover {
  filter: brightness(1.1);
}

.custom-video-card {
  position: relative;
}

.custom-video-card__remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.custom-video-card__remove:hover {
  background: rgba(0, 0, 0, 0.75);
}

@media (max-width: 640px) {
  .custom-form {
    padding: 1rem 0.85rem;
  }

  .field-row,
  .field-row--align {
    grid-template-columns: 1fr;
  }

  .field-row--align {
    justify-items: start;
    gap: 0.6rem;
  }
}
</style>
