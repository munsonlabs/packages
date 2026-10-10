/**
 * Loom's design tokens: the CSS custom properties every block reads, in two tiers.
 *
 * - **Scale tokens** are the raw palette and steps: colours, a type scale, a space scale,
 *   radii and shadows. Themes mostly set these.
 * - **Role tokens** say what a value is for (the gap between children, a title's size, a
 *   button's radius) and point at a scale step by default. Blocks read roles, so a widget can
 *   change what a title looks like without touching the type scale.
 *
 * `styles.css` declares every default below on `.w-root` at zero specificity; a test keeps
 * the two in step. Themes, then a definition's `vars`, then a variant's, override them.
 */

/** @typedef {'colour' | 'type' | 'space' | 'shape' | 'roles'} TokenGroup */

/**
 * What sort of value a token holds, which decides how an editor offers it.
 *
 * @typedef {'color' | 'length' | 'font' | 'weight' | 'shadow' | 'padding'} TokenKind
 */

/**
 * A scale an editor can offer steps from: for prop values, styles and role tokens.
 *
 * @typedef {'color' | 'space' | 'radius' | 'text' | 'shadow' | 'font' | 'weight'} TokenScale
 */

/**
 * @typedef {object} TokenSpec
 * @property {string} name Without the `--w-` prefix: `accent`, `space-2`, `title-size`.
 * @property {TokenGroup} group
 * @property {TokenKind} kind
 * @property {TokenScale} [scale] The scale this token belongs to, when it's a step of one.
 * @property {string} label
 * @property {string} [description]
 * @property {string} default
 */

const v = (name) => `var(--w-${name})`

const colour = (name, label, value, description) => ({
  name,
  group: 'colour',
  kind: 'color',
  scale: 'color',
  label,
  description,
  default: value,
})

const step = (scale, group, kind) => (name, label, value, description) => ({
  name,
  group,
  kind,
  scale,
  label,
  description,
  default: value,
})

const textStep = step('text', 'type', 'length')
const spaceStep = step('space', 'space', 'length')
const radiusStep = step('radius', 'shape', 'length')
const shadowStep = step('shadow', 'shape', 'shadow')

const role = (name, kind, label, value, description) => ({
  name,
  group: 'roles',
  kind,
  label,
  description,
  default: value,
})

