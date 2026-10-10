# `theme/`: how widgets look

Loom's design system: tokens (named CSS variables), themes (sets of token values), light and dark mode, and the default of every token blocks read.

| File           | What it does                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tokens.js`    | Every token, all prefixed `--w-`, in two tiers: **scales** (colours, type sizes, spacing, radii, shadows) and **roles** (what a value is for: `gap`, `padding`, `title-size`…), which point at the scales. Also `defineTheme`, the built-in `lightTheme` and `darkTheme`, and `scaleForRole`. |
| `scheme.js`    | Light or dark: `usePreferredScheme` follows the device through one shared media query, `resolveScheme` applies a widget's `scheme` prop, and `themeForScheme` swaps a theme for its dark or light partner.                                                                                    |
| `lightDark.js` | Reads and writes CSS `light-dark(light, dark)` values, for a single colour that differs by scheme.                                                                                                                                                                                            |
| `styles.css`   | The default value of every token (on `.w-root`, at zero specificity), then the widget root's CSS and the rules several blocks share. Each block's own CSS is in its SFC. Published as `@munsonlabs/loom/style.css`, which the build fills with every block's CSS too.                         |

## Technically

- Values stack on a widget's root element, last wins: the defaults in `styles.css`, then the theme, then the definition's `vars`, then the active variant's `vars`. `Widget.vue` writes the last three as inline CSS variables.
- Blocks read role tokens and colours only. A theme can retune a whole scale, and a widget can say "my gap is `space-3`" without either knowing the other's numbers.
- Each widget root sets `color-scheme`, so `light-dark()` resolves per widget, not per page.
- `test/theme/tokens.spec.js` fails if `tokens.js` and `styles.css` drift apart, or if any CSS, a block's `<style>` included, reads a token that doesn't exist.
