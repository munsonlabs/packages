import { computed, type ComputedRef, type Ref } from 'vue'
import type { PlayerHandle } from '@munsonlabs/video-player'
import { usePreviewing } from './usePreviewing'
import type { SpliceSource } from '@/types/splice'
import type { EditorProps } from '@/types/internal'
import type { EditorState } from '@/types/editor'

/**
 * Works out what the editor needs from the page's player: the file to read, the shell the crop
 * window is drawn in, and whether it's showing. A blob: source is a MediaSource (HLS through hls.js)
 * with no file behind it, so the page has to pass the playlist URL as source.
 */
export function usePlayerShell(player: ComputedRef<PlayerHandle | null>, props: EditorProps, state: Ref<EditorState>) {
  const source = computed<SpliceSource | null>(() => {
    const current = player.value?.mediaElement?.currentSrc
    return props.source || props.src || (current && !current.startsWith('blob:') ? current : null)
  })

  const shell = computed(() => {
    const media = player.value?.mediaElement
    return (media?.closest('[data-ml-video-player]')?.parentElement as HTMLElement | null) ?? null
  })

  const isOverlaying = computed(() => (state.value === 'editing' || state.value === 'exporting') && shell.value !== null)

  usePreviewing(() => (isOverlaying.value ? shell.value : null))

  return { source, shell, isOverlaying }
}
