/**
 * Generates the browser-test fixtures that are not copied from video-player:
 *
 * - `count-720p.mp4`: 12 seconds of 1280x720 H.264 at 30fps with stereo AAC, a clock and a moving
 *   marker drawn on every frame and a tone that changes pitch each second.
 * - `rotated-90.mp4` and `rotated-270.mp4`: what a phone writes when held upright. 2 seconds of H.264
 *   stored landscape (640x480) with a rotation in the track header (`tkhd` matrix), so they display as
 *   480x640 portrait. The picture, as displayed, has four coloured quadrants (red top-left, green
 *   top-right, blue bottom-left, yellow bottom-right) so a test can tell upright from sideways.
 *
 * - `ladder/`: an HLS master playlist with two variants of the same 4 seconds, 320x180 and
 *   1280x720, each H.264 + AAC in 1-second MPEG-TS segments (made with Mediabunny's HLS output), and
 *   a subtitles group in English (`DEFAULT=YES`) and French as segmented WebVTT. The media starts at
 *   10s (PTS 900000), as Apple's and Mux's segmenters do, and the subtitle segments carry
 *   `X-TIMESTAMP-MAP=MPEGTS:945000,LOCAL:00:00:00.000`, so a cue written at `00:00:01.000` belongs at
 *   1.5s on the clip timeline. `broken.m3u8` is the same master with the small variant's segments
 *   missing, to make thumbnails fail while the source itself still checks out.
 * - `clock/`: the example the demo and the docs play, written to the demo (the docs serve it from
 *   there). The same 12 seconds as `count-720p.mp4` as HLS, in 1280x720 and 640x360 variants of
 *   H.264 + AAC in 2-second MPEG-TS segments, with English captions as a WebVTT subtitles rendition
 *   (`DEFAULT=YES`). Like `ladder/`, the media starts at 10s and the captions carry
 *   `X-TIMESTAMP-MAP=MPEGTS:900000`.
 * - `flower-opus.mp4`: the first 3 seconds of `flower.mp4` with its H.264 video copied and its audio
 *   encoded as Opus, a source whose audio is not AAC (splice's clips are AAC, so that audio is either
 *   encoded as AAC or, without an AAC encoder, left out).
 *
 * There is no ffmpeg in the toolchain, so the files are made the same way splice makes clips: Mediabunny
 * driving WebCodecs, here inside Playwright's Chromium. They are committed, so tests never depend on
 * this script; rerun it only to change a fixture: `node scripts/make-fixture.mjs [count] [rotated] [ladder] [clock] [opus]`
 * (no argument makes all of them).
 */
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundle = fileURLToPath(import.meta.resolve('mediabunny').replace(/modules\/src\/index\.js$/, 'bundles/mediabunny.mjs'))
const media = (name) => fileURLToPath(new URL(`../test/browser/media/${name}`, import.meta.url))
const wanted = process.argv.slice(2)
const make = (name) => wanted.length === 0 || wanted.includes(name)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.route('http://localhost:1/**', async (route) => {
  const path = new URL(route.request().url()).pathname
  if (path === '/mediabunny.mjs') {
    await route.fulfill({ body: await readFile(bundle), contentType: 'text/javascript' })
    return
  }
  if (path === '/flower.mp4') {
    await route.fulfill({ body: await readFile(media('flower.mp4')), contentType: 'video/mp4' })
    return
  }
  await route.fulfill({ body: '<!doctype html><title>fixture</title>', contentType: 'text/html' })
})
await page.goto('http://localhost:1/')

async function save(name, base64) {
  await writeFile(media(name), Buffer.from(base64, 'base64'))
  console.log(`wrote ${media(name)}`)
}