export const tokens = [
  colour('bg', 'Background', 'transparent', 'Behind the whole widget'),
  colour('surface', 'Surface', '#f4f4f5', 'Raised areas: neutral badges, image placeholders'),
  colour('text', 'Text', '#18181b'),
  colour('muted', 'Muted text', '#71717a', 'Captions, secondary details'),
  colour('accent', 'Accent', '#c2410c', 'Buttons, kickers, links, badges'),
  colour('accent-contrast', 'On accent', '#ffffff', 'Text on the accent colour'),
  colour('border', 'Border', '#e4e4e7', 'Dividers and outlines'),
  colour('alert', 'Alert', '#dc2626', 'Warnings: low stock, breaking'),
  colour('success', 'Success', '#16a34a'),

  { name: 'font', group: 'type', kind: 'font', scale: 'font', label: 'Body font', default: 'system-ui, sans-serif' },
  { name: 'font-heading', group: 'type', kind: 'font', scale: 'font', label: 'Heading font', default: 'inherit' },
  textStep('text-xs', 'Extra small', '0.72rem'),
  textStep('text-sm', 'Small', '0.82rem'),
  textStep('text-md', 'Medium', '0.95rem'),
  textStep('text-lg', 'Large', '1.05rem'),
  textStep('text-xl', 'Extra large', '1.35rem'),
  textStep('text-2xl', 'Display', '1.75rem'),
  { name: 'weight-medium', group: 'type', kind: 'weight', scale: 'weight', label: 'Medium weight', default: '600' },
  { name: 'weight-bold', group: 'type', kind: 'weight', scale: 'weight', label: 'Bold weight', default: '700' },

  spaceStep('space-0', 'No space', '0px'),
  spaceStep('space-1', 'Space 1', '4px'),
  spaceStep('space-2', 'Space 2', '8px'),
  spaceStep('space-3', 'Space 3', '12px'),
  spaceStep('space-4', 'Space 4', '16px'),
  spaceStep('space-5', 'Space 5', '20px'),
  spaceStep('space-6', 'Space 6', '24px'),
  spaceStep('space-7', 'Space 7', '32px'),
  spaceStep('space-8', 'Space 8', '48px'),

  radiusStep('radius-none', 'Square', '0px'),
  radiusStep('radius-sm', 'Small', '6px'),
  radiusStep('radius-md', 'Medium', '12px'),
  radiusStep('radius-lg', 'Large', '18px'),
  radiusStep('radius-full', 'Round', '999px'),
  shadowStep('shadow-none', 'None', 'none'),
  shadowStep('shadow-sm', 'Small', '0 1px 2px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06)'),
  shadowStep('shadow-md', 'Medium', '0 4px 12px rgb(0 0 0 / 0.1), 0 2px 4px rgb(0 0 0 / 0.06)'),

  role('gap', 'length', 'Gap', v('space-2'), 'Between a Stack’s or Repeat’s children'),
  role('padding', 'padding', 'Widget padding', v('space-0')),
  role('radius', 'length', 'Widget radius', v('radius-none')),
  role('shadow', 'shadow', 'Widget shadow', v('shadow-none')),
  role('title-size', 'length', 'Title size', v('text-xl')),
  role('subtitle-size', 'length', 'Subtitle size', v('text-lg')),
  role('body-size', 'length', 'Body size', v('text-md')),
  role('caption-size', 'length', 'Caption size', v('text-sm')),
  role('title-weight', 'weight', 'Title weight', v('weight-bold')),
  role('title-font', 'font', 'Title font', v('font-heading')),
  role('link', 'color', 'Link colour', v('accent')),
  role('image-radius', 'length', 'Image radius', v('radius')),
  role('image-bg', 'color', 'Image placeholder', v('surface')),
  role('button-radius', 'length', 'Button radius', v('radius-full')),
  role('button-padding', 'padding', 'Button padding', `${v('space-1')} ${v('space-3')}`),
  role('rating', 'color', 'Rating stars', '#f59e0b'),
  role('progress-height', 'length', 'Progress bar height', '6px'),
]

/** Which scale a role token's value is chosen from, for editors. */
export const scaleForRole = {
  gap: 'space',
  padding: 'space',
  radius: 'radius',
  shadow: 'shadow',
  'title-size': 'text',
  'subtitle-size': 'text',
  'body-size': 'text',
  'caption-size': 'text',
  'title-weight': 'weight',
  'title-font': 'font',
  link: 'color',
  'image-radius': 'radius',
  'image-bg': 'color',
  'button-radius': 'radius',
  rating: 'color',
}

export const tokenVar = (name) => `--w-${name}`

/**
 * The tokens making up a scale, in order: for a picker of `var(--w-space-3)`-style values.
 *
 * @param {TokenScale} scale
 * @returns {TokenSpec[]}
 */
export function scaleTokens(scale) {
  return tokens.filter((t) => t.scale === scale)
}

/** `{ "--w-accent": "#c2410c", ... }` from `{ accent: "#c2410c" }`. Keys already prefixed pass through. */
export function tokenVars(values) {
  return Object.fromEntries(Object.entries(values ?? {}).map(([name, value]) => [name.startsWith('--') ? name : tokenVar(name), value]))
}

/**
 * A named set of token values. Unset tokens keep their defaults.
 *
 * @typedef {object} Theme
 * @property {string} id
 * @property {string} label
 * @property {Record<string, string>} values Token name (`accent`, `space-2`, `--w-accent`…) → value. Any CSS works, including a host's own `var(--…)`.
 */

/**
 * @param {Theme} theme
 */
export const defineTheme = (theme) => theme

/** The defaults, as a theme: light, neutral, an orange accent. */
export const lightTheme = defineTheme({ id: 'light', label: 'Light', values: {} })
