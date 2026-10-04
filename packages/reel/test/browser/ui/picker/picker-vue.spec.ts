import { afterEach, describe, expect, it } from 'vite-plus/test'
import { defineComponent, h, nextTick, ref } from 'vue'
import { render } from 'vitest-browser-vue'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import { VideoPlayer, type PlayerHandle } from '@munsonlabs/video-player'
import { ReelPicker, getPickerDefaults, setPickerDefaults, type PickerApi, type ReelExportDetail, type Range } from '@/vue'
import '@munsonlabs/video-player/style'
import { waitFor } from '@test/browser/picker-harness'

const initial = getPickerDefaults()
const urls: string[] = []

afterEach(() => {
  setPickerDefaults(initial)
  urls.splice(0).forEach((url) => URL.revokeObjectURL(url))
  localStorage.clear()
})

/** A player on `flower.mp4` that has loaded and sits at `time`. */
async function settle(player: PlayerHandle, time: number): Promise<void> {
  await waitFor(() => player.isLoaded && Boolean(player.mediaElement), 'the player to load')
  player.seek(time)
  await waitFor(() => !player.mediaElement!.seeking && Math.abs(player.currentTime - time) < 0.2, `the player at ${time}`)
}

describe('<ReelPicker> (vue)', () => {
  it('opens with v-model:open on the player it is given, takes props, follows the captions on show and emits export and update:open', async () => {
    setPickerDefaults({ length: 2, longest: 3 })
    const open = ref(false)
    const exported: ReelExportDetail[] = []
    const ranges: Range[] = []
    const picker = ref<PickerApi | null>(null)
    const player = ref<PlayerHandle | null>(null)
    const vtt = URL.createObjectURL(new Blob(['WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello\n'], { type: 'text/vtt' }))
    urls.push(vtt)
    const Host = defineComponent({
      setup: () => () => [
        h(VideoPlayer, {
          ref: player,
          src: flowerUrl,
          muted: true,
          tracks: [{ src: vtt, srclang: 'en', label: 'English', default: true }],
        }),
        h(ReelPicker, {
          ref: picker,
          open: open.value,
          'onUpdate:open': (value: boolean) => (open.value = value),
          player: player.value,
          origin: { url: 'https://example.com/v', title: 'Vue clip' },
          endCard: false,
          onExport: (detail: ReelExportDetail) => exported.push(detail),
          onRange: (range: Range) => ranges.push(range),
        }),
      ],
    })
    const screen = await render(Host)
    const root = screen.container
    expect(picker.value!.state).toBe('closed')
    expect(root.querySelector('.reel-picker')).toBeNull()
    await waitFor(() => player.value !== null, 'the player handle')
    await settle(player.value!, 1)

    open.value = true
    await nextTick()
    await waitFor(() => picker.value!.state === 'editing', 'the editor')
    expect(picker.value!.range).toEqual({ start: 0.3, end: 2.3 })
    expect(player.value!.clipRange).toEqual({ start: 0.3, end: 2.3 })
    // The crop window is drawn inside the player, not in the panel.
    const crop = root.querySelector('.reel-crop')!
    expect(root.querySelector('.reel-picker')!.contains(crop)).toBe(false)
    await waitFor(
      () => player.value!.captionTracks.find((track) => track.index === player.value!.activeCaptionIndex)?.label === 'English',
      'the track the player shows',
    )
    expect(root.querySelector<HTMLInputElement>('input[name="endcard"]')!.checked).toBe(false)

    const start = root.querySelector<HTMLElement>('.reel-handle[data-handle="start"]')!
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(ranges.at(-1)).toEqual({ start: 0.8, end: 2.3 })

    root.querySelector<HTMLButtonElement>('.reel-export-button')!.click()
    await waitFor(() => exported.length > 0, 'the export event')
    expect(exported[0]).toMatchObject({ start: 0.8, end: 2.3, link: 'https://example.com/v#ml-t=0.8,2.3' })

    root.querySelector<HTMLButtonElement>('.reel-close')!.click()
    await waitFor(() => open.value === false, 'update:open false')
    expect(picker.value!.state).toBe('closed')
    expect(player.value!.clipRange).toBeNull()
  })

  it('finds the player it is nested in, with no player or for', async () => {
    setPickerDefaults({ length: 2, longest: 3 })
    const picker = ref<PickerApi | null>(null)
    const player = ref<PlayerHandle | null>(null)
    const Host = defineComponent({
      setup: () => () =>
        h(VideoPlayer, { ref: player, src: flowerUrl, muted: true }, { default: () => h(ReelPicker, { ref: picker, endCard: false }) }),
    })
    const screen = await render(Host)
    await waitFor(() => player.value !== null && picker.value !== null, 'the player and the picker')
    await settle(player.value!, 1)
    picker.value!.show()
    await waitFor(() => picker.value!.state === 'editing', 'the editor')
    expect(screen.container.querySelector('.player__custom-hud .reel-picker')).not.toBeNull()
    expect(player.value!.clipRange).toEqual(picker.value!.range)
    picker.value!.close()
  })
})