if (make('count')) {
  const base64 = await page.evaluate(async () => {
    const mb = await import('/mediabunny.mjs')
    const width = 1280
    const height = 720
    const fps = 30
    const seconds = 12
    const sampleRate = 48000

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: 1_500_000, keyFrameInterval: 2 })
    const audio = new mb.AudioBufferSource({ codec: 'aac', bitrate: 128_000 })
    output.addVideoTrack(video, { frameRate: fps })
    output.addAudioTrack(audio)
    await output.start()

    for (let i = 0; i < fps * seconds; i++) {
      const t = i / fps
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, `hsl(${(t * 30) % 360} 70% 35%)`)
      gradient.addColorStop(1, `hsl(${(t * 30 + 120) % 360} 70% 25%)`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      for (let x = 0; x <= width; x += 160) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      ctx.fillStyle = '#ffd400'
      ctx.beginPath()
      ctx.arc((t / seconds) * width, height / 2 + Math.sin(t * 3) * 200, 40, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 120px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.toFixed(2), width / 2, height / 2)
      await video.add(t, 1 / fps)
    }

    for (let s = 0; s < seconds; s++) {
      const buffer = new AudioBuffer({ length: sampleRate, numberOfChannels: 2, sampleRate })
      const frequency = 220 + s * 55
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c)
        for (let n = 0; n < sampleRate; n++) {
          data[n] = 0.2 * Math.sin((2 * Math.PI * frequency * n) / sampleRate)
        }
      }
      await audio.add(buffer)
    }

    await output.finalize()
    const bytes = new Uint8Array(output.target.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return btoa(binary)
  })

  await save('count-720p.mp4', base64)
}

