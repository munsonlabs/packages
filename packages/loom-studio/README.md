# @munsonlabs/loom-studio

The editor for [`@munsonlabs/loom`](../loom) widgets. Canvas first, no sidebars: click any part of the widget and its editor opens beside it.

```vue
<LoomStudio v-model="definition" :kit="kit" :samples="items" :context="context" />
```

- **Click to edit**: content, actions and visibility, with a breadcrumb to the element's containers and its add/move/nest/duplicate/delete actions
- **Bind to anything the kit provides**: every source's fields, grouped, filtered to the types that fit
- **Preview** with your own sample data at four widths

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
