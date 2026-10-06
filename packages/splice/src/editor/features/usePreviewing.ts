import { onBeforeUnmount, watchEffect } from 'vue'

const PREVIEWING = 'splice-previewing'

/**
 * Adds a class to the player's shell while the crop window is over it. That hides the browser's own
 * captions, so the only ones you see are the clip's inside the window.
 */
export function usePreviewing(shell: () => HTMLElement | null): void {
  let marked: HTMLElement | null = null

  watchEffect(() => {
    const next = shell()
    if (marked === next) return
    marked?.classList.remove(PREVIEWING)
    next?.classList.add(PREVIEWING)
    marked = next
  })
  onBeforeUnmount(() => marked?.classList.remove(PREVIEWING))
}
