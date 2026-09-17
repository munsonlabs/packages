export function scrollIntoCenter(el: HTMLElement | null): void {
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
