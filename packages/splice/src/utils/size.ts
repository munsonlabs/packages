/**
 * Rounds down to an even number, some encoders reject odd sizes.
 */
export function makeEven(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2)
}
