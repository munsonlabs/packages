import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { canEncodeAudio } from 'mediabunny'
import flowerUrl from '@test/browser/media/flower.mp4?url'
import opusUrl from '@test/browser/media/flower-opus.mp4?url'
import { canClip, createClip, type ClipWarning } from '@/index'
import type { ReelErrorDetail } from '@/elements'
import { engine, playable, probe } from '@test/browser/helpers'
import { PickerHarness } from '@test/browser/picker-harness'

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

const harness = new PickerHarness()
afterEach(() => {
  aac.off = false
  harness.cleanup()
})

describe('clip audio', () => {
  it('copies AAC from a source that has it, with or without an AAC encoder', async () => {
    const source = (await probe(await (await fetch(flowerUrl)).blob())).audio!
    expect(source.codec).toBe('mp4a.40.2')
    for (const off of [false, true]) {
      aac.off = off
      const check = await canClip(flowerUrl)
      expect(check, `AAC encoder off: ${off}`).toMatchObject({ ok: true, plan: { audio: 'copy' } })
      const warnings: ClipWarning[] = []
      const clip = await createClip({ source: flowerUrl, start: 1, end: 3, onWarning: (warning) => warnings.push(warning) })
      const probed = await probe(clip)
      expect(clip.type).toBe('video/mp4')
      expect(probed.format).toBe('MP4')
      // Copied packets keep the source's AAC exactly: same codec string, rate and channels.
      expect(probed.audio, `AAC encoder off: ${off}`).toEqual(source)
      expect(warnings).toEqual([])
    }
  })

  it('makes a silent MP4 and warns audio-unavailable for non-AAC audio without an AAC encoder', async () => {
    aac.off = true
    expect(await canClip(opusUrl)).toMatchObject({ ok: true, info: { audioCodec: 'opus' }, plan: { audio: 'unavailable' } })
    const warnings: ClipWarning[] = []
    const clip = await createClip({ source: opusUrl, start: 0.5, end: 2.5, crop: { height: 540 }, onWarning: (warning) => warnings.push(warning) })
    const probed = await probe(clip)
    console.log(`REEL_AUDIO ${engine()} opus source, no AAC encoder: ${probed.mimeType}`)
    expect(clip.type).toBe('video/mp4')
    expect(probed.format).toBe('MP4')
    expect(probed.video?.codec).toMatch(/^avc1\./)
    expect(probed.audio).toBeNull()
    expect(Math.abs(probed.duration - 2)).toBeLessThan(0.15)
    expect(warnings).toEqual([{ reason: 'audio-unavailable', target: 'audio', message: expect.stringContaining('opus') }])
    expect((await playable(clip)).videoHeight).toBe(540)
  })

  it('encodes non-AAC audio as AAC where this browser can, and leaves it out where it cannot', async () => {
    const encoder = await canEncodeAudio('aac', { sampleRate: 48_000, numberOfChannels: 2 })
    const check = await canClip(opusUrl)
    console.log(`REEL_AUDIO ${engine()} opus source, AAC encoder ${encoder}: ${JSON.stringify(check.ok ? check.plan : check)}`)
    expect(check).toMatchObject({ ok: true, plan: { audio: encoder ? 'encode' : 'unavailable' } })
    const warnings: ClipWarning[] = []
    const clip = await createClip({ source: opusUrl, start: 0.5, end: 2.5, crop: { height: 540 }, onWarning: (warning) => warnings.push(warning) })
    const probed = await probe(clip)
    expect(probed.audio?.codec ?? null).toBe(encoder ? 'mp4a.40.2' : null)
    expect(warnings.map((warning) => warning.reason)).toEqual(encoder ? [] : ['audio-unavailable'])
    expect((await playable(clip)).videoHeight).toBe(540)
  })

  it('drops audio for audio: false, without a warning', async () => {
    aac.off = true
    expect(await canClip(opusUrl, { audio: false })).toMatchObject({ ok: true, plan: { audio: 'none' } })
    const warnings: ClipWarning[] = []
    const clip = await createClip({ source: opusUrl, start: 0, end: 1, audio: false, onWarning: (warning) => warnings.push(warning) })
    expect((await probe(clip)).audio).toBeNull()
    expect(warnings).toEqual([])
  })

  it('warns through console.warn without an onWarning handler', async () => {
    aac.off = true
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await createClip({ source: opusUrl, start: 0, end: 1 })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('the audio is left out'))
    } finally {
      warn.mockRestore()
    }
  })
})

describe('<ml-reel-picker> and a silent clip', () => {
  it('notes it on the finished clip and fires a non-fatal reel-error', async () => {
    aac.off = true
    const picker = await harness.open({ endCard: false }, { src: opusUrl, time: 1 })
    const blob = await harness.export()
    expect(picker.state).toBe('done')
    expect((await probe(blob)).audio).toBeNull()
    expect(harness.part('.reel-warning').textContent).toBe('This browser cannot write the sound as AAC, so the clip is silent.')
    const errors = harness.of('reel-error').map((event) => event.detail as ReelErrorDetail)
    expect(errors.filter((error) => error.reason === 'audio-unavailable')).toEqual([
      { reason: 'audio-unavailable', message: expect.stringContaining('the audio is left out'), fatal: false },
    ])
    expect(errors.filter((error) => error.fatal)).toEqual([])
  })
})
