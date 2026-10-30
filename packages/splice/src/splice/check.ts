import { openSource } from './source'
import { planCrop } from './crop'
import { planOutput } from './plan'
import { runScoped } from '@/utils/scope'
import { ERROR_NO_VIDEO_ENCODER } from '@/constants'
import type { CanSpliceOptions, CanSpliceResult, SpliceSource } from '@/types/splice'

/**
 * Checks whether a source can be spliced in this browser before you offer it, and what will happen
 * to its audio. Only the file's header is read. It never throws, a source that can't be spliced
 * resolves { ok: false, message }.
 */
export function canSplice(source: SpliceSource, options: CanSpliceOptions = {}): Promise<CanSpliceResult> {
  const check = runScoped(async (scope) => {
    const { input, audio, info } = await openSource(source)
    scope.always(() => input.dispose())

    const { width, height } = planCrop(info.width, info.height, options.crop)
    const plan = await planOutput({ width, height, audioTrack: audio, audio: options.audio })

    if (!plan) throw new Error(ERROR_NO_VIDEO_ENCODER(width, height))
    return { ok: true, info, plan } as const
  })

  return check.catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message } as const
  })
}
