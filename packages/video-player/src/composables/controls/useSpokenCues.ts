import { onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { PlayerHandle, TranscriptCue } from '@/types/player'

export interface SpokenCuesOptions {
  pitch?: number
  rate?: number
}

export interface UseSpokenCuesReturn {
  canSpeak: boolean
  speechEnabled: Ref<boolean>
  toggleSpeech: () => void
}

/**
 * Reads the active transcript cue aloud, muting the video while it does so two voices don't talk
 * over each other. The mute is borrowed, not taken: it is released only while this composable still
 * owns it, so a viewer who mutes or unmutes the video themselves keeps the last word.
 */
export function useSpokenCues(
  player: ComputedRef<PlayerHandle | null>,
  cues: ComputedRef<TranscriptCue[]>,
  activeIndex: ComputedRef<number | null>,
  options: SpokenCuesOptions = {},
): UseSpokenCuesReturn {
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
  const speechEnabled = ref(false)
  const ownsMute = ref(false)

  function releaseMute(): void {
    if (ownsMute.value && player.value?.isMuted) player.value.toggleMute()
    ownsMute.value = false
  }

  function toggleSpeech(): void {
    if (!canSpeak) return
    speechEnabled.value = !speechEnabled.value

    if (speechEnabled.value) {
      if (player.value && !player.value.isMuted) {
        player.value.toggleMute()
        ownsMute.value = true
      }
      return
    }
    window.speechSynthesis.cancel()
    releaseMute()
  }

  watch(activeIndex, (index) => {
    if (!canSpeak || !speechEnabled.value || index === null) return
    const cue = cues.value[index]
    if (!cue) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(cue.text)
    if (options.pitch !== undefined) utterance.pitch = options.pitch
    if (options.rate !== undefined) utterance.rate = options.rate
    window.speechSynthesis.speak(utterance)
  })

  /** The viewer unmuting is them asking for the video's own audio back, so stand down without touching the mute again. */
  watch(
    () => player.value?.isMuted,
    (isMuted) => {
      if (!canSpeak || !speechEnabled.value || isMuted !== false) return
      window.speechSynthesis.cancel()
      speechEnabled.value = false
      ownsMute.value = false
    },
  )

  onBeforeUnmount(() => {
    if (canSpeak) window.speechSynthesis.cancel()
    if (speechEnabled.value) releaseMute()
  })

  return { canSpeak, speechEnabled, toggleSpeech }
}
