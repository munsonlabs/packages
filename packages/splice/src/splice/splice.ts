import { openSource } from './source'
import { getClipRange, planClip } from './plan'
import { createOverlays } from './overlays'
import { createOriginTags } from './origin'
import { createPipeline, encodeVideo, readOutput } from './encode'
import { EncoderStallError } from './watchdog'
import { runScoped } from '@/utils/scope'
import { createProgressReporter } from '@/utils/progress'
import type { AvcProfile } from '@/types/internal'
import type { SpliceOptions } from '@/types/splice'

/**
 * Cuts [start, end) out of a video and resolves with an MP4 (H.264 and AAC), all on the device.
 * Rejects if the source can't be spliced, or with the signal's reason if it's aborted. If the
 * encoder stalls it tries once more with H.264's Baseline profile, and progress only moves forward
 * across both tries.
 */
export function createSplice(options: SpliceOptions): Promise<Blob> {
  const { signal, onProgress } = options
  let reported = 0
  const report = (fraction: number) => {
    if (fraction <= reported) return
    reported = fraction
    onProgress?.(fraction)
  }
  const attempt = (profile: AvcProfile) => writeSplice({ ...options, onProgress: report }, profile)

  return attempt('high').catch((error: unknown) => {
    if (!(error instanceof EncoderStallError) || signal?.aborted) throw error
    return attempt('baseline')
  })
}

/**
 * Makes the clip once, with the given H.264 profile.
 */
function writeSplice(options: SpliceOptions, profile: AvcProfile): Promise<Blob> {
  const { signal } = options

  return runScoped(async (scope) => {
    const source = await openSource(options.source)
    scope.always(() => source.input.dispose())

    const { start, end } = getClipRange(source.info, options)
    const plan = await planClip(source, options)
    const { paint, endCard, dispose } = await createOverlays(options, plan)
    scope.always(dispose)

    const tags = createOriginTags(options.origin, start, end)
    const { ctx, videoSource, watchdog, output, conversion } = await createPipeline(scope, source, plan, { start, end }, tags, profile)
    const total = end - start + (endCard?.duration ?? 0)
    const onTime = createProgressReporter(total, options.onProgress)

    signal?.throwIfAborted()
    await output.start()

    const videoRun = scope.track(
      encodeVideo({ video: plan.video, videoSource, watchdog, ctx, draw: plan.draw, paint, endCard, start, end, onTime, signal }),
    )
    const audioRun = conversion && scope.track(conversion.execute())

    await Promise.all([videoRun, audioRun])
    await watchdog.wait(output.finalize())

    const clip = readOutput(output)
    options.onProgress?.(1)
    return clip
  }, signal)
}
