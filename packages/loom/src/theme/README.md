# `theme/`: how widgets look

The default of every `--w-*` variable blocks read, and the widget root's CSS.

| File         | What it does                                                                                                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles.css` | The default value of every `--w-*` variable (on `.w-root`, at zero specificity), then the widget root's CSS and the rules several blocks share. Each block's own CSS is in its SFC. Published as `@munsonlabs/loom/style.css`, which the build fills with every block's CSS too. |

## Technically

- Values stack on a widget's root element, last wins: the defaults in `styles.css`, then the definition's `vars`, then the active variant's `vars`. `Widget.vue` writes the last two as inline CSS variables.
- Blocks read role variables (`--w-gap`, `--w-title-size`) and colours only, which point at the scales (`--w-space-2`, `--w-text-xl`) by default.
