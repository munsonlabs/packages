import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, h, ref } from 'vue'
import { render } from 'vitest-browser-vue'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { VideoPlayer, type PlayerHandle } from '@munsonlabs/video-player'
import { SpliceEditor } from '@/vue'
import '@munsonlabs/video-player/style'
import { waitFor, type EditorApi } from '@test/browser/editor-harness'

vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))

afterEach(() => {
  localStorage.clear()
})

describe('<SpliceEditor> nested in a player', () => {
  it('finds the player it’s nested in, with no player or for', async () => {
    const editor = ref<EditorApi | null>(null)
    const player = ref<PlayerHandle | null>(null)
    const Host = defineComponent({
      setup: () => () =>
        h(VideoPlayer, { ref: player, src: flowerUrl, muted: true }, { default: () => h(SpliceEditor, { ref: editor, endCard: false }) }),
    })
    const screen = await render(Host)
    await waitFor(() => player.value !== null && editor.value !== null, 'the player and the editor')
    await waitFor(() => player.value!.isLoaded && Boolean(player.value!.mediaElement), 'the player to load')
    player.value!.seek(1)
    await waitFor(() => Math.abs(player.value!.currentTime - 1) < 0.2, 'the player at 1s')

    editor.value!.show()
    const state = () => screen.container.querySelector('.splice-editor')?.getAttribute('data-state')
    await waitFor(() => state() === 'editing', 'the editor')
    expect(screen.container.querySelector('.player__custom-hud .splice-editor')).not.toBeNull()
    expect(player.value!.clipRange).toEqual({ start: 0.3, end: 2.3 })
    editor.value!.close()
  })
})
