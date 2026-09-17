type Listener = () => void

function createDocumentEventFanout(register: (fire: () => void) => () => void): (fn: Listener) => () => void {
  const listeners = new Set<Listener>()
  let unregister: (() => void) | null = null

  function fire(): void {
    listeners.forEach((fn) => fn())
  }

  return (fn: Listener) => {
    if (!unregister) unregister = register(fire)
    listeners.add(fn)

    return () => {
      listeners.delete(fn)
      if (listeners.size === 0) {
        unregister?.()
        unregister = null
      }
    }
  }
}

export const onDocumentFullscreenChange = createDocumentEventFanout((fire) => {
  document.addEventListener('fullscreenchange', fire)
  document.addEventListener('webkitfullscreenchange', fire)
  return () => {
    document.removeEventListener('fullscreenchange', fire)
    document.removeEventListener('webkitfullscreenchange', fire)
  }
})

export const onVisibilityOrBlur = createDocumentEventFanout((fire) => {
  document.addEventListener('visibilitychange', fire)
  window.addEventListener('blur', fire)
  return () => {
    document.removeEventListener('visibilitychange', fire)
    window.removeEventListener('blur', fire)
  }
})