if (make('rotated')) {
  for (const rotation of [90, 270]) {
    const base64 = await page.evaluate(async (rotation) => {
      const mb = await import('/mediabunny.mjs')
      // Displayed size; the stored frames are the same picture turned the other way, 640x480.
      const width = 480
      const height = 640
      const fps = 30
      const seconds = 2
      const sampleRate = 48000

      const display = new OffscreenCanvas(width, height)
      const dctx = display.getContext('2d')
      const stored = new OffscreenCanvas(height, width)
      const sctx = stored.getContext('2d')
      const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
      const video = new mb.CanvasSource(stored, { codec: 'avc', bitrate: 400_000, keyFrameInterval: 1 })
      const audio = new mb.AudioBufferSource({ codec: 'aac', bitrate: 64_000 })
      output.addVideoTrack(video, { frameRate: fps, rotation })
      output.addAudioTrack(audio)
      await output.start()

      for (let i = 0; i < fps * seconds; i++) {
        const t = i / fps
        dctx.fillStyle = '#e01010'
        dctx.fillRect(0, 0, width / 2, height / 2)
        dctx.fillStyle = '#10c010'
        dctx.fillRect(width / 2, 0, width / 2, height / 2)
        dctx.fillStyle = '#1030e0'
        dctx.fillRect(0, height / 2, width / 2, height / 2)
        dctx.fillStyle = '#f0d000'
        dctx.fillRect(width / 2, height / 2, width / 2, height / 2)
        dctx.fillStyle = '#fff'
        dctx.font = 'bold 64px sans-serif'
        dctx.textAlign = 'center'
        dctx.textBaseline = 'middle'
        dctx.fillText(`UP ${t.toFixed(1)}`, width / 2, height / 2)

        // A display rotation of R degrees clockwise means the stored frame is the picture turned R
        // degrees counter-clockwise.
        sctx.save()
        sctx.translate(stored.width / 2, stored.height / 2)
        sctx.rotate((-rotation * Math.PI) / 180)
        sctx.drawImage(display, -width / 2, -height / 2)
        sctx.restore()
        await video.add(t, 1 / fps)
      }

      const buffer = new AudioBuffer({ length: sampleRate * seconds, numberOfChannels: 1, sampleRate })
      const data = buffer.getChannelData(0)
      for (let n = 0; n < data.length; n++) {
        data[n] = 0.2 * Math.sin((2 * Math.PI * 440 * n) / sampleRate)
      }
      await audio.add(buffer)

      await output.finalize()
      const bytes = new Uint8Array(output.target.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      return btoa(binary)
    }, rotation)
    await save(`rotated-${rotation}.mp4`, base64)
  }
}

if (make('ladder')) {
  const dir = (name) => fileURLToPath(new URL(`../test/browser/media/ladder/${name}`, import.meta.url))
  await mkdir(dir('small'), { recursive: true })
  await mkdir(dir('large'), { recursive: true })
  await mkdir(dir('subs'), { recursive: true })
  const variants = [
    { name: 'small', width: 320, height: 180, bitrate: 250_000 },
    { name: 'large', width: 1280, height: 720, bitrate: 1_200_000 },
  ]
  const seconds = 4
  const offset = 10
  const codecs = {}
  for (const variant of variants) {
    const files = await page.evaluate(
      async ({ variant, seconds, offset }) => {
        const mb = await import('/mediabunny.mjs')
        const { width, height } = variant
        const fps = 30
        const sampleRate = 48000
        const targets = new Map()
        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')
        const output = new mb.Output({
          format: new mb.HlsOutputFormat({
            segmentFormat: new mb.MpegTsOutputFormat(),
            targetDuration: 1,
            getPlaylistPath: () => 'playlist.m3u8',
            // Not `.ts`: the Vite server that serves the fixtures would compile that as TypeScript.
            getSegmentPath: (info) => `seg${info.n - 1}.m2ts`,
          }),
          target: new mb.PathedTarget('master.m3u8', (request) => {
            const target = new mb.BufferTarget()
            targets.set(request.path, target)
            return target
          }),
        })
        const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: variant.bitrate, keyFrameInterval: 1 })
        const audio = new mb.AudioSampleSource({ codec: 'aac', bitrate: 128_000 })
        output.addVideoTrack(video, { frameRate: fps })
        output.addAudioTrack(audio)
        await output.start()
        for (let i = 0; i < fps * seconds; i++) {
          const t = i / fps
          ctx.fillStyle = `hsl(${(t * 60) % 360} 60% 35%)`
          ctx.fillRect(0, 0, width, height)
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${Math.round(height / 4)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(`${height}p ${t.toFixed(1)}`, width / 2, height / 2)
          await video.add(offset + t, 1 / fps)
        }
        // One second at a time, timestamped from the same offset as the video.
        for (let s = 0; s < seconds; s++) {
          const data = new Float32Array(sampleRate * 2)
          for (let n = 0; n < sampleRate; n++) {
            const value = 0.2 * Math.sin((2 * Math.PI * 330 * n) / sampleRate)
            data[n] = value
            data[sampleRate + n] = value
          }
          const sample = new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate, timestamp: offset + s })
          await audio.add(sample)
          sample.close()
        }
        await output.finalize()
        const result = {}
        for (const [path, target] of targets) {
          const bytes = new Uint8Array(target.buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
          }
          result[path] = btoa(binary)
        }
        return result
      },
      { variant, seconds, offset },
    )
    const master = Buffer.from(files['master.m3u8'], 'base64').toString()
    codecs[variant.name] = /CODECS="([^"]+)"/.exec(master)?.[1]
    for (const [path, base64] of Object.entries(files)) {
      if (path !== 'master.m3u8') {
        await writeFile(dir(`${variant.name}/${path}`), Buffer.from(base64, 'base64'))
      }
    }
    console.log(`wrote ${dir(variant.name)} (${Object.keys(files).length - 1} files, ${codecs[variant.name]})`)
  }

  const subtitles = [
    'GROUP-ID="subs",LANGUAGE="en",NAME="English",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,URI="subs/en.m3u8"',
    'GROUP-ID="subs",LANGUAGE="fr",NAME="Français",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="subs/fr.m3u8"',
  ].map((attributes) => `#EXT-X-MEDIA:TYPE=SUBTITLES,${attributes}`)
  const master = (small) =>
    [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      ...subtitles,
      `#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720,CODECS="${codecs.large}",SUBTITLES="subs"`,
      'large/playlist.m3u8',
      `#EXT-X-STREAM-INF:BANDWIDTH=350000,RESOLUTION=320x180,CODECS="${codecs.small}",SUBTITLES="subs"`,
      small,
      '',
    ].join('\n')
  await writeFile(dir('master.m3u8'), master('small/playlist.m3u8'))
  await writeFile(dir('broken.m3u8'), master('small/broken.m3u8'))
  const smallPlaylist = await readFile(dir('small/playlist.m3u8'), 'utf8')
  await writeFile(dir('small/broken.m3u8'), smallPlaylist.replace(/seg(\d+)\.m2ts/g, 'missing$1.m2ts'))

  const words = { en: ['zero', 'one', 'two', 'three'], fr: ['zéro', 'un', 'deux', 'trois'] }
  const stamp = (s) => `00:00:${String(s).padStart(2, '0')}.000`
  for (const [language, list] of Object.entries(words)) {
    const playlist = ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:1', '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-PLAYLIST-TYPE:VOD']
    for (let i = 0; i < seconds; i++) {
      // MPEGTS 945000 is media time 10.5s, half a second after the first frame: cue time 0 is clip time 0.5.
      const cue =
        i < seconds - 1
          ? `${stamp(i)} --> ${stamp(i + 1)}\n${language.toUpperCase()} ${list[i]}`
          : `${stamp(i)} --> 00:00:03.500\n${language.toUpperCase()} ${list[i]}`
      await writeFile(dir(`subs/${language}-${i}.vtt`), `WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:945000,LOCAL:00:00:00.000\n\n${cue}\n`)
      playlist.push('#EXTINF:1.0,', `${language}-${i}.vtt`)
    }
    playlist.push('#EXT-X-ENDLIST', '')
    await writeFile(dir(`subs/${language}.m3u8`), playlist.join('\n'))
  }
  console.log(`wrote ${dir('master.m3u8')}, broken.m3u8 and subs/`)
}

