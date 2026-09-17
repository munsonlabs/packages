import { beforeEach, afterEach, vi } from 'vite-plus/test'

// Position memory and audio preference persist in localStorage and would leak between tests.
beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof DOMException && event.reason.name === 'AbortError') event.preventDefault()
})
