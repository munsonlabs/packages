<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { fmtTime } from '@/utils/time'
import { useResolvedPlayer, type ResolvedPlayerProps } from '@/ui/controls/useResolvedPlayer'
import { useSpokenCues } from '@/ui/controls/useSpokenCues'
import Icon from '@/ui/shared/Icon.vue'
import type { TranscriptCue } from '@/types/player'

defineOptions({ inheritAttrs: false })

const props = defineProps<
  ResolvedPlayerProps & {
    cues?: TranscriptCue[] | string
    speechPitch?: number
    speechRate?: number
  }
>()

const player = useResolvedPlayer(props)

const parsedCues = computed<TranscriptCue[]>(() => {
  if (typeof props.cues !== 'string') return props.cues ?? []
  try {
    return JSON.parse(props.cues)
  } catch {
    return []
  }
})

const activeIndex = computed<number | null>(() => {
  const current = player.value?.currentTime ?? 0
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

function onCueClick(cue: TranscriptCue): void {
  const p = player.value
  if (!p) return
  p.seek(cue.time)
  void p.play().catch(() => {})
}

watch(activeIndex, async (index) => {
  if (index === null || hovering.value) return
  await nextTick()
  listEl.value?.querySelector('.ml-video-transcript__cue--active')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
})

const { canSpeak, speechEnabled, toggleSpeech } = useSpokenCues(player, parsedCues, activeIndex, {
  pitch: props.speechPitch,
  rate: props.speechRate,
})
</script>

<template>
  <button
    v-if="canSpeak"
    type="button"
    class="ml-video-transcript__speech-toggle"
    :aria-label="speechEnabled ? 'Mute transcript readout' : 'Unmute transcript readout'"
    :aria-pressed="speechEnabled"
    @click="toggleSpeech"
  >
    <Icon name="volume-on" v-if="speechEnabled" />
    <Icon name="volume-mute" v-else />
  </button>
  <ol ref="listEl" class="ml-video-transcript" v-bind="$attrs" @pointerenter="hovering = true" @pointerleave="hovering = false">
    <li v-for="(cue, index) in parsedCues" :key="`${cue.time}-${index}`" class="ml-video-transcript__item">
      <button
        type="button"
        class="ml-video-transcript__cue"
        :class="{ 'ml-video-transcript__cue--active': index === activeIndex }"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="onCueClick(cue)"
      >
        <slot :cue="cue" :index="index" :is-active="index === activeIndex" :format-time="fmtTime">
          <span class="ml-video-transcript__time">{{ fmtTime(cue.time) }}</span>
          <span class="ml-video-transcript__text">{{ cue.text }}</span>
        </slot>
      </button>
    </li>
  </ol>
</template>

<style scoped>
:where(.ml-video-transcript) {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

:where(.ml-video-transcript__cue) {
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

:where(.ml-video-transcript__cue):focus-visible {
  outline: 2px solid;
  outline-offset: -2px;
}

:where(.ml-video-transcript__cue:hover) {
  background: rgba(127, 127, 127, 0.15);
}

:where(.ml-video-transcript__cue--active) {
  background: rgba(127, 127, 127, 0.25);
  font-weight: 600;
}

:where(.ml-video-transcript__speech-toggle) {
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
  background: var(--ml-video-btn-bg, rgba(127, 127, 127, 0.1));
  color: var(--ml-video-btn-color, inherit);
  transition:
    background 0.2s,
    transform 0.15s;
}

:where(.ml-video-transcript__speech-toggle):focus-visible {
  outline: 2px solid;
  outline-offset: 2px;
}

:where(.ml-video-transcript__speech-toggle:hover) {
  background: var(--ml-video-btn-bg, rgba(127, 127, 127, 0.2));
  transform: scale(1.08);
}

:where(.ml-video-transcript__speech-toggle[aria-pressed='true']) {
  border-color: var(--ml-video-accent, #3b82f6);
  background: color-mix(in srgb, var(--ml-video-accent, #3b82f6) 30%, var(--ml-video-btn-bg, rgba(127, 127, 127, 0.1)));
  color: var(--ml-video-btn-color, inherit);
}

:where(.ml-video-transcript__speech-toggle :deep(svg)) {
  width: 1.1em;
  height: 1.1em;
}

:where(.ml-video-transcript__time) {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
  flex-shrink: 0;
}
</style>
