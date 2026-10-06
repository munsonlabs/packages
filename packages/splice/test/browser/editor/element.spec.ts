import { afterEach, describe, expect, inject, it, vi } from 'vite-plus/test'
import '@munsonlabs/video-player/element'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import opusUrl from '@test/browser/media/flower-opus.mp4?url'
import type { SpliceEditorElement } from '@/elements'
import type { EditorExportDetail } from '@/types/editor'
import { changedFraction, colourAt, pixelsAt } from '@test/browser/helpers'
import { waitFor, type PlayerElement } from '@test/browser/editor-harness'

vi.mock('@/editor/labels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/editor/labels')>()),
  CLIP_LENGTH: 2,
  LONGEST_CLIP: 3,
}))

const server = inject('logoServer')
let host: HTMLElement | null = null

afterEach(() => {
  host?.querySelector<SpliceEditorElement>('ml-splice-editor')?.close()
  host?.remove()
  host = null
  localStorage.clear()
})

/** A page of plain HTML: a player and an editor pointed at it by id, as a page without a framework writes them. */
async function mountPage(
  editorAttributes = '',
): Promise<{ player: PlayerElement; editor: SpliceEditorElement; events: Array<{ type: string; detail: unknown }> }> {
  await import('@/elements')
  host = document.createElement('div')
  host.innerHTML = `
    <ml-video-player id="article-player" src="${flowerUrl}" muted style="display:block;width:480px"></ml-video-player>
    <ml-splice-editor for="article-player" ${editorAttributes}></ml-splice-editor>`
  document.body.append(host)

  const player = host.querySelector<PlayerElement>('ml-video-player')!
  const editor = host.querySelector<SpliceEditorElement>('ml-splice-editor')!
  const events: Array<{ type: string; detail: unknown }> = []
  for (const type of ['splice-open', 'splice-close', 'splice-export', 'splice-error']) {
    host.addEventListener(type, (event) => events.push({ type, detail: (event as CustomEvent).detail }))
  }

  await waitFor(() => player.isLoaded === true && Boolean(player.mediaElement), 'the player to load')
  player.seek(2)
  await waitFor(() => Math.abs(player.currentTime - 2) < 0.2, 'the player at 2s')
  return { player, editor, events }
}

