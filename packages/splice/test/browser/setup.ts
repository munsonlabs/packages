import { afterEach, beforeEach } from 'vite-plus/test'

/**
 * Evidence for a failed browser spec. Every WebCodecs encoder and decoder is counted as it works
 * (inputs, outputs, flushes, errors), and when a test fails the ones it made are logged with their
 * state and queue, beside every `<video>`'s state, as `SPLICE_CODECS`. A test timeout says only that
 * something hung; this says what. It is how an encoder that takes frames and never outputs or errors
 * (WebKit, with the machine's H.264 encoder shared by three engines at once; see `vite.config.ts`)
 * was told apart from slow work. The constructors are wrapped in Proxies, so `instanceof` and the
 * static methods behave as before, and `trackFrames()` in `helpers.ts` wraps over them.
 */

interface CodecRecord {
  describe(): string
}

const KINDS = ['VideoEncoder', 'VideoDecoder', 'AudioEncoder', 'AudioDecoder'] as const
const records: CodecRecord[] = []
const started = performance.now()
const now = () => `${((performance.now() - started) / 1000).toFixed(2)}s`

for (const kind of KINDS) {
  const Codec = (globalThis as Record<string, any>)[kind]
  if (!Codec) continue
  ;(globalThis as Record<string, any>)[kind] = new Proxy(Codec, {
    construct(target, [init], newTarget) {
      const counts = { configure: 0, input: 0, output: 0, flush: 0, flushed: 0, error: 0 }
      let config = ''
      let last = `created@${now()}`
      const codec = Reflect.construct(
        target,
        [
          {
            ...init,
            output: (...args: unknown[]) => {
              counts.output++
              last = `output@${now()}`
              return init.output(...args)
            },
            error: (error: Error) => {
              counts.error++
              last = `error@${now()} ${error?.message}`
              return init.error(error)
            },
          },
        ],
        newTarget,
      )
      const configure = codec.configure.bind(codec)
      codec.configure = (options: { codec: string; width?: number; height?: number; sampleRate?: number }) => {
        counts.configure++
        config = [options.codec, options.width && `${options.width}x${options.height}`, options.sampleRate && `${options.sampleRate}Hz`]
          .filter(Boolean)
          .join(' ')
        return configure(options)
      }
      const method = kind.endsWith('Encoder') ? 'encode' : 'decode'
      const input = codec[method].bind(codec)
      codec[method] = (...args: unknown[]) => {
        counts.input++
        return input(...args)
      }
      const flush = codec.flush.bind(codec)
      codec.flush = () => {
        counts.flush++
        last = `flush@${now()}`
        return flush().then(() => {
          counts.flushed++
        })
      }
      records.push({
        describe: () =>
          `${kind} ${config} state=${codec.state} queue=${codec.encodeQueueSize ?? codec.decodeQueueSize} ${JSON.stringify(counts)} last=${last}`,
      })
      return codec
    },
  })
}

let first = 0
beforeEach(() => {
  first = records.length
})

afterEach((ctx) => {
  if (ctx.task.result?.state !== 'fail') return
  const codecs = records.slice(first).map((record) => record.describe())
  const videos = Array.from(
    document.querySelectorAll('video'),
    (video) =>
      `<video> readyState=${video.readyState} networkState=${video.networkState} currentTime=${video.currentTime.toFixed(3)} ` +
      `paused=${video.paused} seeking=${video.seeking} error=${video.error?.code ?? 'none'}`,
  )
  console.log(`SPLICE_CODECS at ${now()} for "${ctx.task.name}":\n  ${[...codecs, ...videos].join('\n  ') || 'no codecs or <video>s'}`)
})
