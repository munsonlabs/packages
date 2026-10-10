import { register } from '@munsonlabs/sigil'

/**
 * The kit's widgets name Lucide icons (`calendar`, `map-pin`, `quote`…), drawn by the Icon
 * block through sigil. Call once before rendering; Lucide's SVGs are fetched by name.
 */
export const registerIcons = () =>
  register('lucide', { resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg` }, { default: true })
