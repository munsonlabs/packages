# @munsonlabs/loom-studio

The editor for [`@munsonlabs/loom`](../loom) widgets. Canvas first, no sidebars: click any part of the widget and its editor opens beside it.

```vue
<LoomStudio v-model="definition" :kit="kit" :samples="items" :context="context" @publish="save" />
```

- **Click to edit**: content, actions, visibility and style, with a breadcrumb to the element's containers and its add/move/nest/duplicate/delete actions
- **Drag to move**: before, after or into a container, anywhere in the tree (only among siblings while editing a variant)
- **Bind to anything the kit provides**: every source's fields, grouped, filtered to the types that fit
- **Variants**: pick one to edit it; changes become overrides with reset-to-base markers, moves become its order, delete hides
- **Layers**: the widget's tree beside the canvas, to select anything (even what isn't on screen) and drag to move or nest
- **⌘K** for everything: jump to any element, add blocks, switch variant
- **Preview** with your own sample data at four widths, let the rules pick the variant, and **Try** the widget for real: every call it makes to `context` is logged
- **A guided tour** on first visit, over your own widget; replay it from the **?** button
- **Design tokens everywhere**: the theme panel shows every token over the kit's theme with per-widget overrides; gaps, padding, radii, colours and sizes pick from the scales; preview each of the kit's themes
- **Light and dark**: preview either scheme or follow the device; give any colour its own dark value with the moon (written as CSS `light-dark()`); see dark values beside light ones; get warned about colours that won't follow dark mode; the studio has its own light/dark switch
- **Issues, import, export** from the top bar: export one widget or, with `:library`, the whole library as one file; import either; `<NewWidgetModal>` starts a widget, blank or from another

## Setup

The studio uses [Nuxt UI](https://ui.nuxt.com) components by auto-import, so the host app installs Nuxt UI and scans this package (Nuxt UI only swaps in its Vue builds of `UIcon`/`ULink` for components it auto-imports):

```ts
// vite.config.js
ui({ router: false, scanPackages: ['@munsonlabs/loom-studio'] })
```

```css
/* main.css */
@import 'tailwindcss';
@import '@nuxt/ui';
@source '../node_modules/@munsonlabs/loom-studio/dist';
```

```ts
// main.js
import ui from '@nuxt/ui/vue-plugin'
import '@munsonlabs/loom/style.css'
createApp(App).use(ui).mount('#app')
```

`apps/demos/loom-studio` is a working setup, editing the timeline kit in `apps/demos/timeline-kit`. Full docs: [Loom Studio](https://munsonlabs.pages.dev/loom/studio/loom-studio).
