<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { fmtTime } from '@/utils/time'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/composables/controls/useResolvedPlayer'
import IconVolumeOn from '@/components/icons/IconVolumeOn.vue'
import IconVolumeMute from '@/components/icons/IconVolumeMute.vue'
import type { TranscriptCue } from '@/types/player'

const props = defineProps<
  ResolvedPlayerProps & {
    /** A raw JSON string is also accepted, since a custom element attribute like `cues='[...]'` otherwise arrives as a literal string, not an array. */
    cues?: TranscriptCue[] | string
  }
>()

const player = useResolvedPlayer(toRef(props, 'player'), toRef(props, 'for'))

/** See the `cues` prop's doc comment for why a string needs parsing here. */
const parsedCues = computed<TranscriptCue[]>(() => {
  if (typeof props.cues !== 'string') return props.cues ?? []
  try {
    return JSON.parse(props.cues)
  } catch {
    return []
  }
})

/** The last cue at or before the playhead - or none while the playhead sits in a gap past a cue's explicit `end`. */
const activeIndex = computed<number | null>(() => {
  const current = player.value?.current ?? 0
  const cues = parsedCues.value
  for (let i = cues.length - 1; i >= 0; i--) {
    const cue = cues[i]
    if (cue.time > current) continue
    if (cue.end !== undefined && current >= cue.end) return null
    return i
  }
  return null
})

const listEl = ref<HTMLElement | null>(null)
const hovering = ref(false)

/**
 * `seek` takes a percentage of `total`, so a cue can only be jumped to once the duration is
 * known. Before that (a lazy `VideoCard`, a mounted-but-unstarted player) the click still starts
 * playback - which is also what mounts/loads the player, so a follow-up click can land.
 */
function onCueClick(cue: TranscriptCue): void {
  const p = player.value
  if (!p) return
  if (p.total > 0) p.seek((cue.time / p.total) * 100)
  if (!p.isPlaying) p.togglePlay()
}

/**
 * Keeps the active cue in view as playback progresses, but never while the pointer is over the
 * list - fighting the user's own scrolling is worse than falling behind. The `?.` on
 * scrollIntoView also covers test DOMs that don't implement it.
 */
watch(activeIndex, async (index) => {
  if (index === null || hovering.value) return
  await nextTick()
  listEl.value?.querySelector('.mlv-transcript__cue--active')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
})

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
const speechEnabled = ref(false)
const mutedForSpeech = ref(false)

/**
 * Toggles spoken readout of the active cue via the Web Speech API. Mutes the player while
 * enabled so the two audio sources don't overlap, and only restores it on disable if this toggle
 * was the one that muted it - a mute the consumer set separately is left alone.
 */
function toggleSpeech(): void {
  if (!canSpeak) return
  speechEnabled.value = !speechEnabled.value
  if (speechEnabled.value) {
    if (player.value && !player.value.isMuted) {
      player.value.toggleMute()
      mutedForSpeech.value = true
    }
    return
  }
  window.speechSynthesis.cancel()
  if (mutedForSpeech.value && player.value?.isMuted) player.value.toggleMute()
  mutedForSpeech.value = false
}

watch(activeIndex, (index) => {
  if (!canSpeak || !speechEnabled.value || index === null) return
  const cue = parsedCues.value[index]
  if (!cue) return
  window.speechSynthesis.cancel()
  let utterance = new SpeechSynthesisUtterance(cue.text)
  utterance.pitch = 2.0
  utterance.rate = 1.5
  window.speechSynthesis.speak(utterance)
})

/** If the player gets unmuted from elsewhere (e.g. `MuteButton`) while readout is on, stop talking over it rather than compete with now-audible video. */
watch(
  () => player.value?.isMuted,
  (isMuted) => {
    if (!canSpeak || !speechEnabled.value || isMuted !== false) return
    window.speechSynthesis.cancel()
    speechEnabled.value = false
    mutedForSpeech.value = false
  },
)

onBeforeUnmount(() => {
  if (canSpeak) window.speechSynthesis.cancel()
  if (mutedForSpeech.value && player.value?.isMuted) player.value.toggleMute()
})
</script>

<template>
  <button
    v-if="canSpeak"
    type="button"
    class="mlv-transcript__speech-toggle"
    :aria-label="speechEnabled ? 'Mute transcript readout' : 'Unmute transcript readout'"
    :aria-pressed="speechEnabled"
    @click="toggleSpeech"
  >
    <IconVolumeOn v-if="speechEnabled" />
    <IconVolumeMute v-else />
  </button>
  <ol ref="listEl" class="mlv-transcript" @pointerenter="hovering = true" @pointerleave="hovering = false">
    <li v-for="(cue, index) in parsedCues" :key="`${cue.time}-${index}`" class="mlv-transcript__item">
      <button
        type="button"
        class="mlv-transcript__cue"
        :class="{ 'mlv-transcript__cue--active': index === activeIndex }"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="onCueClick(cue)"
      >
        <slot :cue="cue" :index="index" :is-active="index === activeIndex" :format-time="fmtTime">
          <span class="mlv-transcript__time">{{ fmtTime(cue.time) }}</span>
          <span class="mlv-transcript__text">{{ cue.text }}</span>
        </slot>
      </button>
    </li>
  </ol>
</template>

<style scoped>
/* :where() keeps these at zero specificity so a consumer's own class always wins. */
:where(.mlv-transcript) {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

:where(.mlv-transcript__cue) {
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
}

/* No explicit color, unlike the video overlay's white outlines - this panel can sit on an arbitrary page background, so it falls back to currentColor. */
:where(.mlv-transcript__cue):focus-visible {
  outline: 2px solid;
  outline-offset: -2px;
}

:where(.mlv-transcript__cue:hover) {
  background: rgba(127, 127, 127, 0.15);
}

:where(.mlv-transcript__cue--active) {
  background: rgba(127, 127, 127, 0.25);
  font-weight: 600;
}

:where(.mlv-transcript__speech-toggle) {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.5rem;
  border-radius: 50%;
  border: 1px solid rgba(127, 127, 127, 0.3);
  background: var(--mlv-btn-bg, rgba(127, 127, 127, 0.1));
  color: var(--mlv-btn-color, inherit);
  transition:
    background 0.2s,
    transform 0.15s;
}

:where(.mlv-transcript__speech-toggle):focus-visible {
  outline: 2px solid;
  outline-offset: 2px;
}

:where(.mlv-transcript__speech-toggle:hover) {
  background: var(--mlv-btn-bg, rgba(127, 127, 127, 0.2));
  transform: scale(1.08);
}

:where(.mlv-transcript__speech-toggle[aria-pressed='true']) {
  border-color: var(--mlv-accent, #3b82f6);
  background: color-mix(in srgb, var(--mlv-accent, #3b82f6) 30%, var(--mlv-btn-bg, rgba(127, 127, 127, 0.1)));
  color: var(--mlv-btn-color, inherit);
}

:where(.mlv-transcript__speech-toggle svg) {
  width: 1.1em;
  height: 1.1em;
}

:where(.mlv-transcript__time) {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  flex-shrink: 0;
}
</style>
