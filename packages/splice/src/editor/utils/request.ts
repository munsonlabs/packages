import type { SpliceOptions } from '@/types/splice'
import type { ClipRequest } from '@/types/internal'

/**
 * Builds the options for an export from what the editor has set: the range, the crop, the captions
 * showing and the toggles.
 */
export function buildRequest({ source, range, aspect, focus, cues, captionPosition, withCard, stamp, props }: ClipRequest): SpliceOptions {
  return {
    source,
    ...range,
    crop: { aspect, focus: { ...focus }, height: props.height },
    captions: cues.length ? cues : undefined,
    captionPosition,
    captionStyle: props.captionStyle,
    endCard: withCard && props.endCard !== false ? (props.endCard ?? {}) : undefined,
    stamp: stamp ?? undefined,
    watermark: props.watermark,
    origin: props.origin,
  }
}
