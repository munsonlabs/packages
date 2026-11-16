/** How much of a `playInView` player is on screen before it plays, unless `playInViewRatio` says otherwise. */
export const DEFAULT_PLAY_RATIO = 0.5

/** Layout rounding can leave a fully visible player a hair under 1, so "all of it" asks for a little less. */
const FIT_SLACK = 0.02

const STEP = 0.01

/** A ratio above 0 and at most 1, or the default for anything else. */
export function resolvePlayRatio(ratio: number | undefined): number {
  return typeof ratio === 'number' && ratio > 0 && ratio <= 1 ? ratio : DEFAULT_PLAY_RATIO
}

/**
 * Every hundredth up to `ratio`. A player taller than the screen can never reach `ratio`, so the observer
 * has to report the smaller share it can reach.
 */
export function playThresholds(ratio: number): number[] {
  const steps = Math.round(ratio / STEP)
  return Array.from({ length: steps + 1 }, (_, i) => Math.min(ratio, Number((i * STEP).toFixed(2))))
}

/** The most of the element that can be on screen at once: 1, unless it is taller or wider than the viewport. */
function fitRatio(entry: IntersectionObserverEntry): number {
  const root = entry.rootBounds
  const box = entry.boundingClientRect
  if (!root || !box.width || !box.height) return 1
  return Math.min(1, root.width / box.width, root.height / box.height)
}

/** Whether `ratio` of the element is on screen, or as much of it as can fit when that is less. */
export function reachedPlayRatio(entry: IntersectionObserverEntry, ratio: number): boolean {
  const needed = Math.min(ratio, fitRatio(entry) - FIT_SLACK)
  return entry.isIntersecting && entry.intersectionRatio >= needed
}
