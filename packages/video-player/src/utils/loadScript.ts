const scriptPromises: Record<string, Promise<void>> = {}

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
