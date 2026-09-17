import { describe, it, expect } from 'vite-plus/test'
import { defineComponent, h } from 'vue'
import { render } from 'vitest-browser-vue'
import '@munsonlabs/video-player/element'
import type { PlayerHandle, StateChangeEvent } from '@munsonlabs/video-player'
import { catalogue, playlist } from '../../src/data/catalogue'
import { EventSink, waitFor } from './harness'

type PlayerElement = HTMLElement & PlayerHandle

async function mountElement(tag: 'ml-video-card' | 'ml-video-player', entry: Record<string, unknown>) {
  const sink = new EventSink()
  const onState = (e: Event) => sink.push((e as CustomEvent<[StateChangeEvent]>).detail[0])
  const Host = defineComponent({ render: () => h('div', [h(tag, { ...entry, onStateChange: onState })]) })
  const screen = await render(Host)
  const el = screen.container.querySelector<PlayerElement>(tag)!
  return { screen, el, sink, video: () => el.querySelector<HTMLVideoElement>('video.mlv-video') }
}

describe('custom elements', () => {
  it('ml-video-player exposes the handle on the element and plays through it', async () => {
    const { el, sink, video } = await mountElement('ml-video-player', { ...catalogue.plain, muted: true })
    await waitFor(() => el.isLoaded, 'the element to report loaded')

    expect(el.isPlaying).toBe(false)
    await el.play()
    expect(el.isPlaying).toBe(true)
    expect(video()?.paused).toBe(false)
    expect(sink.has('play')).toBe(true)

    el.seekTo(2)
    await sink.next('seeked')
    expect(el.current).toBeGreaterThanOrEqual(1.9)
    el.pause()
    await sink.next('pause')
    expect(video()?.paused).toBe(true)
  })

  it('ml-video-card: placeholder until clicked, then plays', async () => {
    const { screen, video, sink } = await mountElement('ml-video-card', catalogue.plain)
    expect(video()).toBeNull()

    await screen.getByRole('button', { name: 'Play' }).click()
    await sink.next('play')
    expect(video()?.paused).toBe(false)
  })

  it('ml-video-player with controls=false renders no HUD', async () => {
    const { el, sink } = await mountElement('ml-video-player', catalogue.headless)
    await sink.next('play')
    expect(el.querySelectorAll('.player__shell button')).toHaveLength(0)
  })

  it('ml-video-player: a broken source reports an error and Retry re-attempts', async () => {
    const { el, screen, sink } = await mountElement('ml-video-player', { ...catalogue.broken, muted: true })
    await sink.next('error')
    expect(el.isError).toBe(true)

    await screen.getByRole('button', { name: 'Retry' }).click()
    await sink.next('error', 1)
    expect(el.isError).toBe(true)
  })

  it('ml-video-stage + ml-video-card: a card click plays on the stage, playNext advances', async () => {
    const sink = new EventSink()
    const onState = (e: Event) => sink.push((e as CustomEvent<[StateChangeEvent]>).detail[0])
    const Host = defineComponent({
      render: () =>
        h('div', [h('ml-video-stage', { playlist, onStateChange: onState }), ...playlist.map((v) => h('ml-video-card', { ...v, lazy: true }))]),
    })
    const screen = await render(Host)
    const stage = screen.container.querySelector<PlayerElement & { playNext(): void; hasNext: boolean }>('ml-video-stage')!

    await screen.getByRole('button', { name: 'Play' }).first().click()
    const play = await sink.next('play')
    expect(play.src).toBe(playlist[0].src)
    expect(stage.querySelector<HTMLVideoElement>('video.mlv-video')?.paused).toBe(false)
    expect(stage.hasNext).toBe(true)

    stage.playNext()
    await waitFor(() => sink.of('play').some((e) => e.src === playlist[1].src), 'the second entry to play on the stage')
    expect(stage.hasNext).toBe(false)
  })
})
