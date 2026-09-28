import '@munsonlabs/video-player/element'

const player = document.querySelector('ml-video-player')
const events = document.querySelector('.events')

player.tracks = [
  { src: '/captions/bbb-en.vtt', kind: 'captions', srclang: 'en', label: 'English', default: true },
  { src: '/captions/bbb-fr.vtt', kind: 'captions', srclang: 'fr', label: 'Français' },
]

player.addEventListener('state-change', (e) => {
  const { type } = e.detail[0]
  if (type === 'timeupdate') return
  const item = document.createElement('li')
  item.textContent = type
  events.prepend(item)
  while (events.children.length > 8) events.lastElementChild.remove()
})
