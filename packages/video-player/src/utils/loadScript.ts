const scriptPromises: Record<string, Promise<void>> = {}

export function loadScript(url: string, key: string = url): Promise<void> {
  if (!scriptPromises[key]) {
    scriptPromises[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
      document.head.appendChild(script)
    })
  }
  return scriptPromises[key]
}
