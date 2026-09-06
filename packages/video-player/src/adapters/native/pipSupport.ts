export interface PipSupport {
  supportsPip(): boolean
  isPipActive(): boolean
  togglePip(): void
  dispose(): void
}

/** onChange fires for both our own togglePip() and the user closing the browser's floating PiP window directly. */
export function createPipSupport(videoEl: HTMLVideoElement, onChange: () => void): PipSupport {
  const forwarders = [
    ['enterpictureinpicture', onChange],
    ['leavepictureinpicture', onChange],
  ] as const
  for (const [name, fn] of forwarders) videoEl.addEventListener(name, fn)

  function supportsPip(): boolean {
    return typeof document !== 'undefined' && !!document.pictureInPictureEnabled && !videoEl.disablePictureInPicture
  }

  function isPipActive(): boolean {
    return document.pictureInPictureElement === videoEl
  }

  function togglePip(): void {
    if (isPipActive()) void document.exitPictureInPicture()
    else if (supportsPip()) void videoEl.requestPictureInPicture()
  }

  return {
    supportsPip,
    isPipActive,
    togglePip,
    dispose: () => {
      for (const [name, fn] of forwarders) videoEl.removeEventListener(name, fn)
    },
  }
}
