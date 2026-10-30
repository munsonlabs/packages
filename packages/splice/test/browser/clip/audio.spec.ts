import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { canEncodeAudio } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import opusUrl from '@test/browser/media/flower-opus.mp4?url'
import { canSplice, createSplice } from '@/index'
import { engine, playable, probe } from '@test/browser/helpers'

/**
 * Clips are MP4 with AAC audio. These specs pin what happens to each kind of source audio, and force
 * the case Firefox meets naturally (no AAC encoder) in every engine by answering Mediabunny's
 * `canEncodeAudio('aac')` with `false` while `aac.off` is set. `flower-opus.mp4` is `flower.mp4`'s
 * first 3 seconds with Opus audio (`scripts/make-fixture.mjs opus`).
 */
const aac = vi.hoisted(() => ({ off: false }))
vi.mock('mediabunny', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mediabunny')>()
  return {
    ...actual,
    canEncodeAudio: (codec: Parameters<typeof actual.canEncodeAudio>[0], options?: Parameters<typeof actual.canEncodeAudio>[1]) =>
      aac.off && codec === 'aac' ? Promise.resolve(false) : actual.canEncodeAudio(codec, options),
  }
})

afterEach(() => {
  aac.off = false
})

describe('clip audio', () => {
  it('copies AAC from a source that has it, with or without an AAC encoder', async () => {
    const source = (await probe(await (await fetch(flowerUrl)).blob())).audio!
    expect(source.codec).toBe('mp4a.40.2')

    for (const off of [false, true]) {
      aac.off = off
      expect(await canSplice(flowerUrl), `AAC encoder off: ${off}`).toMatchObject({ ok: true, plan: { audio: 'copy' } })

      const warnings: string[] = []
      const clip = await createSplice({ source: flowerUrl, start: 1, end: 3, onWarning: (message) => warnings.push(message) })
      const probed = await probe(clip)
      expect(probed.format).toBe('MP4')
      // Copied packets keep the source's AAC exactly: same codec string, rate and channels.
      expect(probed.audio, `AAC encoder off: ${off}`).toEqual(source)
      expect(warnings).toEqual([])
    }
  })

  it('makes a silent MP4 and warns for non-AAC audio without an AAC encoder', async () => {
    aac.off = true
    expect(await canSplice(opusUrl)).toMatchObject({ ok: true, info: { audioCodec: 'opus' }, plan: { audio: 'unavailable' } })

    const warnings: string[] = []
    const crop = { aspect: '16:9', height: 540 } as const
    const clip = await createSplice({ source: opusUrl, start: 0.5, end: 2.5, crop, onWarning: (message) => warnings.push(message) })
    const probed = await probe(clip)
    console.log(`SPLICE_AUDIO ${engine()} opus source, no AAC encoder: ${probed.mimeType}`)

    expect(probed.format).toBe('MP4')
    expect(probed.video?.codec).toMatch(/^avc1\./)
    expect(probed.audio).toBeNull()
    expect(Math.abs(probed.duration - 2)).toBeLessThan(0.15)
    expect(warnings).toEqual([expect.stringContaining('opus')])
    expect((await playable(clip)).videoHeight).toBe(540)
  })

  it('encodes non-AAC audio as AAC where this browser can, and leaves it out where it can’t', async () => {
    const encoder = await canEncodeAudio('aac', { sampleRate: 48_000, numberOfChannels: 2 })
    const check = await canSplice(opusUrl)
    console.log(`SPLICE_AUDIO ${engine()} opus source, AAC encoder ${encoder}: ${JSON.stringify(check.ok ? check.plan : check)}`)
    expect(check).toMatchObject({ ok: true, plan: { audio: encoder ? 'encode' : 'unavailable' } })

    const warnings: string[] = []
    const crop = { aspect: '16:9', height: 540 } as const
    const clip = await createSplice({ source: opusUrl, start: 0.5, end: 2.5, crop, onWarning: (message) => warnings.push(message) })
    expect((await probe(clip)).audio?.codec ?? null).toBe(encoder ? 'mp4a.40.2' : null)
    expect(warnings).toHaveLength(encoder ? 0 : 1)
  })

  it('drops audio for audio: false, without a warning', async () => {
    aac.off = true
    expect(await canSplice(opusUrl, { audio: false })).toMatchObject({ ok: true, plan: { audio: 'none' } })

    const warnings: string[] = []
    const clip = await createSplice({ source: opusUrl, start: 0, end: 1, audio: false, onWarning: (message) => warnings.push(message) })
    expect((await probe(clip)).audio).toBeNull()
    expect(warnings).toEqual([])
  })

  it('warns through console.warn without an onWarning handler', async () => {
    aac.off = true
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await createSplice({ source: opusUrl, start: 0, end: 1 })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('The audio is left out'))
    warn.mockRestore()
  })
})
