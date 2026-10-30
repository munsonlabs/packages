import { computed, ref } from 'vue'
import { ASPECTS } from '../utils'
import type { CaptionPosition, CropOptions } from '@/types/splice'
import type { EditorProps } from '@/types/internal'

/**
 * The choices the panel holds: the end card and logo toggles, where the captions go, the shape and
 * where the crop window sits. They start from the props each time the editor opens.
 */
export function useClipSettings(props: EditorProps) {
  const withCard = ref(true)
  const withLogo = ref(true)
  const captionPosition = ref<CaptionPosition>('bottom')
  const shape = ref<CropOptions['aspect']>(ASPECTS[0])
  const focus = ref({ x: 0.5, y: 0.5 })
  const stamp = computed(() => (withLogo.value ? props.stamp : null))

  function reset(): void {
    withCard.value = props.endCard !== false
    withLogo.value = Boolean(props.stamp)
    captionPosition.value = props.captionPosition
    shape.value = props.aspect ?? props.aspects[0] ?? ASPECTS[0]
    focus.value = { x: 0.5, y: 0.5 }
  }

  return { withCard, withLogo, captionPosition, shape, focus, stamp, reset }
}
