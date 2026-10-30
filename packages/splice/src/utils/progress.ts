export function createProgressReporter(total: number, report?: (fraction: number) => void): (time: number) => void {
  let reported = 0
  return (time) => {
    const fraction = Math.min(0.999, time / total)
    if (!report || fraction <= reported) return
    reported = fraction
    report(fraction)
  }
}
