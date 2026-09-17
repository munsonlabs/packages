const scriptPromises: Record<string, Promise<void>> = {}

/** Loads a script once per `key`. A failed load is evicted from the cache so a later call (e.g. a Retry) gets a fresh attempt instead of the same cached rejection. */
export function loadScript(url: string, key: string = url): Promise<void> {
  if (!scriptPromises[key]) {
    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = () => {
        script.remove()
        reject(new Error(`Failed to load script: ${url}`))
      }
      document.head.appendChild(script)
    })
    promise.catch(() => {
      if (scriptPromises[key] === promise) delete scriptPromises[key]
    })
    scriptPromises[key] = promise
  }
  return scriptPromises[key]
}
