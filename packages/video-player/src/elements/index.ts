import './core'
import './controls'

export * from './core'
export * from './controls'

/** Registers every element in one shot; pick this bundle OR the core/controls pair, not both - importing alongside either double-registers tags and throws. */
const EMBEDDED_STYLE = '__INLINE_CSS(style.css)__'

if (typeof document !== 'undefined' && !document.querySelector('style[data-video-player]')) {
  const style = document.createElement('style')
  style.setAttribute('data-video-player', '')
  style.textContent = EMBEDDED_STYLE
  document.head.appendChild(style)
}
