import '@munsonlabs/video-player/style'

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof DOMException && event.reason.name === 'AbortError') event.preventDefault()
})
