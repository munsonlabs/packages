import { describe, it, expect } from 'vite-plus/test'
import '@/elements/index'
import { CLIP_URL } from '@test/browser/catalogue'
import { waitFor } from '@test/browser/harness'

describe('nesting a control inside <ml-video-player>', () => {
  it('is not supported: the child is dropped, so custom-element consumers use `for`', async () => {
    const host = document.createElement('div')
    host.innerHTML = `
      <ml-video-player src="${CLIP_URL}" muted>
        <ml-video-play-button></ml-video-play-button>
      </ml-video-player>`
    document.body.appendChild(host)

    const player = host.querySelector('ml-video-player')!
    await waitFor(() => !!player.querySelector('.player__shell'), 'the player to render')

    expect(host.querySelector('ml-video-play-button')).toBeNull()
    expect(player.querySelector('.player__custom-hud')).toBeNull()
    host.remove()
  })

  it('works through `for`, which is the custom-element way', async () => {
    const host = document.createElement('div')
    host.innerHTML = `
      <ml-video-player id="fitted" src="${CLIP_URL}" muted autoplay></ml-video-player>
      <ml-video-play-button for="fitted"></ml-video-play-button>`
    document.body.appendChild(host)

    const player = host.querySelector('ml-video-player') as HTMLElement & { isPlaying: boolean }
    const control = host.querySelector('ml-video-play-button')!

    await waitFor(() => !!control.querySelector('button'), 'the control to render')
    await waitFor(() => player.isPlaying === true, 'the player to start')

    control.querySelector('button')!.click()
    await waitFor(() => player.isPlaying === false, 'the control to pause the player')

    host.remove()
  })
})
