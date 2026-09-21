import { ref } from 'vue'

const files = import.meta.glob<string>('./*.svg', { query: '?raw', import: 'default', eager: true })

export const SHORTS_ICONS: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, svg]) => [path.slice(2, -4), svg]))

const LUCIDE_NAMES: Record<string, string> = {
  play: 'play',
  'volume-on': 'volume-2',
  'volume-mute': 'volume-x',
  'thumb-up': 'thumbs-up',
  'thumb-down': 'thumbs-down',
  comment: 'message-circle',
  share: 'share-2',
  quality: 'sliders-horizontal',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  refresh: 'refresh-cw',
  'fullscreen-enter': 'maximize',
  'fullscreen-exit': 'minimize',
  eye: 'eye',
  'eye-off': 'eye-off',
  captions: 'captions',
  palette: 'palette',
}

export const lucideIcons = ref(false)

export async function toggleIconSet(): Promise<void> {
  const { register } = await import('@munsonlabs/sigil')
  lucideIcons.value = !lucideIcons.value
  void register(
    'shorts',
    lucideIcons.value
      ? {
          resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static@1.46.0/icons/${LUCIDE_NAMES[name] ?? name}.svg`,
          mutator: (svg) => {
            svg.removeAttribute('width')
            svg.removeAttribute('height')
          },
        }
      : { icons: SHORTS_ICONS },
  )
}

let pending: Promise<void> | undefined

export function registerShortsIcons(): Promise<void> {
  pending ??= import('@munsonlabs/sigil').then(({ register }) => {
    void register('shorts', { icons: SHORTS_ICONS })
  })
  return pending
}
