export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
}

export function requestFullscreen(el: HTMLElement): void {
  const fn = el.requestFullscreen || el.webkitRequestFullscreen
  void fn?.call(el)
}

export function exitFullscreen(): void {
  const fn = document.exitFullscreen || document.webkitExitFullscreen
  void fn?.call(document)
}
