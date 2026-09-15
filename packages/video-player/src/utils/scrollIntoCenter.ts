/** Shared "scroll to" behavior for a pinned VideoStage/VideoPlayer's own scroll-to-corner button. */
export function scrollIntoCenter(el: HTMLElement | null): void {
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