if (make('clock')) {
  const roots = ['../../../apps/demos/splice/public/media/clock/']
  const write = async (name, body) => {
    for (const root of roots) {
      const path = fileURLToPath(new URL(`${root}${name}`, import.meta.url))
      await mkdir(fileURLToPath(new URL('.', new URL(`${root}${name}`, import.meta.url))), { recursive: true })
      await writeFile(path, body)
    }
  }
  const variants = [
    { name: '360p', width: 640, height: 360, bitrate: 600_000 },
    { name: '720p', width: 1280, height: 720, bitrate: 1_500_000 },
  ]
  const seconds = 12
  const offset = 10
  const codecs = {}
  for (const variant of variants) {
    const files = await page.evaluate(
      async ({ variant, seconds, offset }) => {
        const mb = await import('/mediabunny.mjs')
        const { width, height } = variant
        const fps = 30
        const sampleRate = 48000
        const targets = new Map()
        const canvas = new OffscreenCanvas(width, height)
        const ctx = canvas.getContext('2d')
        const output = new mb.Output({
          format: new mb.HlsOutputFormat({
            segmentFormat: new mb.MpegTsOutputFormat(),
            targetDuration: 2,
            getPlaylistPath: () => 'playlist.m3u8',
            getSegmentPath: (info) => `seg${info.n - 1}.m2ts`,
          }),
          target: new mb.PathedTarget('master.m3u8', (request) => {
            const target = new mb.BufferTarget()
            targets.set(request.path, target)
            return target
          }),
        })
        const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: variant.bitrate, keyFrameInterval: 2 })
        const audio = new mb.AudioSampleSource({ codec: 'aac', bitrate: 128_000 })
        output.addVideoTrack(video, { frameRate: fps })
        output.addAudioTrack(audio)
        await output.start()

        const scale = height / 720
        for (let i = 0; i < fps * seconds; i++) {
          const t = i / fps
          const gradient = ctx.createLinearGradient(0, 0, width, height)
          gradient.addColorStop(0, `hsl(${(t * 30) % 360} 70% 35%)`)
          gradient.addColorStop(1, `hsl(${(t * 30 + 120) % 360} 70% 25%)`)
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, width, height)
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'
          for (let x = 0; x <= width; x += 160 * scale) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          ctx.fillStyle = '#ffd400'
          ctx.beginPath()
          ctx.arc((t / seconds) * width, height / 2 + Math.sin(t * 3) * 200 * scale, 40 * scale, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = `bold ${Math.round(120 * scale)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(t.toFixed(2), width / 2, height / 2)
          await video.add(offset + t, 1 / fps)
        }

        for (let s = 0; s < seconds; s++) {
          const frequency = 220 + s * 55
          const data = new Float32Array(sampleRate * 2)
          for (let n = 0; n < sampleRate; n++) {
            const value = 0.2 * Math.sin((2 * Math.PI * frequency * n) / sampleRate)
            data[n] = value
            data[sampleRate + n] = value
          }
          const sample = new mb.AudioSample({ data, format: 'f32-planar', numberOfChannels: 2, sampleRate, timestamp: offset + s })
          await audio.add(sample)
          sample.close()
        }

        await output.finalize()
        const result = {}
        for (const [path, target] of targets) {
          const bytes = new Uint8Array(target.buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
          }
          result[path] = btoa(binary)
        }
        return result
      },
      { variant, seconds, offset },
    )
    const master = Buffer.from(files['master.m3u8'], 'base64').toString()
    codecs[variant.name] = /CODECS="([^"]+)"/.exec(master)?.[1]
    for (const [path, base64] of Object.entries(files)) {
      if (path !== 'master.m3u8') await write(`${variant.name}/${path}`, Buffer.from(base64, 'base64'))
    }
    console.log(`wrote clock/${variant.name} (${Object.keys(files).length - 1} files, ${codecs[variant.name]})`)
  }

  const cues = [
    'The clock starts at zero.',
    'A gold marker sweeps across the frame.',
    'Every frame is drawn, none are filmed.',
    'The tone climbs a step each second.',
    'Halfway there, and this caption is long enough to wrap onto several lines, and it keeps every word.',
    'Pick a range, drag the crop, export.',
  ]
  const stamp = (s) => `00:00:${String(s).padStart(2, '0')}.000`
  const vtt = cues.map((text, i) => `${stamp(i * 2)} --> ${stamp(i * 2 + 2)}\n${text}`).join('\n\n')
  await write('subs/en.vtt', `WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n${vtt}\n`)
  await write(
    'subs/en.m3u8',
    [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      `#EXT-X-TARGETDURATION:${seconds}`,
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXT-X-PLAYLIST-TYPE:VOD',
      `#EXTINF:${seconds}.0,`,
      'en.vtt',
      '#EXT-X-ENDLIST',
      '',
    ].join('\n'),
  )
  await write(
    'master.m3u8',
    [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="en",NAME="English",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,URI="subs/en.m3u8"',
      `#EXT-X-STREAM-INF:BANDWIDTH=1700000,RESOLUTION=1280x720,CODECS="${codecs['720p']}",SUBTITLES="subs"`,
      '720p/playlist.m3u8',
      `#EXT-X-STREAM-INF:BANDWIDTH=750000,RESOLUTION=640x360,CODECS="${codecs['360p']}",SUBTITLES="subs"`,
      '360p/playlist.m3u8',
      '',
    ].join('\n'),
  )
  console.log('wrote clock/master.m3u8 and clock/subs/ to the demo')
}

if (make('opus')) {
  const base64 = await page.evaluate(async () => {
    const mb = await import('/mediabunny.mjs')
    const input = new mb.Input({ source: new mb.BlobSource(await (await fetch('/flower.mp4')).blob()), formats: mb.ALL_FORMATS })
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() })
    const conversion = await mb.Conversion.init({ input, output, trim: { start: 0, end: 3 }, audio: { codec: 'opus', bitrate: 96_000 } })
    if (!conversion.isValid) {
      throw new Error(`cannot convert: ${JSON.stringify(conversion.discardedTracks.map((track) => track.reason))}`)
    }
    await conversion.execute()
    const bytes = new Uint8Array(output.target.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return btoa(binary)
  })
  await save('flower-opus.mp4', base64)
}

await browser.close()