describe('<ml-splice-editor>', () => {
  it('registers itself and puts its stylesheet on the page once', async () => {
    await import('@/elements')
    expect(customElements.get('ml-splice-editor')).toBeDefined()
    expect(document.querySelectorAll('style[data-splice-editor]')).toHaveLength(1)
  })

  it('clips the player named by for, reflecting open and its state, with bubbling splice-* events', async () => {
    const { player, editor, events } = await mountPage()
    editor.origin = { url: 'https://example.com/watch/flower', title: 'A flower opens' }
    editor.endCard = false

    editor.show()
    await waitFor(() => editor.dataset.state === 'editing', 'the editor')
    expect(editor.state).toBe('editing')
    expect(editor.hasAttribute('open')).toBe(true)
    expect(events.map((event) => event.type)).toEqual(['splice-open'])
    expect(player.clipRange).toEqual({ start: 1.3, end: 3.3 })
    expect(player.contains(player.querySelector('.splice-crop'))).toBe(true)

    await editor.export()
    await waitFor(() => events.some((event) => event.type === 'splice-export'), 'the export event', 60_000)
    const detail = events.find((event) => event.type === 'splice-export')!.detail as EditorExportDetail
    expect(detail).toMatchObject({ start: 1.3, end: 3.3, link: 'https://example.com/watch/flower#ml-t=1.3,3.3' })
    expect(detail.blob.type).toBe('video/mp4')

    editor.removeAttribute('open')
    await waitFor(() => editor.dataset.state === 'closed', 'removing open to close it')
    expect(player.clipRange).toBeNull()

    editor.show()
    await waitFor(() => editor.dataset.state === 'editing', 'the editor again')
    editor.querySelector<HTMLButtonElement>('.splice-close')!.click()
    await waitFor(() => !editor.hasAttribute('open'), 'the close button to remove open')
    expect(events.map((event) => event.type).filter((type) => type !== 'splice-export')).toEqual([
      'splice-open',
      'splice-close',
      'splice-open',
      'splice-close',
    ])
  })

  it('passes the logo, end card, watermark and origin set as properties into the clip', { timeout: 90_000 }, async () => {
    const { editor, events } = await mountPage()
    const logo = `${server}/red-cors.png`
    const origin = { url: 'https://example.com/watch/flower', title: 'A flower opens', publisher: 'Example News', player: 'article-player' }
    Object.assign(editor, {
      origin,
      stamp: { logo, opacity: 1 },
      endCard: { logo, displayUrl: 'example.com/flower', duration: 0.5 },
      watermark: { text: 'example.com' },
    })

    editor.show()
    await waitFor(() => editor.dataset.state === 'editing', 'the editor')
    await editor.export()
    await waitFor(() => events.some((event) => event.type === 'splice-export'), 'the export', 60_000)
    const branded = events.find((event) => event.type === 'splice-export')!.detail as EditorExportDetail

    // The link back names the player, and the MP4's metadata carries it.
    expect(branded.link).toBe('https://example.com/watch/flower#ml-t=1.3,3.3&ml-player=article-player')
    const { ALL_FORMATS, BlobSource, Input } = await import('mediabunny')
    const input = new Input({ source: new BlobSource(branded.blob), formats: ALL_FORMATS })
    expect((await input.getMetadataTags()).comment).toBe(branded.link)
    input.dispose()
    expect(events.filter((event) => event.type === 'splice-error')).toEqual([])

    // The stamp, in the top-right corner of the clip's frames.
    const { STAMP_MARGINS, STAMP_SIZE } = await import('@/constants')
    const side = Math.round(STAMP_SIZE * 1080)
    const stampX = 1080 - Math.round(STAMP_MARGINS['top-right'].x * 1080) - side / 2
    const stampY = Math.round(STAMP_MARGINS['top-right'].y * 1920) + side / 2
    const [r, g, b] = colourAt(await pixelsAt(branded.blob, 1), stampX, stampY, 20)
    expect(r).toBeGreaterThan(180)
    expect(g + b).toBeLessThan(180)

    // The end card's logo: once the card has faded in it covers the clip, so red can only be the logo.
    const card = await pixelsAt(branded.blob, 2.45)
    let red = 0
    for (let i = 0; i < card.data.length; i += 4) if (card.data[i] > 180 && card.data[i + 1] < 90 && card.data[i + 2] < 90) red++
    expect(red).toBeGreaterThan(1000)

    // The watermark, against the same clip made without it.
    editor.querySelector<HTMLButtonElement>('.splice-again')!.click()
    await waitFor(() => editor.dataset.state === 'editing', 'the editor again')
    editor.watermark = undefined
    editor.stamp = undefined
    await editor.export()
    await waitFor(() => events.filter((event) => event.type === 'splice-export').length === 2, 'the second export', 60_000)
    const plain = (events.filter((event) => event.type === 'splice-export')[1].detail as EditorExportDetail).blob
    const [withMark, without] = await Promise.all([pixelsAt(branded.blob, 1), pixelsAt(plain, 1)])
    expect(changedFraction(withMark, without, 4, 60, 30)).toBeGreaterThan(0.5)
  })

  it('opens from the open attribute and clips the file given as src', async () => {
    const { editor } = await mountPage(`src="${new URL(flowerUrl, location.href).href}"`)
    editor.setAttribute('open', '')
    await waitFor(() => editor.dataset.state === 'editing', 'the open attribute to open it')
    expect(Number(editor.querySelector('.splice-handle[data-handle="end"]')!.getAttribute('aria-valuemax'))).toBeGreaterThan(4.5)
  })

  it('takes the caption position as an attribute', async () => {
    const { editor } = await mountPage('caption-position="top"')
    expect(editor.captionPosition).toBe('top')
  })

  it('takes the clip length, the clip limits, the timeline span and the height as numbers from attributes', async () => {
    const { editor } = await mountPage('clip-length="15" shortest-clip="2" longest-clip="30" timeline-span="120" height="720"')
    expect([editor.clipLength, editor.shortestClip, editor.longestClip, editor.timelineSpan, editor.height]).toEqual([15, 2, 30, 120, 720])
  })

  it('reports a player that isn’t on the page as a fatal splice-error', async () => {
    await import('@/elements')
    host = document.createElement('div')
    host.innerHTML = `<ml-splice-editor for="no-such-player" src="${opusUrl}"></ml-splice-editor>`
    document.body.append(host)
    const errors: unknown[] = []
    host.addEventListener('splice-error', (event) => errors.push((event as CustomEvent).detail))

    host.querySelector<SpliceEditorElement>('ml-splice-editor')!.show()
    await waitFor(() => errors.length > 0, 'the error')
    expect(errors[0]).toMatchObject({ fatal: true, message: expect.stringContaining('no player') })
  })
})
