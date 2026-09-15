import { nextTick } from 'vue'

const FLIP_DURATION_MS = 220

const pendingCleanup = new WeakMap<HTMLElement, () => void>()

const FLIP_Z_INDEX = 2147483647

/**
 * Classic FLIP (First, Last, Invert, Play): measures `el`'s rect before and after `mutate()`,
 * then animates the delta via `transform` alone - makes a non-animatable layout jump (position,
 * top/left, width) look like a smooth move, in every browser. Resolves once the animation
 * actually finishes, so a caller can chain onto the end of it.
 */
export async function runFlipTransition(el: HTMLElement | null, mutate: () => void): Promise<void> {
  if (!el) {
    mutate()
    return
  }

  pendingCleanup.get(el)?.()

  const first = el.getBoundingClientRect()
  mutate()
  await nextTick()
  const last = el.getBoundingClientRect()

  const deltaX = first.left - last.left
  const deltaY = first.top - last.top
  const scaleX = first.width / last.width
  const scaleY = first.height / last.height
  if (!deltaX && !deltaY && scaleX === 1 && scaleY === 1) return

  const wasStaticPosition = getComputedStyle(el).position === 'static'
  if (wasStaticPosition) el.style.position = 'relative'
  el.style.zIndex = String(FLIP_Z_INDEX)

  el.style.transition = 'none'
  el.style.transformOrigin = 'top left'
  el.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`
  el.getBoundingClientRect()

  await new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const cleanup = (): void => {
      cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
      el.style.transition = ''
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.zIndex = ''
      if (wasStaticPosition) el.style.position = ''
      pendingCleanup.delete(el)
      resolve()
    }
    pendingCleanup.set(el, cleanup)

    const raf = requestAnimationFrame(() => {
      el.style.transition = `transform ${FLIP_DURATION_MS}ms ease`
      el.style.transform = ''
      timer = setTimeout(cleanup, FLIP_DURATION_MS)
    })
  })
}
